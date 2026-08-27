from datetime import UTC, datetime

import pytest

from app.models import Board, Sector, Stock, StockSector
from app.services.sector_sync import SectorSyncService
from app.sources.base import NormalizedMembership, NormalizedSector, SectorSnapshot


class FixtureSectorSource:
    name = "shenwan"
    taxonomy = "shenwan"

    async def fetch(self) -> SectorSnapshot:
        return SectorSnapshot(
            sectors=[
                NormalizedSector(
                    id="shenwan:801120",
                    taxonomy="shenwan",
                    source_code="801120",
                    name="食品饮料",
                    source="shenwan",
                    source_updated_at=datetime.now(UTC),
                )
            ],
            memberships=[
                NormalizedMembership(
                    sector_id="shenwan:801120",
                    stock_symbol="600519",
                    source="shenwan",
                )
            ],
        )


@pytest.mark.asyncio
async def test_sector_sync_creates_labeled_membership(session) -> None:
    session.add(
        Stock(
            id="SH:600519",
            exchange="SH",
            symbol="600519",
            name="贵州茅台",
            board=Board.SH_MAIN,
            source="fixture",
            source_updated_at=datetime.now(UTC),
        )
    )
    session.commit()

    result = await SectorSyncService(session, FixtureSectorSource()).run()

    assert result.sectors == 1
    assert result.memberships == 1
    assert session.get(Sector, "shenwan:801120").taxonomy == "shenwan"
    assert session.get(StockSector, ("SH:600519", "shenwan:801120")) is not None


@pytest.mark.asyncio
async def test_sector_sync_rejects_wrong_taxonomy(session) -> None:
    source = FixtureSectorSource()
    source.taxonomy = "shenwan"

    async def wrong_snapshot() -> SectorSnapshot:
        return SectorSnapshot(
            sectors=[
                NormalizedSector(
                    id="eastmoney_industry:BK0001",
                    taxonomy="eastmoney_industry",
                    source_code="BK0001",
                    name="饮料制造",
                    source="eastmoney",
                    source_updated_at=datetime.now(UTC),
                )
            ],
            memberships=[],
        )

    source.fetch = wrong_snapshot

    with pytest.raises(ValueError, match="taxonomy"):
        await SectorSyncService(session, source).run()
