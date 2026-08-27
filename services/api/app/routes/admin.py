import json
from dataclasses import asdict

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import DatasetRelease, LatestQuote, Sector, Stock, StockOverride, SyncRun
from app.routes.dependencies import get_session
from app.routes.stocks import _stock_response
from app.schemas import (
    DashboardResponse,
    ImportApplyResponse,
    ImportPreviewResponse,
    ManifestResponse,
    PairingResponse,
    SyncRequest,
    SyncResponse,
    StockOverrideUpdate,
    StockResponse,
)
from app.security import require_pairing_token
from app.services.csv_exchange import CsvExchange
from app.services.publication import DatasetPublisher
from app.services.sector_sync import SectorSyncService
from app.services.universe_sync import UniverseSyncService
from app.sources.base import SourceUnavailable
from app.sources.eastmoney import EastmoneyConceptSource, EastmoneyStockSource
from app.sources.shenwan import ShenwanSectorSource


router = APIRouter(
    prefix="/api/v1/admin",
    tags=["admin"],
    dependencies=[Depends(require_pairing_token)],
)


@router.get("/pairing", response_model=PairingResponse)
def get_pairing(request: Request) -> PairingResponse:
    return PairingResponse(
        base_url=str(request.base_url).rstrip("/"),
        token=request.app.state.settings.pairing_token,
        service="股识本地数据服务",
    )


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(session: Session = Depends(get_session)) -> DashboardResponse:
    release = session.scalar(select(DatasetRelease).where(DatasetRelease.is_current.is_(True)))
    syncs = session.scalars(select(SyncRun).order_by(SyncRun.started_at.desc()).limit(8)).all()
    return DashboardResponse(
        dataset_version=release.version if release else None,
        stock_count=session.scalar(select(func.count()).select_from(Stock)) or 0,
        sector_count=session.scalar(select(func.count()).select_from(Sector)) or 0,
        pending_confirmation_count=(
            session.scalar(
                select(func.count()).select_from(Stock).where(Stock.pending_confirmation.is_(True))
            )
            or 0
        ),
        stale_quote_count=0,
        recent_syncs=[
            {
                "id": row.id,
                "kind": row.kind,
                "source": row.source,
                "status": row.status,
                "startedAt": row.started_at.isoformat(),
            }
            for row in syncs
        ],
    )


@router.post("/sync", response_model=SyncResponse)
async def run_sync(
    request: Request,
    sync_request: SyncRequest,
    session: Session = Depends(get_session),
) -> SyncResponse:
    kind = sync_request.kind
    try:
        if kind == "universe":
            result = await UniverseSyncService(session, EastmoneyStockSource()).run()
            details = asdict(result)
        elif kind == "shenwan":
            result = await SectorSyncService(session, ShenwanSectorSource()).run()
            details = asdict(result)
        elif kind == "concepts":
            result = await SectorSyncService(session, EastmoneyConceptSource()).run()
            details = asdict(result)
        elif kind == "publish":
            manifest = DatasetPublisher(
                session,
                request.app.state.settings.data_dir,
            ).publish()
            details = ManifestResponse.model_validate(manifest).model_dump(by_alias=True, mode="json")
        else:
            raise HTTPException(status_code=422, detail=f"unsupported sync kind: {kind}")
    except SourceUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return SyncResponse(kind=kind, status="completed", details=details)


@router.patch("/stocks/{stock_id}", response_model=StockResponse)
def update_stock_override(
    stock_id: str,
    update: StockOverrideUpdate,
    session: Session = Depends(get_session),
) -> StockResponse:
    stock = session.get(Stock, stock_id)
    if stock is None:
        raise HTTPException(status_code=404, detail="stock not found")
    override = session.get(StockOverride, stock_id)
    if override is None:
        override = StockOverride(stock_id=stock_id)
        session.add(override)
    fields = update.model_fields_set
    if "name" in fields:
        override.name = update.name.strip() if update.name else None
    if "business_summary" in fields:
        override.business_summary = update.business_summary.strip() if update.business_summary else None
    if "tags" in fields:
        override.tags_json = json.dumps(update.tags or [], ensure_ascii=False)
    if "notes" in fields:
        override.notes = update.notes.strip() if update.notes else None
    session.commit()
    session.refresh(stock)
    return _stock_response(session, stock)


@router.get("/exports/{kind}")
def export_csv(kind: str, session: Session = Depends(get_session)) -> Response:
    try:
        content = CsvExchange(session).export(kind)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{kind}.csv"'},
    )


@router.post("/imports/preview", response_model=ImportPreviewResponse)
def preview_import(
    kind: str,
    content: bytes = Body(media_type="text/csv"),
    session: Session = Depends(get_session),
) -> ImportPreviewResponse:
    try:
        preview = CsvExchange(session).preview(content, kind)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ImportPreviewResponse.model_validate(preview)


@router.post("/imports/{batch_id}/apply", response_model=ImportApplyResponse)
def apply_import(batch_id: str, session: Session = Depends(get_session)) -> ImportApplyResponse:
    try:
        result = CsvExchange(session).apply(batch_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ImportApplyResponse.model_validate(result)
