from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any, Protocol

import httpx

from app.domain.classification import classify_board
from app.models import Board
from app.sources.base import NormalizedStock, SourceUnavailable


class SnapshotWriter(Protocol):
    def write(self, source: str, kind: str, payload: dict[str, Any]) -> None: ...


@dataclass(frozen=True)
class BoardQuery:
    exchange: str
    board: Board
    source_board: str
    filter: str


BOARD_QUERIES = (
    BoardQuery("SH", Board.SH_MAIN, "沪市主板", "m:1+t:2"),
    BoardQuery("SZ", Board.SZ_MAIN, "深市主板", "m:0+t:6"),
    BoardQuery("SZ", Board.CHINEXT, "创业板", "m:0+t:80"),
    BoardQuery("SH", Board.STAR, "科创板", "m:1+t:23"),
    BoardQuery("BJ", Board.BSE, "北交所", "m:0+t:81+s:2048"),
)


def _parse_date(value: Any) -> date | None:
    text = str(value or "").strip()
    if len(text) != 8 or not text.isdigit():
        return None
    try:
        return datetime.strptime(text, "%Y%m%d").date()
    except ValueError:
        return None


def parse_stock_page(
    payload: dict[str, Any],
    *,
    exchange: str,
    board: Board,
) -> list[NormalizedStock]:
    if payload.get("rc") != 0 or not isinstance(payload.get("data"), dict):
        raise SourceUnavailable("eastmoney returned an invalid stock-list response")

    fetched_at = datetime.now(UTC)
    rows: list[NormalizedStock] = []
    for item in payload["data"].get("diff") or []:
        symbol = str(item.get("f12") or "").strip()
        name = str(item.get("f14") or "").strip()
        if len(symbol) != 6 or not symbol.isdigit() or not name:
            continue
        rows.append(
            NormalizedStock(
                exchange=exchange,
                symbol=symbol,
                name=name,
                board=board,
                industry=str(item.get("f100") or "").strip() or None,
                listing_status="active",
                source="eastmoney",
                source_updated_at=fetched_at,
                list_date=_parse_date(item.get("f26")),
            )
        )
    return rows


class EastmoneyStockSource:
    name = "eastmoney"
    endpoint = "https://82.push2.eastmoney.com/api/qt/clist/get"

    def __init__(
        self,
        client: httpx.AsyncClient | None = None,
        snapshot_writer: SnapshotWriter | None = None,
    ) -> None:
        self._client = client
        self._snapshot_writer = snapshot_writer

    async def fetch(self) -> list[NormalizedStock]:
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(
            timeout=15,
            headers={"User-Agent": "Gushi/0.1 local-learning-tool"},
        )
        try:
            rows: list[NormalizedStock] = []
            for query in BOARD_QUERIES:
                rows.extend(await self._fetch_board(client, query))
            return rows
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            raise SourceUnavailable(f"eastmoney stock universe unavailable: {exc}") from exc
        finally:
            if owns_client:
                await client.aclose()

    async def _fetch_board(
        self,
        client: httpx.AsyncClient,
        query: BoardQuery,
    ) -> list[NormalizedStock]:
        page = 1
        page_size = 500
        rows: list[NormalizedStock] = []
        while True:
            response = await client.get(
                self.endpoint,
                params={
                    "pn": page,
                    "pz": page_size,
                    "po": 1,
                    "np": 1,
                    "fltt": 2,
                    "invt": 2,
                    "fid": "f12",
                    "fs": query.filter,
                    "fields": "f12,f14,f13,f26,f100",
                },
            )
            response.raise_for_status()
            payload = response.json()
            if self._snapshot_writer:
                self._snapshot_writer.write(self.name, query.board.value.lower(), payload)
            page_rows = parse_stock_page(payload, exchange=query.exchange, board=query.board)
            rows.extend(page_rows)
            total = int((payload.get("data") or {}).get("total") or 0)
            if not page_rows or len(rows) >= total:
                break
            page += 1
        return rows
