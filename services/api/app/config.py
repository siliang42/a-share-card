import os
from pathlib import Path
import secrets
from zoneinfo import ZoneInfo

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///../../data/gushi.db"
    data_dir: Path = Path("../../data")
    pairing_token: str = "local-development-token"
    pairing_token_file: Path | None = None
    quote_refresh_seconds: int = 15
    timezone: str = "Asia/Shanghai"
    profile_batch_size: int = 200

    model_config = SettingsConfigDict(env_file=".env", env_prefix="GUSHI_")

    @field_validator("quote_refresh_seconds")
    @classmethod
    def validate_quote_refresh_seconds(cls, value: int) -> int:
        if value < 15:
            raise ValueError("quote refresh interval must be at least 15 seconds")
        return value

    @field_validator("profile_batch_size")
    @classmethod
    def validate_profile_batch_size(cls, value: int) -> int:
        if value < 1:
            raise ValueError("profile batch size must be positive")
        return value

    @model_validator(mode="after")
    def load_pairing_token_file(self) -> "Settings":
        if self.pairing_token_file is None:
            return self
        path = self.pairing_token_file.expanduser()
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass
        else:
            with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                stream.write(secrets.token_urlsafe(36) + "\n")
        os.chmod(path, 0o600)
        token = path.read_text(encoding="utf-8").strip()
        if len(token) < 32:
            raise ValueError("pairing token file must contain at least 32 characters")
        self.pairing_token = token
        return self

    @property
    def timezone_info(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)
