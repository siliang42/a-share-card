from dataclasses import dataclass
from datetime import UTC, datetime
import gzip
import hashlib
import json
from pathlib import Path
import tempfile

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.domain.effective_stock import project_effective_stock
from app.models import DatasetRelease, Sector, Stock, StockSector


class DatasetValidationError(ValueError):
    pass


@dataclass(frozen=True)
class DatasetManifest:
    version: str
    generated_at: datetime
    sha256: str
    size_bytes: int
    stock_count: int
    sector_count: int


class DatasetPublisher:
    def __init__(self, session: Session, data_dir: Path) -> None:
        self.session = session
        self.data_dir = data_dir

    def publish(self, payload: dict | None = None) -> DatasetManifest:
        source_payload = payload or self.build_payload()
        self._validate(source_payload)
        generated_at = datetime.now(UTC)
        canonical = json.dumps(
            source_payload,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        version = hashlib.sha256(canonical).hexdigest()[:16]
        document = {
            "version": version,
            "generatedAt": generated_at.isoformat(),
            **source_payload,
        }
        compressed = gzip.compress(
            json.dumps(
                document,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8"),
            mtime=0,
        )
        checksum = hashlib.sha256(compressed).hexdigest()
        datasets_dir = self.data_dir / "datasets"
        datasets_dir.mkdir(parents=True, exist_ok=True)
        target = datasets_dir / f"{version}.json.gz"
        with tempfile.NamedTemporaryFile(dir=datasets_dir, delete=False) as stream:
            stream.write(compressed)
            temporary = Path(stream.name)
        temporary.replace(target)

        self.session.execute(update(DatasetRelease).values(is_current=False))
        release = self.session.get(DatasetRelease, version)
        if release is None:
            release = DatasetRelease(
                version=version,
                path=str(target),
                sha256=checksum,
                size_bytes=len(compressed),
                stock_count=len(source_payload["stocks"]),
                sector_count=len(source_payload["sectors"]),
                is_current=True,
                generated_at=generated_at,
            )
            self.session.add(release)
        else:
            release.path = str(target)
            release.sha256 = checksum
            release.size_bytes = len(compressed)
            release.stock_count = len(source_payload["stocks"])
            release.sector_count = len(source_payload["sectors"])
            release.is_current = True
            release.generated_at = generated_at
        self.session.commit()
        return self._manifest(release)

    def current_manifest(self) -> DatasetManifest:
        release = self.session.scalar(
            select(DatasetRelease).where(DatasetRelease.is_current.is_(True))
        )
        if release is None:
            raise LookupError("no dataset has been published")
        return self._manifest(release)

    def build_payload(self) -> dict:
        stocks = self.session.scalars(
            select(Stock).where(Stock.listing_status != "deleted").order_by(Stock.id)
        ).all()
        sectors = self.session.scalars(
            select(Sector).where(Sector.active.is_(True)).order_by(Sector.id)
        ).all()
        memberships = self.session.scalars(
            select(StockSector).order_by(StockSector.sector_id, StockSector.stock_id)
        ).all()
        return {
            "stocks": [
                {
                    "id": effective.id,
                    "symbol": effective.symbol,
                    "name": effective.name,
                    "board": str(effective.board),
                    "businessSummary": effective.business_summary,
                    "businessSummarySource": effective.business_summary_source,
                }
                for effective in (project_effective_stock(stock) for stock in stocks)
            ],
            "sectors": [
                {
                    "id": sector.id,
                    "taxonomy": sector.taxonomy,
                    "name": sector.name,
                }
                for sector in sectors
            ],
            "memberships": [
                {"stockId": row.stock_id, "sectorId": row.sector_id}
                for row in memberships
            ],
        }

    @staticmethod
    def _validate(payload: dict) -> None:
        required = {"stocks", "sectors", "memberships"}
        if not required.issubset(payload):
            missing = ", ".join(sorted(required - set(payload)))
            raise DatasetValidationError(f"missing dataset collections: {missing}")
        stock_ids = {row.get("id") for row in payload["stocks"]}
        sector_ids = {row.get("id") for row in payload["sectors"]}
        if not stock_ids or None in stock_ids or len(stock_ids) != len(payload["stocks"]):
            raise DatasetValidationError("stocks must have unique non-empty ids")
        if None in sector_ids or len(sector_ids) != len(payload["sectors"]):
            raise DatasetValidationError("sectors must have unique non-empty ids")
        for membership in payload["memberships"]:
            if membership.get("stockId") not in stock_ids:
                raise DatasetValidationError(
                    f"membership references unknown stock: {membership.get('stockId')}"
                )
            if membership.get("sectorId") not in sector_ids:
                raise DatasetValidationError(
                    f"membership references unknown sector: {membership.get('sectorId')}"
                )

    @staticmethod
    def _manifest(release: DatasetRelease) -> DatasetManifest:
        generated_at = release.generated_at
        if generated_at.tzinfo is None:
            generated_at = generated_at.replace(tzinfo=UTC)
        return DatasetManifest(
            version=release.version,
            generated_at=generated_at,
            sha256=release.sha256,
            size_bytes=release.size_bytes,
            stock_count=release.stock_count,
            sector_count=release.sector_count,
        )
