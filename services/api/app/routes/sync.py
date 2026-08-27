from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DatasetRelease
from app.routes.dependencies import get_session
from app.schemas import ManifestResponse
from app.security import require_pairing_token
from app.services.publication import DatasetPublisher


router = APIRouter(
    prefix="/api/v1/sync",
    tags=["sync"],
    dependencies=[Depends(require_pairing_token)],
)


@router.get("/manifest", response_model=ManifestResponse)
def get_manifest(request: Request, session: Session = Depends(get_session)) -> ManifestResponse:
    try:
        manifest = DatasetPublisher(session, request.app.state.settings.data_dir).current_manifest()
    except LookupError as exc:
        raise HTTPException(status_code=404, detail="no dataset published") from exc
    return ManifestResponse.model_validate(manifest)


@router.get("/dataset")
def download_dataset(session: Session = Depends(get_session)) -> FileResponse:
    release = session.scalar(
        select(DatasetRelease).where(DatasetRelease.is_current.is_(True))
    )
    if release is None:
        raise HTTPException(status_code=404, detail="no dataset published")
    return FileResponse(
        release.path,
        media_type="application/gzip",
        filename=f"gushi-{release.version}.json.gz",
        headers={"X-Dataset-SHA256": release.sha256},
    )
