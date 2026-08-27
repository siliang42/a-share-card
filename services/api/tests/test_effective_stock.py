from datetime import UTC, datetime

from app.domain.effective_stock import project_effective_stock
from app.models import Board, CompanyProfile, Stock, StockOverride


def test_manual_summary_wins_without_replacing_source_text() -> None:
    stock = Stock(
        id="SZ:000400",
        exchange="SZ",
        symbol="000400",
        name="许继电气",
        board=Board.SZ_MAIN,
        source="eastmoney",
        source_updated_at=datetime.now(UTC),
    )
    stock.profile = CompanyProfile(
        stock_id=stock.id,
        source_business_summary="输配电设备及控制系统",
        source="eastmoney",
        fetched_at=datetime.now(UTC),
    )
    stock.override = StockOverride(
        stock_id=stock.id,
        business_summary="电网自动化与特高压设备",
    )

    result = project_effective_stock(stock)

    assert result.business_summary == "电网自动化与特高压设备"
    assert result.business_summary_source == "manual"
    assert stock.profile.source_business_summary == "输配电设备及控制系统"


def test_projection_falls_back_field_by_field() -> None:
    stock = Stock(
        id="SH:600519",
        exchange="SH",
        symbol="600519",
        name="贵州茅台",
        board=Board.SH_MAIN,
        source="exchange",
        source_updated_at=datetime.now(UTC),
    )
    stock.override = StockOverride(stock_id=stock.id, business_summary="白酒生产与销售")

    result = project_effective_stock(stock)

    assert result.name == "贵州茅台"
    assert result.business_summary == "白酒生产与销售"
