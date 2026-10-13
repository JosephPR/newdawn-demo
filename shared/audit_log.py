"""
Firestore-backed audit log for agent operations and state mutations.

Every create, update, or sensitive action performed through agent tools can be
recorded here to provide full observability and auditing.

We use Cloud Firestore to support serverless environment scalability
(e.g. Cloud Run), preventing audit trail losses on container restarts.
"""

import json
import logging
import contextvars
from datetime import datetime, timezone
from google.cloud import firestore
from shared.config import APP_NAME

logger = logging.getLogger("multi_agent_starter.audit")

# Context variable to transparently propagate the active authenticated user's ID
# from the FastAPI request down into the background agent tool execution threads.
# Defaults to "system" for local/CLI operations.
active_user_id = contextvars.ContextVar("active_user_id", default="system")
active_session_id = contextvars.ContextVar("active_session_id", default="")

# Singleton Firestore client instance (reused across the lifecycle of the application)
_db = None

def _get_db() -> firestore.Client:
    """
    Return a thread-safe singleton Firestore Client.
    
    Using a lazy-loading initialization pattern so that the Client is only
    created when first needed, allowing faster application startup.
    """
    global _db
    if _db is None:
        _db = firestore.Client()
    return _db


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def log_crm_action(
    user_id: str,
    action: str,
    target_type: str,
    target_id: str = None,
    details: dict = None,
    status: str = "success",
) -> None:
    """
    Record an operation or state mutation in the audit log collection in Firestore.

    We store the logs in a subcollection 'audit_logs' under the user's specific
    document: `adk_apps/multi_agent_starter/users/{user_id}/audit_logs/{audit_id}`.
    This guarantees strong data isolation for multi-tenancy and allows sorting logs
    chronologically without requiring custom Google Cloud composite indexes.

    Args:
        user_id:     Identifies who triggered the action. If 'system', we attempt to
                     resolve the actual logged-in user via active_user_id context.
        action:      Name of the operation (e.g. 'create_record', 'update_status').
        target_type: Object or service type (e.g. 'contact', 'document', 'database_entry').
        target_id:   The entity or reference ID returned by the target service.
        details:     Dictionary with additional context variables/payloads.
        status:      Outcome status ('success' or 'failure').
    """
    try:
        # Resolve the true authenticated user if the tool fell back to 'system'
        current_uid = active_user_id.get()
        if user_id == "system" and current_uid != "system":
            user_id = current_uid

        db = _get_db()
        
        # Scoped subcollection path to enforce strict user data isolation
        doc_ref = db.collection("adk_apps") \
                    .document(APP_NAME) \
                    .collection("users") \
                    .document(user_id) \
                    .collection("audit_logs") \
                    .document() # Generates a unique string ID automatically

        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details or {},
            "status": status
        }
        
        doc_ref.set(payload)
        logger.debug(f"Audit: {action} {target_type} {target_id} [{status}] written to Firestore")
    except Exception as e:
        # We catch all exceptions here to guarantee that audit logging never crashes
        # the agent's core workflow in the event of transient network/db blips.
        logger.error(f"Failed to write audit log to Firestore: {e}")


def get_recent_actions(user_id: str, limit: int = 50) -> list[dict]:
    """
    Retrieve the most recent audit log entries for a user, sorted newest first.

    Queries the subcollection under the specific user document in Firestore.
    """
    try:
        db = _get_db()
        query = db.collection("adk_apps") \
                  .document(APP_NAME) \
                  .collection("users") \
                  .document(user_id) \
                  .collection("audit_logs") \
                  .order_by("timestamp", direction=firestore.Query.DESCENDING) \
                  .limit(limit)

        docs = query.stream()
        results = []
        for doc in docs:
            entry = doc.to_dict()
            # Map the Firestore string ID to 'id' so it acts as a drop-in replacement
            # for the database key used in the frontend interfaces.
            entry["id"] = doc.id
            results.append(entry)
        return results
    except Exception as e:
        logger.error(f"Failed to read audit log from Firestore: {e}")
        return []

# Generic alias for clean boilerplate usage
log_action = log_crm_action

