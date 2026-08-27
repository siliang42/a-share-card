from datetime import UTC, datetime

from app.models import Board, Stock, StockOverride
from app.services.csv_exchange import CsvExchange


def add_stock_with_override(session) -> None:
    stock = Stock(
        id="SZ:000400",
        exchange="SZ",
        symbol="000400",
        name="许继电气",
        board=Board.SZ_MAIN,
        source="fixture",
        source_updated_at=datetime.now(UTC),
    )
    stock.override = StockOverride(
        stock_id=stock.id,
        business_summary="人工主营摘要",
        notes="重点复习",
    )
    session.add(stock)
    session.commit()


def test_override_csv_round_trip_preserves_manual_summary(session) -> None:
    add_stock_with_override(session)
    exchange = CsvExchange(session)
    exported = exchange.export("stock_overrides")
    session.delete(session.get(StockOverride, "SZ:000400"))
    session.commit()

    preview = exchange.preview(exported, "stock_overrides")
    result = exchange.apply(preview.batch_id)

    restored = session.get(StockOverride, "SZ:000400")
    assert preview.inserts == 1
    assert result.applied_rows == 1
    assert restored.business_summary == "人工主营摘要"
    assert restored.notes == "重点复习"


def test_override_csv_rejects_unknown_stock_without_applying(session) -> None:
    exchange = CsvExchange(session)
    content = (
        "stock_id,name,business_summary,tags,notes\n"
        "SH:999999,,不存在的股票,,\n"
    ).encode()

    preview = exchange.preview(content, "stock_overrides")

    assert preview.rejected == 1
    assert preview.errors[0].row == 2
    assert "unknown stock" in preview.errors[0].message


def test_manual_stock_csv_adds_local_source_record(session) -> None:
    exchange = CsvExchange(session)
    content = (
        "exchange,symbol,name,board,listing_status,business_summary\n"
        "BJ,920001,本地补录,BSE,active,本地维护的主营摘要\n"
    ).encode()

    preview = exchange.preview(content, "manual_stocks")
    result = exchange.apply(preview.batch_id)

    stock = session.get(Stock, "BJ:920001")
    assert preview.inserts == 1
    assert result.applied_rows == 1
    assert stock.manual_source is True
    assert stock.source == "manual"
    assert stock.override.business_summary == "本地维护的主营摘要"
