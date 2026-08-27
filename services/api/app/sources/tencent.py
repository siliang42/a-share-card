from datetime import datetime
import re
from zoneinfo import ZoneInfo

import httpx

from app.sources.base import NormalizedQuote, SourceUnavailable


def parse_tencent_quotes(payload: str, *, fetched_at: datetime) -> list[NormalizedQuote]:
    rows: list[NormalizedQuote] = []
    pattern = re.compile(r'v_(sh|sz|bj)(\d+)="(.*?)";')
    exchange_map = {"sh": "SH", "sz": "SZ", "bj": "BJ"}
    for market, symbol, body in pattern.findall(payload):
        fields = body.split("~")
        if len(fields) < 34 or not fields[3]:
            continue
        try:
            source_time = datetime.strptime(fields[30], "%Y%m%d%H%M%S").replace(
                tzinfo=ZoneInfo("Asia/Shanghai")
            )
            rows.append(
                NormalizedQuote(
                    stock_id=f"{exchange_map[market]}:{symbol}",
                    price=float(fields[3]),
                    change_percent=float(fields[32] or 0),
                    source="tencent",
                    source_time=source_time,
                    fetched_at=fetched_at,
                )
            )
        except (ValueError, IndexError):
            continue
    return rows


class TencentQuoteSource:
    name = "tencent"
    endpoint = "https://qt.gtimg.cn/q="

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def fetch_quotes(self, stock_ids: list[str]) -> list[NormalizedQuote]:
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=10)
        fetched_at = datetime.now(tz=ZoneInfo("UTC"))
        try:
            symbols = ",".join(stock_id.lower().replace(":", "") for stock_id in stock_ids)
            response = await client.get(f"{self.endpoint}{symbols}")
            response.raise_for_status()
            return parse_tencent_quotes(
                response.content.decode("gb18030", errors="replace"),
                fetched_at=fetched_at,
            )
        except (httpx.HTTPError, UnicodeError) as exc:
            raise SourceUnavailable(f"tencent quotes unavailable: {exc}") from exc
        finally:
            if owns_client:
                await client.aclose()
