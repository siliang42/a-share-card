from datetime import UTC, datetime

import pytest
from sqlalchemy import func, select

from app.models import Board, Stock
from app.sources.base import NormalizedStock
from app.services.universe_sync import UniverseSyncService


class FixtureSource:
    name = "fixture"

    def __init__(self, rows: list[NormalizedStock]) -> None:
        self.rows = rows

    async def fetch(self) -> list[NormalizedStock]:
        return self.rows


def normalized(symbol: str, exchange: str, board: Board, name: str) -> NormalizedStock:
    return NormalizedStock(
        exchange=exchange,
        symbol=symbol,
        name=name,
        board=board,
        industry="电网设备",
        listing_status="active",
        source="fixture",
        source_updated_at=datetime.now(UTC),
    )


@pytest.mark.asyncio
async def test_repeated_universe_sync_updates_without_duplicates(session) -> None:
    source = FixtureSource(
        [
            normalized("600519", "SH", Board.SH_MAIN, "贵州茅台"),
            normalized("000400", "SZ", Board.SZ_MAIN, "许继电气"),
            normalized("300750", "SZ", Board.CHINEXT, "宁德时代"),
            normalized("688981", "SH", Board.STAR, "中芯国际"),
            normalized("920992", "BJ", Board.BSE, "中科美菱"),
        ]
    )
    service = UniverseSyncService(session, source)

    first = await service.run()
    second = await service.run()

    assert first.inserted == 5
    assert second.inserted == 0
    assert second.unchanged == 5
    assert session.scalar(select(func.count()).select_from(Stock)) == 5


@pytest.mark.asyncio
async def test_missing_source_stock_is_marked_not_deleted(session) -> None:
    original = normalized("000400", "SZ", Board.SZ_MAIN, "许继电气")
    service = UniverseSyncService(session, FixtureSource([original]))
    await service.run()

    service = UniverseSyncService(session, FixtureSource([]))
    result = await service.run()

    stock = session.get(Stock, "SZ:000400")
    assert stock is not None
    assert stock.pending_confirmation is True
    assert result.pending_confirmation == 1
