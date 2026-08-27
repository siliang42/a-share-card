from __future__ import annotations

from datetime import UTC, date, datetime
from enum import StrEnum

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utc_now() -> datetime:
    return datetime.now(UTC)


class Board(StrEnum):
    SH_MAIN = "SH_MAIN"
    SZ_MAIN = "SZ_MAIN"
    CHINEXT = "CHINEXT"
    STAR = "STAR"
    BSE = "BSE"


class Base(DeclarativeBase):
    pass


class Stock(Base):
    __tablename__ = "stocks"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    exchange: Mapped[str] = mapped_column(String(4), index=True)
    symbol: Mapped[str] = mapped_column(String(8), index=True)
    name: Mapped[str] = mapped_column(String(64), index=True)
    board: Mapped[Board] = mapped_column(String(16), index=True)
    listing_status: Mapped[str] = mapped_column(String(24), default="active", index=True)
    list_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    source: Mapped[str] = mapped_column(String(32))
    source_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    pending_confirmation: Mapped[bool] = mapped_column(Boolean, default=False)
    manual_source: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    profile: Mapped[CompanyProfile | None] = relationship(back_populates="stock", uselist=False)
    override: Mapped[StockOverride | None] = relationship(back_populates="stock", uselist=False)

    __table_args__ = (UniqueConstraint("exchange", "symbol", name="uq_stock_exchange_symbol"),)


class StockSourceValue(Base):
    __tablename__ = "stock_source_values"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stock_id: Mapped[str] = mapped_column(ForeignKey("stocks.id", ondelete="CASCADE"), index=True)
    source: Mapped[str] = mapped_column(String(32))
    field_name: Mapped[str] = mapped_column(String(64))
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (UniqueConstraint("stock_id", "source", "field_name", name="uq_stock_source_field"),)


class StockOverride(Base):
    __tablename__ = "stock_overrides"

    stock_id: Mapped[str] = mapped_column(ForeignKey("stocks.id", ondelete="CASCADE"), primary_key=True)
    name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    business_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    stock: Mapped[Stock] = relationship(back_populates="override")


class Sector(Base):
    __tablename__ = "sectors"

    id: Mapped[str] = mapped_column(String(96), primary_key=True)
    taxonomy: Mapped[str] = mapped_column(String(32), index=True)
    source_code: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(96), index=True)
    source: Mapped[str] = mapped_column(String(32))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (UniqueConstraint("taxonomy", "source_code", name="uq_sector_taxonomy_code"),)


class StockSector(Base):
    __tablename__ = "stock_sectors"

    stock_id: Mapped[str] = mapped_column(ForeignKey("stocks.id", ondelete="CASCADE"), primary_key=True)
    sector_id: Mapped[str] = mapped_column(ForeignKey("sectors.id", ondelete="CASCADE"), primary_key=True)
    source: Mapped[str] = mapped_column(String(32))
    effective_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)


class CompanyProfile(Base):
    __tablename__ = "company_profiles"

    stock_id: Mapped[str] = mapped_column(ForeignKey("stocks.id", ondelete="CASCADE"), primary_key=True)
    source_business_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_intro: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(32))
    source_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    stock: Mapped[Stock] = relationship(back_populates="profile")


class LatestQuote(Base):
    __tablename__ = "latest_quotes"

    stock_id: Mapped[str] = mapped_column(ForeignKey("stocks.id", ondelete="CASCADE"), primary_key=True)
    price: Mapped[float] = mapped_column(Numeric(18, 4))
    change_percent: Mapped[float] = mapped_column(Numeric(10, 4))
    source: Mapped[str] = mapped_column(String(32))
    source_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class SyncRun(Base):
    __tablename__ = "sync_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    kind: Mapped[str] = mapped_column(String(32), index=True)
    source: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(24), index=True)
    inserted_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    parser_version: Mapped[str] = mapped_column(String(32))
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    dataset_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    kind: Mapped[str] = mapped_column(String(32))
    checksum: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(24), index=True)
    preview_json: Mapped[str] = mapped_column(Text)
    result_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DatasetRelease(Base):
    __tablename__ = "dataset_releases"

    version: Mapped[str] = mapped_column(String(64), primary_key=True)
    path: Mapped[str] = mapped_column(Text)
    sha256: Mapped[str] = mapped_column(String(64), unique=True)
    size_bytes: Mapped[int] = mapped_column(Integer)
    stock_count: Mapped[int] = mapped_column(Integer)
    sector_count: Mapped[int] = mapped_column(Integer)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
