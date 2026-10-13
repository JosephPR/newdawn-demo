"""
Firebase Authentication middleware for FastAPI.

Verifies Firebase ID tokens from the Authorization header and extracts
the authenticated user's uid and email.
"""

import logging
from typing import Optional

import firebase_admin
from firebase_admin import auth as firebase_auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

import os

logger = logging.getLogger("multi_agent_starter_api.auth")

# ---------------------------------------------------------------------------
# Initialize Firebase Admin SDK
# On Cloud Run this uses Application Default Credentials automatically.
# Locally, it uses GOOGLE_APPLICATION_CREDENTIALS or gcloud auth.
# ---------------------------------------------------------------------------
if not firebase_admin._apps:
    try:
        firebase_admin.initialize_app()
        logger.info("Firebase Admin SDK initialized")
    except Exception as e:
        if os.environ.get("MOCK_AUTH", "false").lower() in ("true", "1", "yes"):
            logger.warning(f"Firebase Admin SDK initialization skipped (MOCK_AUTH=true): {e}")
        else:
            logger.error(f"Firebase Admin SDK initialization failed: {e}")

# HTTPBearer extracts the token from "Authorization: Bearer <token>"
_security = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    """Represents a verified Firebase user."""

    def __init__(self, uid: str, email: str, name: str = "", picture: str = ""):
        self.uid = uid
        self.email = email
        self.name = name
        self.picture = picture

    def __repr__(self) -> str:
        return f"AuthenticatedUser(uid={self.uid!r}, email={self.email!r})"


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Security(_security),
) -> AuthenticatedUser:
    """
    FastAPI dependency that verifies a Firebase ID token.

    Usage:
        @app.get("/protected")
        async def protected(user: AuthenticatedUser = Depends(get_current_user)):
            return {"uid": user.uid}
    """
    # Quick development mock authentication bypass
    if os.environ.get("MOCK_AUTH", "false").lower() in ("true", "1", "yes"):
        return AuthenticatedUser(
            uid="dev-user-local",
            email="dev@example.com",
            name="Local Developer",
            picture="",
        )

    if creds is None:
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = creds.credentials
    try:
        decoded = firebase_auth.verify_id_token(token)
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except firebase_auth.RevokedIdTokenError:
        raise HTTPException(status_code=401, detail="Token has been revoked")
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

    return AuthenticatedUser(
        uid=decoded["uid"],
        email=decoded.get("email", ""),
        name=decoded.get("name", ""),
        picture=decoded.get("picture", ""),
    )
