from dataclasses import dataclass

from app.models import Stock


@dataclass(frozen=True)
class EffectiveStock:
    id: str
    symbol: str
    name: str
    board: str
    business_summary: str | None
    business_summary_source: str | None


def project_effective_stock(stock: Stock) -> EffectiveStock:
    override = stock.override
    source_summary = stock.profile.source_business_summary if stock.profile else None
    manual_summary = override.business_summary if override else None
    return EffectiveStock(
        id=stock.id,
        symbol=stock.symbol,
        name=override.name if override and override.name else stock.name,
        board=stock.board,
        business_summary=manual_summary or source_summary,
        business_summary_source=(
            "manual"
            if manual_summary
            else stock.profile.source if source_summary and stock.profile else None
        ),
    )
