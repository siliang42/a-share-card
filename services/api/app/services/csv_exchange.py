from dataclasses import dataclass, field
from datetime import UTC, datetime
import csv
import hashlib
import io
import json
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.effective_stock import project_effective_stock
from app.models import Board, ImportBatch, Sector, Stock, StockOverride, StockSector


OVERRIDE_HEADERS = ["stock_id", "name", "business_summary", "tags", "notes"]
MANUAL_STOCK_HEADERS = [
    "exchange", "symbol", "name", "board", "listing_status", "business_summary"
]

@dataclass(frozen=True)
class ImportErrorRow:
    row: int
    message: str


@dataclass(frozen=True)
class ImportPreview:
    batch_id: str = "empty"
    inserts: int = 0
    updates: int = 0
    unchanged: int = 0
    rejected: int = 0
    errors: list[ImportErrorRow] = field(default_factory=list)


@dataclass(frozen=True)
class ImportResult:
    batch_id: str
    applied_rows: int


class CsvExchange:
    def __init__(self, session: Session) -> None:
        self.session = session

    def export(self, kind: str) -> bytes:
        output = io.StringIO(newline="")
        if kind == "stock_overrides":
            writer = csv.DictWriter(output, fieldnames=OVERRIDE_HEADERS)
            writer.writeheader()
            rows = self.session.scalars(select(StockOverride).order_by(StockOverride.stock_id))
            for row in rows:
                writer.writerow(
                    {
                        "stock_id": row.stock_id,
                        "name": row.name or "",
                        "business_summary": row.business_summary or "",
                        "tags": row.tags_json or "",
                        "notes": row.notes or "",
                    }
                )
        elif kind == "manual_stocks":
            writer = csv.DictWriter(output, fieldnames=MANUAL_STOCK_HEADERS)
            writer.writeheader()
            rows = self.session.scalars(
                select(Stock).where(Stock.manual_source.is_(True)).order_by(Stock.id)
            )
            for stock in rows:
                writer.writerow(
                    {
                        "exchange": stock.exchange,
                        "symbol": stock.symbol,
                        "name": stock.name,
                        "board": stock.board,
                        "listing_status": stock.listing_status,
                        "business_summary": (
                            stock.override.business_summary if stock.override else ""
                        ) or "",
                    }
                )
        elif kind == "stocks":
            headers = [
                "stock_id", "exchange", "symbol", "name", "board",
                "listing_status", "business_summary", "source",
            ]
            writer = csv.DictWriter(output, fieldnames=headers)
            writer.writeheader()
            for stock in self.session.scalars(select(Stock).order_by(Stock.id)):
                effective = project_effective_stock(stock)
                writer.writerow(
                    {
                        "stock_id": stock.id,
                        "exchange": stock.exchange,
                        "symbol": stock.symbol,
                        "name": effective.name,
                        "board": stock.board,
                        "listing_status": stock.listing_status,
                        "business_summary": effective.business_summary or "",
                        "source": stock.source,
                    }
                )
        elif kind == "sectors":
            headers = ["sector_id", "taxonomy", "source_code", "name", "active", "source"]
            writer = csv.DictWriter(output, fieldnames=headers)
            writer.writeheader()
            for sector in self.session.scalars(select(Sector).order_by(Sector.id)):
                writer.writerow(
                    {
                        "sector_id": sector.id,
                        "taxonomy": sector.taxonomy,
                        "source_code": sector.source_code,
                        "name": sector.name,
                        "active": str(sector.active).lower(),
                        "source": sector.source,
                    }
                )
        elif kind == "stock_sectors":
            headers = ["stock_id", "sector_id", "source", "effective_from", "effective_to"]
            writer = csv.DictWriter(output, fieldnames=headers)
            writer.writeheader()
            for row in self.session.scalars(
                select(StockSector).order_by(StockSector.sector_id, StockSector.stock_id)
            ):
                writer.writerow(
                    {
                        "stock_id": row.stock_id,
                        "sector_id": row.sector_id,
                        "source": row.source,
                        "effective_from": row.effective_from or "",
                        "effective_to": row.effective_to or "",
                    }
                )
        else:
            raise ValueError(f"unsupported CSV export kind: {kind}")
        return output.getvalue().encode("utf-8-sig")

    def preview(self, content: bytes, kind: str) -> ImportPreview:
        if kind not in {"stock_overrides", "manual_stocks"}:
            raise ValueError(f"unsupported CSV import kind: {kind}")
        checksum = hashlib.sha256(content).hexdigest()
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ValueError("CSV must be UTF-8 encoded") from exc
        reader = csv.DictReader(io.StringIO(text))
        expected_headers = OVERRIDE_HEADERS if kind == "stock_overrides" else MANUAL_STOCK_HEADERS
        if reader.fieldnames != expected_headers:
            raise ValueError(f"CSV headers must be: {','.join(expected_headers)}")

        accepted: list[dict[str, str]] = []
        errors: list[ImportErrorRow] = []
        seen: set[str] = set()
        inserts = updates = unchanged = 0
        for row_number, row in enumerate(reader, start=2):
            if kind == "manual_stocks":
                normalized, error = self._normalize_manual_stock(row, row_number)
                if error:
                    errors.append(error)
                    continue
                assert normalized is not None
                stock_id = normalized["stock_id"]
                if stock_id in seen:
                    errors.append(ImportErrorRow(row_number, f"duplicate stock_id: {stock_id}"))
                    continue
                seen.add(stock_id)
                stock = self.session.get(Stock, stock_id)
                if stock is None:
                    inserts += 1
                elif not stock.manual_source:
                    errors.append(
                        ImportErrorRow(row_number, f"stock is owned by an upstream source: {stock_id}")
                    )
                    continue
                elif self._manual_stock_matches(stock, normalized):
                    unchanged += 1
                else:
                    updates += 1
                accepted.append(normalized)
                continue

            stock_id = (row.get("stock_id") or "").strip()
            if stock_id in seen:
                errors.append(ImportErrorRow(row_number, f"duplicate stock_id: {stock_id}"))
                continue
            seen.add(stock_id)
            stock = self.session.get(Stock, stock_id)
            if stock is None:
                errors.append(ImportErrorRow(row_number, f"unknown stock: {stock_id}"))
                continue
            normalized = {
                "stock_id": stock_id,
                "name": (row.get("name") or "").strip(),
                "business_summary": (row.get("business_summary") or "").strip(),
                "tags": (row.get("tags") or "").strip(),
                "notes": (row.get("notes") or "").strip(),
            }
            accepted.append(normalized)
            existing = self.session.get(StockOverride, stock_id)
            if existing is None:
                inserts += 1
            elif self._override_matches(existing, normalized):
                unchanged += 1
            else:
                updates += 1

        batch_id = str(uuid4())
        preview_data = {
            "kind": kind,
            "rows": accepted,
            "errors": [error.__dict__ for error in errors],
            "counts": {
                "inserts": inserts,
                "updates": updates,
                "unchanged": unchanged,
                "rejected": len(errors),
            },
        }
        self.session.add(
            ImportBatch(
                id=batch_id,
                kind=kind,
                checksum=checksum,
                status="previewed",
                preview_json=json.dumps(preview_data, ensure_ascii=False),
            )
        )
        self.session.commit()
        return ImportPreview(
            batch_id=batch_id,
            inserts=inserts,
            updates=updates,
            unchanged=unchanged,
            rejected=len(errors),
            errors=errors,
        )

    def apply(self, batch_id: str) -> ImportResult:
        batch = self.session.get(ImportBatch, batch_id)
        if batch is None:
            raise ValueError(f"unknown import batch: {batch_id}")
        if batch.status != "previewed":
            raise ValueError(f"import batch is not applicable: {batch.status}")
        preview = json.loads(batch.preview_json)
        if preview["kind"] == "stock_overrides":
            for row in preview["rows"]:
                existing = self.session.get(StockOverride, row["stock_id"])
                if existing is None:
                    existing = StockOverride(stock_id=row["stock_id"])
                    self.session.add(existing)
                existing.name = row["name"] or None
                existing.business_summary = row["business_summary"] or None
                existing.tags_json = row["tags"] or None
                existing.notes = row["notes"] or None
        elif preview["kind"] == "manual_stocks":
            for row in preview["rows"]:
                stock = self.session.get(Stock, row["stock_id"])
                if stock is None:
                    stock = Stock(
                        id=row["stock_id"],
                        exchange=row["exchange"],
                        symbol=row["symbol"],
                        name=row["name"],
                        board=Board(row["board"]),
                        listing_status=row["listing_status"],
                        source="manual",
                        source_updated_at=datetime.now(UTC),
                        manual_source=True,
                    )
                    self.session.add(stock)
                else:
                    stock.name = row["name"]
                    stock.board = Board(row["board"])
                    stock.listing_status = row["listing_status"]
                    stock.source_updated_at = datetime.now(UTC)
                if stock.override is None:
                    stock.override = StockOverride(stock_id=row["stock_id"])
                stock.override.business_summary = row["business_summary"] or None
        else:
            raise ValueError(f"unsupported CSV import kind: {preview['kind']}")
        applied_rows = len(preview["rows"])
        batch.status = "applied"
        batch.result_json = json.dumps({"appliedRows": applied_rows})
        batch.applied_at = datetime.now(UTC)
        self.session.commit()
        return ImportResult(batch_id=batch_id, applied_rows=applied_rows)

    @staticmethod
    def _override_matches(existing: StockOverride, row: dict[str, str]) -> bool:
        return (
            (existing.name or "") == row["name"]
            and (existing.business_summary or "") == row["business_summary"]
            and (existing.tags_json or "") == row["tags"]
            and (existing.notes or "") == row["notes"]
        )

    @staticmethod
    def _normalize_manual_stock(
        row: dict[str, str | None],
        row_number: int,
    ) -> tuple[dict[str, str] | None, ImportErrorRow | None]:
        exchange = (row.get("exchange") or "").strip().upper()
        symbol = (row.get("symbol") or "").strip()
        name = (row.get("name") or "").strip()
        board = (row.get("board") or "").strip().upper()
        listing_status = (row.get("listing_status") or "active").strip() or "active"
        if exchange not in {"SH", "SZ", "BJ"}:
            return None, ImportErrorRow(row_number, f"invalid exchange: {exchange}")
        if len(symbol) != 6 or not symbol.isdigit():
            return None, ImportErrorRow(row_number, f"invalid symbol: {symbol}")
        if not name:
            return None, ImportErrorRow(row_number, "name is required")
        try:
            Board(board)
        except ValueError:
            return None, ImportErrorRow(row_number, f"invalid board: {board}")
        return (
            {
                "stock_id": f"{exchange}:{symbol}",
                "exchange": exchange,
                "symbol": symbol,
                "name": name,
                "board": board,
                "listing_status": listing_status,
                "business_summary": (row.get("business_summary") or "").strip(),
            },
            None,
        )

    @staticmethod
    def _manual_stock_matches(stock: Stock, row: dict[str, str]) -> bool:
        return (
            stock.exchange == row["exchange"]
            and stock.symbol == row["symbol"]
            and stock.name == row["name"]
            and str(stock.board) == row["board"]
            and stock.listing_status == row["listing_status"]
            and ((stock.override.business_summary if stock.override else "") or "")
            == row["business_summary"]
        )
