from app.models import Board


def classify_board(exchange: str, symbol: str, source_board: str | None) -> Board:
    normalized_exchange = exchange.strip().upper()
    normalized_source = source_board.strip() if source_board else None
    by_source = {
        "沪市主板": Board.SH_MAIN,
        "上海主板": Board.SH_MAIN,
        "深市主板": Board.SZ_MAIN,
        "深圳主板": Board.SZ_MAIN,
        "创业板": Board.CHINEXT,
        "科创板": Board.STAR,
        "北交所": Board.BSE,
        "北京证券交易所": Board.BSE,
    }
    if normalized_source in by_source:
        return by_source[normalized_source]

    if normalized_exchange == "BJ" or symbol.startswith(("4", "8", "92")):
        return Board.BSE
    if normalized_exchange == "SH" and symbol.startswith(("688", "689")):
        return Board.STAR
    if normalized_exchange == "SZ" and symbol.startswith(("300", "301")):
        return Board.CHINEXT
    if normalized_exchange == "SH" and symbol.startswith(("600", "601", "603", "605")):
        return Board.SH_MAIN
    if normalized_exchange == "SZ" and symbol.startswith(("000", "001", "002", "003")):
        return Board.SZ_MAIN
    raise ValueError(f"cannot classify board for {normalized_exchange}:{symbol}")
