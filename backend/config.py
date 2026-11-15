"""Environment configuration; no credentials are bundled with the frontend."""
from dataclasses import dataclass, field
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    username: str = "surgeon"
    password: str = field(default="", repr=False)
    role: str = "medical"
    session_seconds: int = 3600
    allowed_origins: tuple[str, ...] = (
        "http://127.0.0.1:4173", "http://localhost:4173",
    )

    def __post_init__(self):
        if not 1 <= len(self.username) <= 100 or len(self.password) > 128:
            raise ValueError("Username must have 1–100 characters; password must have at most 128")
        if self.role not in {"medical", "admin"}:
            raise ValueError("COSMOMEDIC_ROLE must be medical or admin")
        if not 60 <= self.session_seconds <= 86400:
            raise ValueError("Session lifetime must be between 60 and 86400 seconds")

    @classmethod
    def from_env(cls):
        defaults = cls()
        return cls(
            username=os.getenv("COSMOMEDIC_USERNAME", defaults.username),
            password=os.getenv("COSMOMEDIC_PASSWORD", ""),
            role=os.getenv("COSMOMEDIC_ROLE", defaults.role),
            session_seconds=int(os.getenv("COSMOMEDIC_SESSION_SECONDS", "3600")),
            allowed_origins=tuple(origin.strip() for origin in os.getenv(
                "COSMOMEDIC_ALLOWED_ORIGINS", ",".join(defaults.allowed_origins)
            ).split(",") if origin.strip()),
        )
