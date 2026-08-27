import os

import pytest

from app.models import Board
from app.sources.base import SourceUnavailable
from app.sources.eastmoney import EastmoneyStockSource


pytestmark = pytest.mark.skipif(
    os.getenv("GUSHI_LIVE_TESTS") != "1",
    reason="set GUSHI_LIVE_TESTS=1 to call public data sources",
)


@pytest.mark.asyncio
async def test_current_universe_contains_all_supported_boards() -> None:
    try:
        rows = await EastmoneyStockSource().fetch()
    except SourceUnavailable as exc:
        pytest.skip(f"public source unavailable: {exc}")

    board_counts = {board: 0 for board in Board}
    for row in rows:
        board_counts[row.board] += 1

    assert len(rows) > 5_000
    assert all(count > 0 for count in board_counts.values())
