from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import LatestQuote, Stock
from app.sources.base import NormalizedQuote, SourceUnavailable


class QuoteSource(Protocol):
    name: str

    async def fetch_quotes(self, stock_ids: list[str]) -> list[NormalizedQuote]: ...


@dataclass(frozen=True)
class QuoteView:
    stock_id: str
    price: float
    change_percent: float
    source: str
    source_time: datetime
    freshness: str


@dataclass(frozen=True)
class QuoteBatch:
    quotes: list[QuoteView]


class QuoteService:
    def __init__(
        self,
        session: Session,
        primary: QuoteSource,
        fallback: QuoteSource,
        refresh_seconds: int,
    ) -> None:
        self.session = session
        self.primary = primary
        self.fallback = fallback
        self.refresh_seconds = refresh_seconds

    async def get(self, stock_ids: list[str]) -> QuoteBatch:
        unique_ids = list(dict.fromkeys(stock_ids))
        if not unique_ids:
            return QuoteBatch(quotes=[])
        now = datetime.now(UTC)
        persisted = {
            row.stock_id: row
            for row in self.session.scalars(
                select(LatestQuote).where(LatestQuote.stock_id.in_(unique_ids))
            ).all()
        }
        fresh: dict[str, QuoteView] = {}
        for stock_id, row in persisted.items():
            fetched_at = self._aware(row.fetched_at)
            if now - fetched_at <= timedelta(seconds=self.refresh_seconds):
                fresh[stock_id] = self._view(row, "fresh")

        missing = [stock_id for stock_id in unique_ids if stock_id not in fresh]
        received: list[NormalizedQuote] = []
        if missing:
            try:
                received = await self.primary.fetch_quotes(missing)
            except SourceUnavailable:
                received = await self.fallback.fetch_quotes(missing)
            for quote in received:
                fresh[quote.stock_id] = QuoteView(
                    stock_id=quote.stock_id,
                    price=quote.price,
                    change_percent=quote.change_percent,
                    source=quote.source,
                    source_time=quote.source_time,
                    freshness="fresh",
                )
                if self.session.get(Stock, quote.stock_id) is not None:
                    stored = self.session.get(LatestQuote, quote.stock_id)
                    if stored is None:
                        stored = LatestQuote(
                            stock_id=quote.stock_id,
                            price=quote.price,
                            change_percent=quote.change_percent,
                            source=quote.source,
                            source_time=quote.source_time,
                            fetched_at=quote.fetched_at,
                        )
                        self.session.add(stored)
                    else:
                        stored.price = quote.price
                        stored.change_percent = quote.change_percent
                        stored.source = quote.source
                        stored.source_time = quote.source_time
                        stored.fetched_at = quote.fetched_at
            self.session.commit()

        for stock_id in missing:
            if stock_id not in fresh and stock_id in persisted:
                row = persisted[stock_id]
                age = now - self._aware(row.fetched_at)
                freshness = "cached" if age <= timedelta(minutes=5) else "stale"
                fresh[stock_id] = self._view(row, freshness)
        return QuoteBatch(quotes=[fresh[stock_id] for stock_id in unique_ids if stock_id in fresh])

    @staticmethod
    def _aware(value: datetime) -> datetime:
        return value if value.tzinfo else value.replace(tzinfo=UTC)

    @classmethod
    def _view(cls, row: LatestQuote, freshness: str) -> QuoteView:
        return QuoteView(
            stock_id=row.stock_id,
            price=float(row.price),
            change_percent=float(row.change_percent),
            source=row.source,
            source_time=cls._aware(row.source_time),
            freshness=freshness,
        )
