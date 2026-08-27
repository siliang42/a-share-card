from dataclasses import dataclass
from typing import Protocol

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Sector, Stock, StockSector
from app.sources.base import SectorSnapshot


class SectorSource(Protocol):
    name: str
    taxonomy: str

    async def fetch(self) -> SectorSnapshot: ...


@dataclass(frozen=True)
class SectorSyncResult:
    sectors: int = 0
    memberships: int = 0
    missing_stocks: int = 0


class SectorSyncService:
    def __init__(self, session: Session, source: SectorSource) -> None:
        self.session = session
        self.source = source

    async def run(self) -> SectorSyncResult:
        snapshot = await self.source.fetch()
        if not snapshot.sectors:
            raise ValueError(f"{self.source.taxonomy} taxonomy returned no sectors")
        for row in snapshot.sectors:
            if row.taxonomy != self.source.taxonomy:
                raise ValueError(
                    f"taxonomy mismatch: expected {self.source.taxonomy}, got {row.taxonomy}"
                )

        incoming_ids = {row.id for row in snapshot.sectors}
        for row in snapshot.sectors:
            sector = self.session.get(Sector, row.id)
            if sector is None:
                sector = Sector(
                    id=row.id,
                    taxonomy=row.taxonomy,
                    source_code=row.source_code,
                    name=row.name,
                    source=row.source,
                    source_updated_at=row.source_updated_at,
                )
                self.session.add(sector)
            else:
                sector.name = row.name
                sector.active = True
                sector.source_updated_at = row.source_updated_at

        existing = self.session.scalars(
            select(Sector).where(Sector.taxonomy == self.source.taxonomy)
        ).all()
        for sector in existing:
            if sector.id not in incoming_ids:
                sector.active = False

        self.session.flush()
        self.session.execute(
            delete(StockSector).where(StockSector.sector_id.in_(incoming_ids))
        )
        missing_stocks = 0
        membership_count = 0
        for membership in snapshot.memberships:
            if membership.sector_id not in incoming_ids:
                continue
            stock = self.session.scalar(
                select(Stock).where(Stock.symbol == membership.stock_symbol)
            )
            if stock is None:
                missing_stocks += 1
                continue
            self.session.add(
                StockSector(
                    stock_id=stock.id,
                    sector_id=membership.sector_id,
                    source=membership.source,
                    effective_from=membership.effective_from,
                )
            )
            membership_count += 1
        self.session.commit()
        return SectorSyncResult(
            sectors=len(snapshot.sectors),
            memberships=membership_count,
            missing_stocks=missing_stocks,
        )
