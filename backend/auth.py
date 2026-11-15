"""Single care-team account with expiring, process-local bearer sessions."""
from hashlib import pbkdf2_hmac, sha256
from hmac import compare_digest
import secrets
from threading import Lock
import time
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from .config import Settings


class Login(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=128, repr=False)


class Sessions:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.salt = secrets.token_bytes(16)
        self.password_hash = self._hash(settings.password)
        self.tokens: dict[str, float] = {}
        self.lock = Lock()

    def _hash(self, password: str) -> bytes:
        return pbkdf2_hmac("sha256", password.encode(), self.salt, 600_000)

    def login(self, credentials: Login) -> dict:
        if not self.settings.password:
            raise HTTPException(503, "Set COSMOMEDIC_PASSWORD before signing in.")
        correct_password = compare_digest(self._hash(credentials.password), self.password_hash)
        correct_user = compare_digest(credentials.username.encode(), self.settings.username.encode())
        if not (correct_password and correct_user):
            raise HTTPException(401, "Invalid credentials.", headers={"WWW-Authenticate": "Bearer"})
        token = secrets.token_urlsafe(32)
        now = time.monotonic()
        with self.lock:
            self.tokens = {key: expiry for key, expiry in self.tokens.items() if expiry > now}
            if len(self.tokens) >= 1000:
                raise HTTPException(429, "Too many active sessions.")
            self.tokens[sha256(token.encode()).hexdigest()] = now + self.settings.session_seconds
        return {"accessToken": token, "tokenType": "bearer", "expiresIn": self.settings.session_seconds}

    def user(self, token: str) -> dict:
        key = sha256(token.encode()).hexdigest()
        with self.lock:
            if self.tokens.get(key, 0) <= time.monotonic():
                self.tokens.pop(key, None)
                raise HTTPException(401, "Session expired or invalid.", headers={"WWW-Authenticate": "Bearer"})
        return {"id": "care-team", "username": self.settings.username, "role": self.settings.role}


bearer = HTTPBearer(auto_error=False)


def care_team(request: Request, credentials: Annotated[
    HTTPAuthorizationCredentials | None, Depends(bearer)
]) -> dict:
    if credentials is None:
        raise HTTPException(401, "Sign in first.", headers={"WWW-Authenticate": "Bearer"})
    user = request.app.state.sessions.user(credentials.credentials)
    if user["role"] not in {"medical", "admin"}:
        raise HTTPException(403, "Care-team access required.")
    return user
