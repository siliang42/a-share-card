from dataclasses import dataclass
from datetime import date, datetime
from typing import Protocol

from app.models import Board


@dataclass(frozen=True)
class NormalizedStock:
    exchange: str
    symbol: str
    name: str
    board: Board
    industry: str | None
    listing_status: str
    source: str
    source_updated_at: datetime
    list_date: date | None = None

    @property
    def id(self) -> str:
        return f"{self.exchange}:{self.symbol}"


class StockUniverseSource(Protocol):
    name: str

    async def fetch(self) -> list[NormalizedStock]: ...


class SourceUnavailable(RuntimeError):
    pass
