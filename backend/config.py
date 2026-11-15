"""Environment configuration; no credentials are bundled with the frontend."""
from dataclasses import dataclass
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    allowed_origins: tuple[str, ...] = (
        "http://127.0.0.1:4173", "http://localhost:4173",
    )

    @classmethod
    def from_env(cls):
        defaults = cls()
        return cls(
            allowed_origins=tuple(origin.strip() for origin in os.getenv(
                "COSMOMEDIC_ALLOWED_ORIGINS", ",".join(defaults.allowed_origins)
            ).split(",") if origin.strip()),
        )
