from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, alias_generators


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=alias_generators.to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ManifestResponse(CamelModel):
    version: str
    generated_at: datetime
    sha256: str
    size_bytes: int
    stock_count: int
    sector_count: int


class StockResponse(CamelModel):
    id: str
    exchange: str
    symbol: str
    name: str
    board: str
    listing_status: str
    business_summary: str | None = None
    business_summary_source: str | None = None
    sectors: list[str] = Field(default_factory=list)


class StockListResponse(CamelModel):
    items: list[StockResponse]
    next_cursor: str | None = None
    total: int


class StockOverrideUpdate(CamelModel):
    name: str | None = None
    business_summary: str | None = None
    tags: list[str] | None = None
    notes: str | None = None


class QuoteResponse(CamelModel):
    stock_id: str
    price: float
    change_percent: float
    source: str
    source_time: datetime
    freshness: str


class QuoteBatchResponse(CamelModel):
    quotes: list[QuoteResponse]


class MarketCatalogItem(CamelModel):
    id: str
    name: str
    taxonomy: str
    stock_count: int


class CatalogResponse(CamelModel):
    markets: list[MarketCatalogItem]
    sectors: list[MarketCatalogItem]


class PairingResponse(CamelModel):
    base_url: str
    token: str
    service: str


class DashboardResponse(CamelModel):
    dataset_version: str | None
    stock_count: int
    sector_count: int
    pending_confirmation_count: int
    stale_quote_count: int
    recent_syncs: list[dict[str, Any]]


class ImportErrorResponse(CamelModel):
    row: int
    message: str


class ImportPreviewResponse(CamelModel):
    batch_id: str
    inserts: int
    updates: int
    unchanged: int
    rejected: int
    errors: list[ImportErrorResponse]


class ImportApplyResponse(CamelModel):
    batch_id: str
    applied_rows: int


class SyncRequest(CamelModel):
    kind: str


class SyncResponse(CamelModel):
    kind: str
    status: str
    details: dict[str, Any]
