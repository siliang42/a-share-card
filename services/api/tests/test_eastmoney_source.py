import json
from pathlib import Path

from app.models import Board
from app.sources.eastmoney import parse_stock_page


def test_parse_stock_page_uses_requested_board_identity() -> None:
    payload = json.loads(
        (Path(__file__).parent / "fixtures" / "eastmoney_stock_list.json").read_text()
    )

    rows = parse_stock_page(payload, exchange="BJ", board=Board.BSE)

    assert [row.id for row in rows] == ["BJ:920992", "BJ:920985"]
    assert rows[0].board is Board.BSE
    assert rows[0].industry == "医疗器械"
    assert rows[0].list_date.isoformat() == "2022-10-10"
