"""
Firestore-backed state store ledger for cross-agent payloads (e.g. raw deal datasets).
Prevents local caching data from being lost on serverless container cold starts.
"""

import logging
from shared.audit_log import active_user_id, _get_db
from shared.config import APP_NAME

logger = logging.getLogger("multi_agent_starter.state_store")

def set(key: str, value: dict | list) -> str:
    """Saves data to Firestore state ledger under the active user's scoped collection and returns the key."""
    try:
        user_id = active_user_id.get()
        db = _get_db()
        
        doc_ref = db.collection("adk_apps") \
                    .document(APP_NAME) \
                    .collection("users") \
                    .document(user_id) \
                    .collection("state_ledger") \
                    .document(key)

        doc_ref.set({"payload": value})
        logger.debug(f"StateStore: Key '{key}' set in Firestore for user '{user_id}'")
        return key
    except Exception as e:
        logger.error(f"Failed to set state ledger key '{key}' in Firestore: {e}")
        return key

def get(key: str) -> dict | list | None:
    """Retrieves data from Firestore state ledger by key for the active user."""
    try:
        user_id = active_user_id.get()
        db = _get_db()
        
        doc_ref = db.collection("adk_apps") \
                    .document(APP_NAME) \
                    .collection("users") \
                    .document(user_id) \
                    .collection("state_ledger") \
                    .document(key)

        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            return data.get("payload")
        return None
    except Exception as e:
        logger.error(f"Failed to get state ledger key '{key}' from Firestore: {e}")
        return None
