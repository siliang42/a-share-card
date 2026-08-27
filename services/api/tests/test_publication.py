import gzip
import json

import pytest

from app.services.publication import DatasetPublisher, DatasetValidationError


def valid_payload() -> dict:
    return {
        "stocks": [
            {
                "id": "SZ:000400",
                "symbol": "000400",
                "name": "许继电气",
                "board": "SZ_MAIN",
                "businessSummary": "电网自动化与特高压设备",
            }
        ],
        "sectors": [
            {
                "id": "shenwan:801730",
                "taxonomy": "shenwan",
                "name": "电力设备",
            }
        ],
        "memberships": [
            {"stockId": "SZ:000400", "sectorId": "shenwan:801730"}
        ],
    }


def test_failed_validation_does_not_replace_last_release(session, tmp_path) -> None:
    publisher = DatasetPublisher(session, tmp_path)
    first = publisher.publish(valid_payload())

    invalid = valid_payload()
    invalid["memberships"] = [
        {"stockId": "SH:999999", "sectorId": "shenwan:801730"}
    ]

    with pytest.raises(DatasetValidationError, match="unknown stock"):
        publisher.publish(invalid)

    assert publisher.current_manifest().version == first.version


def test_published_dataset_matches_manifest_checksum(session, tmp_path) -> None:
    publisher = DatasetPublisher(session, tmp_path)

    manifest = publisher.publish(valid_payload())
    content = (tmp_path / "datasets" / f"{manifest.version}.json.gz").read_bytes()
    decoded = json.loads(gzip.decompress(content))

    assert decoded["stocks"][0]["id"] == "SZ:000400"
    assert manifest.stock_count == 1
    assert manifest.sector_count == 1
    assert manifest.size_bytes == len(content)
