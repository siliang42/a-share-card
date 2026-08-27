import argparse
import asyncio
from dataclasses import asdict
import json
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import create_engine_for, create_session_factory
from app.models import Base, Board, Stock
from app.services.profile_sync import ProfileSyncService
from app.services.publication import DatasetPublisher
from app.services.quotes import QuoteService
from app.services.sector_sync import SectorSyncService
from app.services.universe_sync import UniverseSyncService
from app.sources.base import NormalizedProfile, NormalizedQuote, NormalizedStock, SectorSnapshot
from app.sources.eastmoney import (
    parse_company_profile,
    parse_concept_catalog,
    parse_concept_members,
    parse_quote_page,
    parse_stock_page,
)
from app.sources.shenwan import parse_components, parse_index_page


DEFAULT_FIXTURE = Path(__file__).with_name("fixtures") / "demo_seed.json"


def _load_fixture(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


class DemoUniverseSource:
    name = "eastmoney"

    def __init__(self, fixture: dict[str, Any]) -> None:
        self.fixture = fixture

    async def fetch(self) -> list[NormalizedStock]:
        stocks: list[NormalizedStock] = []
        for page in self.fixture["stockPages"]:
            stocks.extend(
                parse_stock_page(
                    page["payload"],
                    exchange=page["exchange"],
                    board=Board(page["board"]),
                )
            )
        return stocks


class DemoSectorSource:
    def __init__(self, fixture: dict[str, Any], taxonomy: str) -> None:
        self.fixture = fixture
        self.taxonomy = taxonomy
        self.name = "shenwan" if taxonomy == "shenwan" else "eastmoney"

    async def fetch(self) -> SectorSnapshot:
        if self.taxonomy == "shenwan":
            sectors = parse_index_page(self.fixture["shenwanIndex"])
            memberships = [
                membership
                for sector in sectors
                for membership in parse_components(
                    sector.id,
                    self.fixture["shenwanComponents"][sector.source_code],
                )
            ]
        else:
            sectors = parse_concept_catalog(self.fixture["conceptCatalog"])
            memberships = [
                membership
                for sector in sectors
                for membership in parse_concept_members(
                    sector.id,
                    self.fixture["conceptMembers"][sector.source_code],
                )
            ]
        return SectorSnapshot(sectors=sectors, memberships=memberships)


class DemoProfileSource:
    name = "eastmoney"

    def __init__(self, fixture: dict[str, Any]) -> None:
        self.fixture = fixture

    async def fetch_profile(self, stock_id: str) -> NormalizedProfile:
        return parse_company_profile(stock_id, self.fixture["profiles"][stock_id])


class DemoQuoteSource:
    name = "eastmoney"

    def __init__(self, fixture: dict[str, Any]) -> None:
        self.fixture = fixture

    async def fetch_quotes(self, stock_ids: list[str]) -> list[NormalizedQuote]:
        requested = set(stock_ids)
        return [
            quote
            for quote in parse_quote_page(self.fixture["quotes"])
            if quote.stock_id in requested
        ]


async def seed_demo_data(
    session: Session,
    data_dir: Path,
    fixture_path: Path = DEFAULT_FIXTURE,
) -> dict[str, Any]:
    fixture = _load_fixture(fixture_path)
    universe = await UniverseSyncService(session, DemoUniverseSource(fixture)).run()
    shenwan = await SectorSyncService(
        session,
        DemoSectorSource(fixture, "shenwan"),
    ).run()
    concepts = await SectorSyncService(
        session,
        DemoSectorSource(fixture, "eastmoney_concept"),
    ).run()

    profile_service = ProfileSyncService(session, DemoProfileSource(fixture))
    stock_ids = session.scalars(select(Stock.id).order_by(Stock.id)).all()
    for stock_id in stock_ids:
        await profile_service.refresh(stock_id)

    quote_source = DemoQuoteSource(fixture)
    quotes = await QuoteService(
        session,
        primary=quote_source,
        fallback=quote_source,
        refresh_seconds=15,
    ).get(list(stock_ids))
    publication = DatasetPublisher(session, data_dir).publish()
    return {
        "universe": asdict(universe),
        "sectors": {
            "shenwan": asdict(shenwan),
            "concepts": asdict(concepts),
        },
        "profiles": {"updated": len(stock_ids)},
        "quotes": {"updated": len(quotes.quotes)},
        "publication": asdict(publication),
    }


async def _run(settings: Settings, fixture_path: Path) -> dict[str, Any]:
    engine = create_engine_for(settings)
    Base.metadata.create_all(engine)
    session = create_session_factory(engine)()
    try:
        return await seed_demo_data(session, settings.data_dir, fixture_path)
    finally:
        session.close()
        engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Load the deterministic local demo dataset")
    parser.add_argument("--fixture", type=Path, default=DEFAULT_FIXTURE)
    args = parser.parse_args()
    result = asyncio.run(_run(Settings(), args.fixture))
    print(json.dumps(result, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
