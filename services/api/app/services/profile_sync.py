from typing import Protocol

from sqlalchemy.orm import Session

from app.models import CompanyProfile, Stock
from app.sources.base import NormalizedProfile


class ProfileSource(Protocol):
    name: str

    async def fetch_profile(self, stock_id: str) -> NormalizedProfile: ...


class ProfileSyncService:
    def __init__(self, session: Session, source: ProfileSource) -> None:
        self.session = session
        self.source = source

    async def refresh(self, stock_id: str) -> NormalizedProfile:
        if self.session.get(Stock, stock_id) is None:
            raise ValueError(f"unknown stock: {stock_id}")
        row = await self.source.fetch_profile(stock_id)
        profile = self.session.get(CompanyProfile, stock_id)
        if profile is None:
            profile = CompanyProfile(
                stock_id=stock_id,
                source_business_summary=row.source_business_summary,
                company_intro=row.company_intro,
                source=row.source,
                source_updated_at=row.source_updated_at,
                fetched_at=row.fetched_at,
            )
            self.session.add(profile)
        else:
            profile.source_business_summary = row.source_business_summary
            profile.company_intro = row.company_intro
            profile.source = row.source
            profile.source_updated_at = row.source_updated_at
            profile.fetched_at = row.fetched_at
        self.session.commit()
        return row
