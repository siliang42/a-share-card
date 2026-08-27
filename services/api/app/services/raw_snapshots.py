from datetime import UTC, datetime
import gzip
import json
from pathlib import Path
from uuid import uuid4


class RawSnapshotWriter:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir

    def write(self, source: str, kind: str, payload: dict) -> Path:
        captured_at = datetime.now(UTC)
        path = (
            self.data_dir
            / "raw"
            / captured_at.strftime("%Y-%m-%d")
            / source
            / f"{kind}-{captured_at.strftime('%H%M%S')}-{uuid4().hex[:8]}.json.gz"
        )
        path.parent.mkdir(parents=True, exist_ok=True)
        with gzip.open(path, "wt", encoding="utf-8") as stream:
            stream.write(
                json.dumps(
                    {
                        "source": source,
                        "kind": kind,
                        "capturedAt": captured_at.isoformat(),
                        "payload": payload,
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
                + "\n"
            )
        return path
