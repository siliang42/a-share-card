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


@dataclass(frozen=True)
class NormalizedSector:
    id: str
    taxonomy: str
    source_code: str
    name: str
    source: str
    source_updated_at: datetime


@dataclass(frozen=True)
class NormalizedMembership:
    sector_id: str
    stock_symbol: str
    source: str
    effective_from: date | None = None


@dataclass(frozen=True)
class SectorSnapshot:
    sectors: list[NormalizedSector]
    memberships: list[NormalizedMembership]


@dataclass(frozen=True)
class NormalizedProfile:
    stock_id: str
    source_business_summary: str | None
    company_intro: str | None
    source: str
    source_updated_at: datetime | None
    fetched_at: datetime


@dataclass(frozen=True)
class NormalizedQuote:
    stock_id: str
    price: float
    change_percent: float
    source: str
    source_time: datetime
    fetched_at: datetime
