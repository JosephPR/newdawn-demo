"""
Human-in-the-Loop (HITL) safety gates for critical operations and mutations.

This module intercepts destructive or sensitive operations and prompts the user for manual confirmation
before proceeding.

The approval flow is fully async to avoid blocking the event loop. This is critical because
the approval polling endpoint must remain responsive while the tool waits for user input —
otherwise the frontend can never discover or display the approval card (deadlock).
"""

import asyncio
import uuid
import logging
from datetime import datetime, timezone
from google.cloud import firestore
from shared.audit_log import active_user_id, active_session_id, _get_db
from shared.config import APP_NAME

logger = logging.getLogger("multi_agent_starter.approval")


async def request_approval(
    action: str,
    target_type: str,
    details: dict,
    timeout_seconds: int = 180,
) -> bool:
    """
    Pause execution of a critical operation and request human confirmation.

    Creates a pending approval record in Firestore under the active user's session:
    `adk_apps/multi_agent_starter/users/{user_id}/sessions/{session_id}/approvals/{approval_id}`

    Then polls the document state asynchronously until a user approves, rejects, or
    a timeout occurs.  Uses ``asyncio.sleep`` so the event loop stays free to serve
    the frontend's approval-polling endpoint concurrently.

    If we are running in CLI or local developer mode where session/user context is not active,
    we auto-approve to avoid blocking tests and developer scripts.
    """
    user_id = active_user_id.get()
    session_id = active_session_id.get()

    if user_id == "system" or not session_id:
        logger.info(f"Auto-approving '{action}' for '{target_type}' (no active user session context).")
        return True

    try:
        db = _get_db()
        approval_id = str(uuid.uuid4())

        # Scoped path matching the user's active session
        doc_ref = db.collection("adk_apps") \
                    .document(APP_NAME) \
                    .collection("users") \
                    .document(user_id) \
                    .collection("sessions") \
                    .document(session_id) \
                    .collection("approvals") \
                    .document(approval_id)

        payload = {
            "id": approval_id,
            "status": "pending",
            "action": action,
            "target_type": target_type,
            "details": details or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Write the approval document on a thread so we don't block the loop
        await asyncio.to_thread(doc_ref.set, payload)
        logger.info(f"Requested approval {approval_id} for '{action}' in session {session_id}")

        # Poll Firestore for user response using non-blocking sleeps so the
        # event loop remains available to serve the approval-polling endpoint.
        elapsed = 0.0
        poll_interval = 2.0  # seconds between Firestore reads
        while elapsed < timeout_seconds:
            doc = await asyncio.to_thread(doc_ref.get)
            if doc.exists:
                data = doc.to_dict()
                status = data.get("status", "pending")
                if status == "approved":
                    logger.info(f"Approval {approval_id} APPROVED by user.")
                    await asyncio.to_thread(doc_ref.delete)
                    return True
                elif status == "rejected":
                    logger.info(f"Approval {approval_id} REJECTED by user.")
                    await asyncio.to_thread(doc_ref.delete)
                    return False

            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

        logger.warning(f"Approval {approval_id} timed out after {timeout_seconds}s.")
        await asyncio.to_thread(doc_ref.update, {"status": "timed_out"})
        return False

    except Exception as e:
        logger.error(f"Error in request_approval gate: {e}")
        # Fail-secure: deny the operation if the approval system itself errors
        return False
