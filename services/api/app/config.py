from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///../../data/gushi.db"
    data_dir: Path = Path("../../data")
    pairing_token: str = "local-development-token"
    quote_refresh_seconds: int = 15
    timezone: str = "Asia/Shanghai"

    model_config = SettingsConfigDict(env_file=".env", env_prefix="GUSHI_")

    @field_validator("quote_refresh_seconds")
    @classmethod
    def validate_quote_refresh_seconds(cls, value: int) -> int:
        if value < 15:
            raise ValueError("quote refresh interval must be at least 15 seconds")
        return value

    @property
    def timezone_info(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)
