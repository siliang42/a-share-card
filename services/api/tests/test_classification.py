import pytest

from app.domain.classification import classify_board
from app.models import Board


@pytest.mark.parametrize(
    ("exchange", "symbol", "source_board", "expected"),
    [
        ("SH", "600519", "沪市主板", Board.SH_MAIN),
        ("SZ", "000400", "深市主板", Board.SZ_MAIN),
        ("SZ", "300750", "创业板", Board.CHINEXT),
        ("SH", "688981", "科创板", Board.STAR),
        ("BJ", "920992", "北交所", Board.BSE),
    ],
)
def test_board_classification_uses_source_metadata(
    exchange: str,
    symbol: str,
    source_board: str,
    expected: Board,
) -> None:
    assert classify_board(exchange, symbol, source_board) is expected


def test_board_classification_falls_back_to_known_prefixes() -> None:
    assert classify_board("SZ", "301001", None) is Board.CHINEXT
    assert classify_board("SH", "689009", None) is Board.STAR
    assert classify_board("BJ", "832000", None) is Board.BSE


def test_unknown_exchange_and_prefix_is_rejected() -> None:
    with pytest.raises(ValueError, match="cannot classify"):
        classify_board("XX", "123456", None)
