import gzip
import importlib
import json

import pytest
from sqlalchemy import func, select

from app.models import Board, CompanyProfile, LatestQuote, Sector, Stock, StockSector
from app.services.publication import DatasetPublisher


@pytest.mark.asyncio
async def test_demo_seed_populates_all_markets_and_publishes_dataset(session, tmp_path) -> None:
    try:
        demo_seed = importlib.import_module("app.demo_seed")
    except ModuleNotFoundError:
        pytest.fail("app.demo_seed is not implemented")

    result = await demo_seed.seed_demo_data(session, tmp_path)

    stocks = session.scalars(select(Stock).order_by(Stock.id)).all()
    assert len(stocks) == 5
    assert {stock.board for stock in stocks} == {
        Board.SH_MAIN,
        Board.SZ_MAIN,
        Board.CHINEXT,
        Board.STAR,
        Board.BSE,
    }
    assert result["universe"]["inserted"] == 5
    assert session.scalar(select(func.count()).select_from(CompanyProfile)) == 5
    assert session.scalar(select(func.count()).select_from(LatestQuote)) == 5
    assert session.scalar(select(func.count()).select_from(StockSector)) == 8
    assert set(session.scalars(select(Sector.taxonomy)).all()) == {
        "shenwan",
        "eastmoney_concept",
    }

    manifest = DatasetPublisher(session, tmp_path).current_manifest()
    assert result["publication"]["version"] == manifest.version
    assert manifest.stock_count == 5
    assert manifest.sector_count == 7
    dataset_path = tmp_path / "datasets" / f"{manifest.version}.json.gz"
    dataset = json.loads(gzip.decompress(dataset_path.read_bytes()))
    assert {stock["name"] for stock in dataset["stocks"]} == {
        "贵州茅台",
        "许继电气",
        "宁德时代",
        "中芯国际",
        "万达轴承",
    }
    assert all(stock["businessSummary"] for stock in dataset["stocks"])
