from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.routes.dependencies import get_session
from app.schemas import QuoteBatchResponse, QuoteResponse
from app.security import require_pairing_token
from app.services.quotes import QuoteService
from app.sources.eastmoney import EastmoneyQuoteSource
from app.sources.tencent import TencentQuoteSource


router = APIRouter(
    prefix="/api/v1",
    tags=["quotes"],
    dependencies=[Depends(require_pairing_token)],
)


@router.get("/quotes", response_model=QuoteBatchResponse)
async def get_quotes(
    request: Request,
    ids: str = Query(min_length=1),
    session: Session = Depends(get_session),
) -> QuoteBatchResponse:
    stock_ids = [value.strip() for value in ids.split(",") if value.strip()]
    if len(stock_ids) > 100:
        raise HTTPException(status_code=422, detail="quote batch cannot exceed 100 stock ids")
    service = QuoteService(
        session,
        primary=EastmoneyQuoteSource(),
        fallback=TencentQuoteSource(),
        refresh_seconds=request.app.state.settings.quote_refresh_seconds,
    )
    batch = await service.get(stock_ids)
    return QuoteBatchResponse(quotes=[QuoteResponse.model_validate(row) for row in batch.quotes])
