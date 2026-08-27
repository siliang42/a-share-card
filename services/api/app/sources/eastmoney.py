from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any, Protocol

import httpx

from app.domain.classification import classify_board
from app.models import Board
from app.sources.base import (
    NormalizedMembership,
    NormalizedProfile,
    NormalizedQuote,
    NormalizedSector,
    NormalizedStock,
    SourceUnavailable,
)


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


def parse_company_profile(stock_id: str, payload: dict[str, Any]) -> NormalizedProfile:
    details = payload.get("jbzl") or {}
    return NormalizedProfile(
        stock_id=stock_id,
        source_business_summary=str(details.get("jyfw") or "").strip() or None,
        company_intro=str(details.get("gsjj") or "").strip() or None,
        source="eastmoney",
        source_updated_at=None,
        fetched_at=datetime.now(UTC),
    )


def parse_quote_page(payload: dict[str, Any]) -> list[NormalizedQuote]:
    if payload.get("rc") != 0:
        raise SourceUnavailable("eastmoney returned an invalid quote response")
    fetched_at = datetime.now(UTC)
    rows: list[NormalizedQuote] = []
    for item in (payload.get("data") or {}).get("diff") or []:
        symbol = str(item.get("f12") or "").strip()
        market = item.get("f13")
        if not symbol or item.get("f2") in (None, "-"):
            continue
        if symbol.startswith(("4", "8", "92")):
            exchange = "BJ"
        else:
            exchange = "SH" if market == 1 else "SZ"
        source_epoch = item.get("f124")
        source_time = (
            datetime.fromtimestamp(int(source_epoch), UTC)
            if source_epoch not in (None, "-", 0)
            else fetched_at
        )
        rows.append(
            NormalizedQuote(
                stock_id=f"{exchange}:{symbol}",
                price=float(item["f2"]),
                change_percent=float(item.get("f3") or 0),
                source="eastmoney",
                source_time=source_time,
                fetched_at=fetched_at,
            )
        )
    return rows


def parse_concept_catalog(payload: dict[str, Any]) -> list[NormalizedSector]:
    if payload.get("rc") != 0:
        raise SourceUnavailable("eastmoney returned an invalid concept response")
    fetched_at = datetime.now(UTC)
    return [
        NormalizedSector(
            id=f"eastmoney_concept:{item['f12']}",
            taxonomy="eastmoney_concept",
            source_code=str(item["f12"]),
            name=str(item["f14"]).strip(),
            source="eastmoney",
            source_updated_at=fetched_at,
        )
        for item in (payload.get("data") or {}).get("diff") or []
        if item.get("f12") and str(item.get("f14") or "").strip()
    ]


def parse_concept_members(
    sector_id: str,
    payload: dict[str, Any],
) -> list[NormalizedMembership]:
    if payload.get("rc") != 0:
        raise SourceUnavailable("eastmoney returned invalid concept membership")
    return [
        NormalizedMembership(
            sector_id=sector_id,
            stock_symbol=str(item["f12"]),
            source="eastmoney",
        )
        for item in (payload.get("data") or {}).get("diff") or []
        if item.get("f12")
    ]


class EastmoneyProfileSource:
    name = "eastmoney"
    endpoint = "https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/CompanySurveyAjax"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def fetch_profile(self, stock_id: str) -> NormalizedProfile:
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=20)
        try:
            exchange, symbol = stock_id.split(":", 1)
            response = await client.get(self.endpoint, params={"code": f"{exchange}{symbol}"})
            response.raise_for_status()
            return parse_company_profile(stock_id, response.json())
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            raise SourceUnavailable(f"eastmoney profile unavailable for {stock_id}: {exc}") from exc
        finally:
            if owns_client:
                await client.aclose()


class EastmoneyQuoteSource:
    name = "eastmoney"
    endpoint = "https://push2.eastmoney.com/api/qt/ulist.np/get"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def fetch_quotes(self, stock_ids: list[str]) -> list[NormalizedQuote]:
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=10)
        try:
            secids = []
            for stock_id in stock_ids:
                exchange, symbol = stock_id.split(":", 1)
                market = "1" if exchange == "SH" else "0"
                secids.append(f"{market}.{symbol}")
            response = await client.get(
                self.endpoint,
                params={
                    "fltt": 2,
                    "invt": 2,
                    "fields": "f12,f13,f2,f3,f124",
                    "secids": ",".join(secids),
                },
            )
            response.raise_for_status()
            return parse_quote_page(response.json())
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            raise SourceUnavailable(f"eastmoney quotes unavailable: {exc}") from exc
        finally:
            if owns_client:
                await client.aclose()


class EastmoneyConceptSource:
    name = "eastmoney"
    taxonomy = "eastmoney_concept"
    catalog_endpoint = "https://79.push2.eastmoney.com/api/qt/clist/get"
    members_endpoint = "https://29.push2.eastmoney.com/api/qt/clist/get"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def fetch(self) -> "SectorSnapshot":
        from app.sources.base import SectorSnapshot

        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=20)
        base_params = {
            "pn": 1,
            "pz": 500,
            "po": 1,
            "np": 1,
            "fltt": 2,
            "invt": 2,
            "fid": "f12",
        }
        try:
            response = await client.get(
                self.catalog_endpoint,
                params={
                    **base_params,
                    "fs": "m:90 t:3 f:!50",
                    "fields": "f12,f14",
                },
            )
            response.raise_for_status()
            sectors = parse_concept_catalog(response.json())
            memberships: list[NormalizedMembership] = []
            for sector in sectors:
                member_response = await client.get(
                    self.members_endpoint,
                    params={
                        **base_params,
                        "fs": f"b:{sector.source_code} f:!50",
                        "fields": "f12,f13,f14",
                    },
                )
                member_response.raise_for_status()
                memberships.extend(parse_concept_members(sector.id, member_response.json()))
            if not sectors:
                raise SourceUnavailable("eastmoney returned no concepts")
            return SectorSnapshot(sectors=sectors, memberships=memberships)
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            raise SourceUnavailable(f"eastmoney concepts unavailable: {exc}") from exc
        finally:
            if owns_client:
                await client.aclose()
