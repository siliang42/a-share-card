from dataclasses import dataclass
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Stock, StockSourceValue, SyncRun, utc_now
from app.sources.base import NormalizedStock, StockUniverseSource


@dataclass(frozen=True)
class SyncResult:
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0
    pending_confirmation: int = 0


class UniverseSyncService:
    def __init__(self, session: Session, source: StockUniverseSource) -> None:
        self.session = session
        self.source = source

    async def run(self) -> SyncResult:
        run = SyncRun(
            id=str(uuid4()),
            kind="stock_universe",
            source=self.source.name,
            status="running",
            parser_version="1",
        )
        self.session.add(run)
        try:
            rows = await self.source.fetch()
            result = self._apply(rows)
            run.status = "completed"
            run.inserted_count = result.inserted
            run.updated_count = result.updated
            run.completed_at = utc_now()
            self.session.commit()
            return result
        except Exception as exc:
            self.session.rollback()
            failed_run = SyncRun(
                id=run.id,
                kind="stock_universe",
                source=self.source.name,
                status="failed",
                parser_version="1",
                error_count=1,
                error_message=str(exc),
                completed_at=utc_now(),
            )
            self.session.add(failed_run)
            self.session.commit()
            raise

    def _apply(self, rows: list[NormalizedStock]) -> SyncResult:
        incoming_ids = {row.id for row in rows}
        inserted = 0
        updated = 0
        unchanged = 0

        for row in rows:
            stock = self.session.get(Stock, row.id)
            if stock is None:
                stock = Stock(
                    id=row.id,
                    exchange=row.exchange,
                    symbol=row.symbol,
                    name=row.name,
                    board=row.board,
                    listing_status=row.listing_status,
                    list_date=row.list_date,
                    source=row.source,
                    source_updated_at=row.source_updated_at,
                    fetched_at=utc_now(),
                )
                self.session.add(stock)
                inserted += 1
            else:
                changed = self._update_stock(stock, row)
                if changed:
                    updated += 1
                else:
                    unchanged += 1
            self._upsert_industry(row)

        current_source_stocks = self.session.scalars(
            select(Stock).where(
                Stock.source == self.source.name,
                Stock.manual_source.is_(False),
            )
        ).all()
        pending = 0
        for stock in current_source_stocks:
            if stock.id not in incoming_ids and not stock.pending_confirmation:
                stock.pending_confirmation = True
                pending += 1

        self.session.flush()
        return SyncResult(
            inserted=inserted,
            updated=updated,
            unchanged=unchanged,
            pending_confirmation=pending,
        )

    @staticmethod
    def _update_stock(stock: Stock, row: NormalizedStock) -> bool:
        changed = any(
            (
                stock.exchange != row.exchange,
                stock.symbol != row.symbol,
                stock.name != row.name,
                stock.board != row.board,
                stock.listing_status != row.listing_status,
                stock.list_date != row.list_date,
                stock.pending_confirmation,
            )
        )
        stock.exchange = row.exchange
        stock.symbol = row.symbol
        stock.name = row.name
        stock.board = row.board
        stock.listing_status = row.listing_status
        stock.list_date = row.list_date
        stock.source_updated_at = row.source_updated_at
        stock.fetched_at = utc_now()
        stock.pending_confirmation = False
        return changed

    def _upsert_industry(self, row: NormalizedStock) -> None:
        if not row.industry:
            return
        value = self.session.scalar(
            select(StockSourceValue).where(
                StockSourceValue.stock_id == row.id,
                StockSourceValue.source == row.source,
                StockSourceValue.field_name == "industry",
            )
        )
        if value is None:
            self.session.add(
                StockSourceValue(
                    stock_id=row.id,
                    source=row.source,
                    field_name="industry",
                    value_text=row.industry,
                    source_updated_at=row.source_updated_at,
                    fetched_at=utc_now(),
                )
            )
        else:
            value.value_text = row.industry
            value.source_updated_at = row.source_updated_at
            value.fetched_at = utc_now()
