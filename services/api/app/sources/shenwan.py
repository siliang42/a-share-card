from datetime import UTC, datetime
from typing import Any

import httpx

from app.sources.base import (
    NormalizedMembership,
    NormalizedSector,
    SectorSnapshot,
    SourceUnavailable,
)


def parse_index_page(payload: dict[str, Any]) -> list[NormalizedSector]:
    data = payload.get("data") or {}
    rows = []
    fetched_at = datetime.now(UTC)
    for item in data.get("results") or []:
        code = str(item.get("swindexcode") or "").strip()
        name = str(item.get("swindexname") or "").strip()
        if code and name:
            rows.append(
                NormalizedSector(
                    id=f"shenwan:{code}",
                    taxonomy="shenwan",
                    source_code=code,
                    name=name,
                    source="shenwan",
                    source_updated_at=fetched_at,
                )
            )
    return rows


def parse_components(
    sector_id: str,
    payload: dict[str, Any],
) -> list[NormalizedMembership]:
    data = payload.get("data") or {}
    return [
        NormalizedMembership(
            sector_id=sector_id,
            stock_symbol=str(item.get("stockcode") or "").strip(),
            source="shenwan",
        )
        for item in data.get("results") or []
        if str(item.get("stockcode") or "").strip()
    ]


class ShenwanSectorSource:
    name = "shenwan"
    taxonomy = "shenwan"
    index_endpoint = "https://www.swsresearch.com/institute-sw/api/index_publish/current/"
    component_endpoint = "https://www.swsresearch.com/institute-sw/api/index_publish/details/component_stocks/"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client

    async def fetch(self) -> SectorSnapshot:
        owns_client = self._client is None
        # The public Shenwan endpoint currently serves an incomplete certificate chain.
        # Keep this exception isolated to its read-only adapter and validate every payload.
        client = self._client or httpx.AsyncClient(
            timeout=30,
            headers={"User-Agent": "Mozilla/5.0 Gushi/0.1"},
            verify=False,
        )
        try:
            sectors: dict[str, NormalizedSector] = {}
            for index_type in ("一级行业", "二级行业"):
                for sector in await self._fetch_indexes(client, index_type):
                    sectors[sector.id] = sector
            memberships: list[NormalizedMembership] = []
            for sector in sectors.values():
                response = await client.get(
                    self.component_endpoint,
                    params={"swindexcode": sector.source_code, "page": 1, "page_size": 10000},
                )
                response.raise_for_status()
                memberships.extend(parse_components(sector.id, response.json()))
            if not sectors:
                raise SourceUnavailable("shenwan returned no industries")
            return SectorSnapshot(sectors=list(sectors.values()), memberships=memberships)
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            raise SourceUnavailable(f"shenwan sectors unavailable: {exc}") from exc
        finally:
            if owns_client:
                await client.aclose()

    async def _fetch_indexes(
        self,
        client: httpx.AsyncClient,
        index_type: str,
    ) -> list[NormalizedSector]:
        page = 1
        page_size = 50
        rows: list[NormalizedSector] = []
        while True:
            response = await client.get(
                self.index_endpoint,
                params={"page": page, "page_size": page_size, "indextype": index_type},
            )
            response.raise_for_status()
            payload = response.json()
            page_rows = parse_index_page(payload)
            rows.extend(page_rows)
            total = int((payload.get("data") or {}).get("count") or 0)
            if not page_rows or len(rows) >= total:
                return rows
            page += 1
