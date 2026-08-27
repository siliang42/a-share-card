import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.domain.effective_stock import project_effective_stock
from app.models import Sector, Stock, StockSector
from app.routes.dependencies import get_session
from app.schemas import (
    CatalogResponse,
    MarketCatalogItem,
    StockListResponse,
    StockResponse,
)
from app.security import require_pairing_token


router = APIRouter(
    prefix="/api/v1",
    tags=["stocks"],
    dependencies=[Depends(require_pairing_token)],
)


BOARD_NAMES = {
    "SH_MAIN": "沪市主板",
    "SZ_MAIN": "深市主板",
    "CHINEXT": "创业板",
    "STAR": "科创板",
    "BSE": "北交所",
}


def _stock_response(session: Session, stock: Stock) -> StockResponse:
    effective = project_effective_stock(stock)
    sector_names = session.scalars(
        select(Sector.name)
        .join(StockSector, StockSector.sector_id == Sector.id)
        .where(StockSector.stock_id == stock.id, Sector.active.is_(True))
        .order_by(Sector.taxonomy, Sector.name)
    ).all()
    return StockResponse(
        id=stock.id,
        exchange=stock.exchange,
        symbol=stock.symbol,
        name=effective.name,
        board=str(stock.board),
        listing_status=stock.listing_status,
        business_summary=effective.business_summary,
        business_summary_source=effective.business_summary_source,
        sectors=list(sector_names),
    )


@router.get("/stocks", response_model=StockListResponse)
def list_stocks(
    query: str | None = None,
    board: str | None = None,
    sector_id: str | None = None,
    status: str | None = "active",
    cursor: str | None = None,
    limit: int = Query(default=30, ge=1, le=100),
    session: Session = Depends(get_session),
) -> StockListResponse:
    statement = select(Stock)
    count_statement = select(func.count(func.distinct(Stock.id)))
    if sector_id:
        statement = statement.join(StockSector, StockSector.stock_id == Stock.id)
        count_statement = count_statement.join(StockSector, StockSector.stock_id == Stock.id)
        statement = statement.where(StockSector.sector_id == sector_id)
        count_statement = count_statement.where(StockSector.sector_id == sector_id)
    if query:
        pattern = f"%{query.strip()}%"
        predicate = or_(Stock.symbol.like(pattern), Stock.name.like(pattern))
        statement = statement.where(predicate)
        count_statement = count_statement.where(predicate)
    if board:
        statement = statement.where(Stock.board == board)
        count_statement = count_statement.where(Stock.board == board)
    if status:
        statement = statement.where(Stock.listing_status == status)
        count_statement = count_statement.where(Stock.listing_status == status)
    if cursor:
        statement = statement.where(Stock.id > cursor)
    rows = session.scalars(statement.order_by(Stock.id).limit(limit + 1)).unique().all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    return StockListResponse(
        items=[_stock_response(session, row) for row in rows],
        next_cursor=rows[-1].id if has_more and rows else None,
        total=session.scalar(count_statement) or 0,
    )


@router.get("/stocks/{stock_id}", response_model=StockResponse)
def get_stock(stock_id: str, session: Session = Depends(get_session)) -> StockResponse:
    stock = session.get(Stock, stock_id)
    if stock is None:
        raise HTTPException(status_code=404, detail="stock not found")
    return _stock_response(session, stock)


@router.get("/catalog", response_model=CatalogResponse)
def get_catalog(session: Session = Depends(get_session)) -> CatalogResponse:
    board_counts = dict(
        session.execute(
            select(Stock.board, func.count()).where(Stock.listing_status == "active").group_by(Stock.board)
        ).all()
    )
    markets = [
        MarketCatalogItem(
            id=f"board:{board}",
            name=BOARD_NAMES[board],
            taxonomy="board",
            stock_count=int(board_counts.get(board, 0)),
        )
        for board in BOARD_NAMES
    ]
    sector_rows = session.execute(
        select(Sector, func.count(StockSector.stock_id))
        .outerjoin(StockSector, StockSector.sector_id == Sector.id)
        .where(Sector.active.is_(True))
        .group_by(Sector.id)
        .order_by(Sector.taxonomy, Sector.name)
    ).all()
    sectors = [
        MarketCatalogItem(
            id=sector.id,
            name=sector.name,
            taxonomy=sector.taxonomy,
            stock_count=count,
        )
        for sector, count in sector_rows
    ]
    return CatalogResponse(markets=markets, sectors=sectors)
