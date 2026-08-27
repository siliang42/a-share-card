import gzip
import json

from app.services.raw_snapshots import RawSnapshotWriter


def test_raw_snapshot_is_compressed_and_recoverable(tmp_path) -> None:
    writer = RawSnapshotWriter(tmp_path)

    path = writer.write("eastmoney", "stock_universe", {"rc": 0, "data": {"total": 5904}})

    assert path.suffix == ".gz"
    with gzip.open(path, "rt", encoding="utf-8") as stream:
        stored = json.loads(stream.readline())
    assert stored["source"] == "eastmoney"
    assert stored["payload"]["data"]["total"] == 5904
