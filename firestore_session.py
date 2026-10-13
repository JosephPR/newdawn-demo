import uuid
import time
from typing import Any, Optional

from google.cloud import firestore
from google.adk.sessions.base_session_service import BaseSessionService, ListSessionsResponse, GetSessionConfig
from google.adk.sessions import Session
from google.adk.events.event import Event

class FirestoreSessionService(BaseSessionService):
    """Firestore-backed session service for Google ADK."""

    def __init__(self, project: Optional[str] = None, database: Optional[str] = None, collection_prefix: str = "adk_"):
        """Initialize the Firestore session service.
        
        Args:
            project: Optional Google Cloud project ID. If not provided, it uses the default environment credential.
            database: Optional Firestore database ID. If not provided, it uses the default database.
            collection_prefix: Prefix for root collections to avoid collisions.
        """
        self.db = firestore.AsyncClient(project=project, database=database)
        self.collection_prefix = collection_prefix

    def _get_app_ref(self, app_name: str):
        return self.db.collection(f"{self.collection_prefix}apps").document(app_name)

    def _get_user_ref(self, app_name: str, user_id: str):
        return self._get_app_ref(app_name).collection("users").document(user_id)

    def _get_session_ref(self, app_name: str, user_id: str, session_id: str):
        return self._get_user_ref(app_name, user_id).collection("sessions").document(session_id)

    async def create_session(
        self,
        *,
        app_name: str,
        user_id: str,
        state: Optional[dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> Session:
        session_id = session_id or str(uuid.uuid4())
        
        # We start with empty events
        session = Session(
            id=session_id,
            app_name=app_name,
            user_id=user_id,
            state=state or {},
            events=[],
            last_update_time=time.time(),
        )

        session_ref = self._get_session_ref(app_name, user_id, session_id)
        
        # Model dump and exclude events because we store them in a subcollection
        data = session.model_dump(exclude={'events'})
        await session_ref.set(data)
        
        return session

    async def get_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
        config: Optional[GetSessionConfig] = None,
    ) -> Optional[Session]:
        session_ref = self._get_session_ref(app_name, user_id, session_id)
        doc = await session_ref.get()
        if not doc.exists:
            return None
            
        data = doc.to_dict()
        
        # Load events from subcollection
        events_ref = session_ref.collection("events").order_by("timestamp", direction=firestore.Query.ASCENDING)
        events = []
        async for event_doc in events_ref.stream():
            event_data = event_doc.to_dict()
            
            # Clean out None values to prevent validation errors with strict models
            def _clean_dict(d):
                if isinstance(d, dict):
                    return {k: _clean_dict(v) for k, v in d.items() if v is not None}
                elif isinstance(d, list):
                    return [_clean_dict(i) for i in d]
                return d
                
            clean_event_data = _clean_dict(event_data)
            events.append(Event.model_validate(clean_event_data))
            
        data['events'] = events
        return Session.model_validate(data)

    async def list_sessions(
        self, *, app_name: str, user_id: Optional[str] = None
    ) -> ListSessionsResponse:
        sessions = []
        
        # We need to query sessions for a specific user, or all users under an app
        if user_id:
            users_query = [self._get_user_ref(app_name, user_id)]
        else:
            users_query = []
            async for doc in self._get_app_ref(app_name).collection("users").stream():
                users_query.append(doc.reference)
            
        for user_ref in users_query:
            async for doc in user_ref.collection("sessions").order_by("last_update_time", direction=firestore.Query.DESCENDING).stream():
                data = doc.to_dict()
                # Do not load events for list_sessions unless specified, keeping them empty
                data['events'] = []
                sessions.append(Session.model_validate(data))
                
        return ListSessionsResponse(sessions=sessions)

    async def delete_session(
        self, *, app_name: str, user_id: str, session_id: str
    ) -> None:
        session_ref = self._get_session_ref(app_name, user_id, session_id)
        
        # Delete all events in subcollection first
        events_ref = session_ref.collection("events")
        async for event_doc in events_ref.stream():
            await event_doc.reference.delete()
            
        # Delete the session document
        await session_ref.delete()

    async def append_event(self, session: Session, event: Event) -> Event:
        # Update the session object in memory first
        event = await super().append_event(session, event)
        
        # Only persist if not partial
        if event.partial:
            return event
            
        session_ref = self._get_session_ref(session.app_name, session.user_id, session.id)
        
        # Use a batch write or individual writes. 
        # Update session state and last_update_time
        await session_ref.update({
            "state": session.state,
            "last_update_time": time.time()
        })
        
        # Add event to subcollection
        event_ref = session_ref.collection("events").document(event.id)
        await event_ref.set(event.model_dump(exclude_none=True))
        
        return event

    async def update_session_state(
        self, *, app_name: str, user_id: str, session_id: str, state_updates: dict[str, Any]
    ) -> None:
        """Update specific state key-value pairs for an existing session."""
        session_ref = self._get_session_ref(app_name, user_id, session_id)
        update_data = {f"state.{k}": v for k, v in state_updates.items()}
        update_data["last_update_time"] = time.time()
        await session_ref.update(update_data)

