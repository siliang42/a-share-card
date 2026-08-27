from datetime import UTC, datetime

import pytest

from app.models import Board, CompanyProfile, Stock, StockOverride
from app.services.profile_sync import ProfileSyncService
from app.sources.base import NormalizedProfile
from app.sources.eastmoney import parse_company_profile


class FixtureProfileSource:
    name = "fixture"

    async def fetch_profile(self, stock_id: str) -> NormalizedProfile:
        return NormalizedProfile(
            stock_id=stock_id,
            source_business_summary="外部主营更新",
            company_intro="外部公司简介。",
            source="fixture",
            source_updated_at=None,
            fetched_at=datetime.now(UTC),
        )


def test_company_profile_parser_keeps_source_text() -> None:
    profile = parse_company_profile(
        "SZ:000400",
        {
            "jbzl": {
                "jyfw": "电力装备研发、制造与服务",
                "gsjj": "公司聚焦特高压、智能电网和新能源业务。",
            }
        },
    )

    assert profile.stock_id == "SZ:000400"
    assert profile.source_business_summary == "电力装备研发、制造与服务"
    assert profile.company_intro.startswith("公司聚焦特高压")


@pytest.mark.asyncio
async def test_profile_sync_preserves_manual_override(session) -> None:
    stock = Stock(
        id="SZ:000400",
        exchange="SZ",
        symbol="000400",
        name="许继电气",
        board=Board.SZ_MAIN,
        source="fixture",
        source_updated_at=datetime.now(UTC),
    )
    stock.override = StockOverride(stock_id=stock.id, business_summary="人工主营")
    session.add(stock)
    session.commit()

    await ProfileSyncService(session, FixtureProfileSource()).refresh("SZ:000400")

    assert session.get(CompanyProfile, "SZ:000400").source_business_summary == "外部主营更新"
    assert session.get(StockOverride, "SZ:000400").business_summary == "人工主营"
