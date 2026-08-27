from datetime import UTC, datetime

from app.sources.eastmoney import parse_quote_page
from app.sources.tencent import parse_tencent_quotes


def test_eastmoney_quote_parser_uses_market_code() -> None:
    quotes = parse_quote_page(
        {
            "rc": 0,
            "data": {
                "diff": [
                    {"f12": "600519", "f13": 1, "f2": 1291.16, "f3": -0.89, "f124": 1787801515}
                ]
            },
        }
    )

    assert quotes[0].stock_id == "SH:600519"
    assert quotes[0].change_percent == -0.89


def test_tencent_quote_parser_reads_tilde_payload() -> None:
    fields = [""] * 34
    fields[1] = "贵州茅台"
    fields[2] = "600519"
    fields[3] = "1291.16"
    fields[30] = "20260827113155"
    fields[32] = "-0.89"
    fields[33] = "1305.00"
    payload = f'v_sh600519="{"~".join(fields)}";'

    quotes = parse_tencent_quotes(payload, fetched_at=datetime.now(UTC))

    assert quotes[0].stock_id == "SH:600519"
    assert quotes[0].price == 1291.16
    assert quotes[0].change_percent == -0.89
    assert quotes[0].source_time.isoformat().startswith("2026-08-27T11:31:55")
