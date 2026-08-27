from datetime import UTC, datetime

import pytest

from app.services.quotes import QuoteService
from app.sources.base import NormalizedQuote, SourceUnavailable


class FailingQuoteSource:
    name = "primary"

    async def fetch_quotes(self, stock_ids: list[str]) -> list[NormalizedQuote]:
        raise SourceUnavailable("primary unavailable")


class FixtureQuoteSource:
    name = "tencent"

    async def fetch_quotes(self, stock_ids: list[str]) -> list[NormalizedQuote]:
        now = datetime.now(UTC)
        return [
            NormalizedQuote(
                stock_id=stock_id,
                price=1291.16,
                change_percent=-0.89,
                source=self.name,
                source_time=now,
                fetched_at=now,
            )
            for stock_id in stock_ids
        ]


@pytest.mark.asyncio
async def test_quote_service_falls_back_and_marks_source(session) -> None:
    batch = await QuoteService(
        session,
        primary=FailingQuoteSource(),
        fallback=FixtureQuoteSource(),
        refresh_seconds=15,
    ).get(["SH:600519"])

    assert batch.quotes[0].source == "tencent"
    assert batch.quotes[0].freshness == "fresh"
    assert batch.quotes[0].price == 1291.16


@pytest.mark.asyncio
async def test_quote_service_returns_cached_value_with_age(session) -> None:
    service = QuoteService(
        session,
        primary=FixtureQuoteSource(),
        fallback=FailingQuoteSource(),
        refresh_seconds=15,
    )

    first = await service.get(["SH:600519"])
    second = await service.get(["SH:600519"])

    assert second.quotes[0].source == first.quotes[0].source
    assert second.quotes[0].freshness == "fresh"
