from datetime import UTC, datetime

import httpx
import pytest
import pytest_asyncio

from app.config import Settings
from app.main import create_app
from app.models import Board, CompanyProfile, Stock
from app.services.publication import DatasetPublisher


def payload() -> dict:
    return {
        "stocks": [
            {
                "id": "SZ:000400",
                "symbol": "000400",
                "name": "许继电气",
                "board": "SZ_MAIN",
                "businessSummary": "电网自动化",
            }
        ],
        "sectors": [],
        "memberships": [],
    }


@pytest.fixture
def contract_app(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'api.db'}",
        data_dir=tmp_path,
        pairing_token="test-token",
    )
    app = create_app(settings)
    with app.state.session_factory() as session:
        DatasetPublisher(session, tmp_path).publish(payload())
        session.add(
            Stock(
                id="SZ:000400",
                exchange="SZ",
                symbol="000400",
                name="许继电气",
                board=Board.SZ_MAIN,
                source="fixture",
                source_updated_at=datetime.now(UTC),
                profile=CompanyProfile(
                    stock_id="SZ:000400",
                    source_business_summary="外部主营",
                    source="fixture",
                    fetched_at=datetime.now(UTC),
                ),
            )
        )
        session.commit()
    return app


@pytest_asyncio.fixture
async def client(contract_app):
    transport = httpx.ASGITransport(app=contract_app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as api_client:
        yield api_client


def auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-token"}


@pytest.mark.asyncio
async def test_mobile_api_requires_pairing_token(client) -> None:
    unauthorized = await client.get("/api/v1/sync/manifest")
    authorized = await client.get("/api/v1/sync/manifest", headers=auth_headers())

    assert unauthorized.status_code == 401
    assert authorized.status_code == 200
    assert set(authorized.json()) >= {
        "version",
        "sha256",
        "generatedAt",
        "stockCount",
        "sectorCount",
    }


@pytest.mark.asyncio
async def test_quote_request_rejects_more_than_100_symbols(client) -> None:
    ids = ",".join(f"SH:{600000 + index}" for index in range(101))

    response = await client.get(f"/api/v1/quotes?ids={ids}", headers=auth_headers())

    assert response.status_code == 422
    assert "100" in response.text


@pytest.mark.asyncio
async def test_admin_override_changes_effective_view_only(client, contract_app) -> None:
    response = await client.patch(
        "/api/v1/admin/stocks/SZ:000400",
        headers=auth_headers(),
        json={"businessSummary": "人工主营"},
    )
    listing = await client.get(
        "/api/v1/stocks?query=000400",
        headers=auth_headers(),
    )

    assert response.status_code == 200
    assert listing.json()["items"][0]["businessSummary"] == "人工主营"
    with contract_app.state.session_factory() as session:
        assert session.get(CompanyProfile, "SZ:000400").source_business_summary == "外部主营"


@pytest.mark.asyncio
async def test_pairing_info_uses_request_host(client) -> None:
    response = await client.get("/api/v1/admin/pairing", headers=auth_headers())

    assert response.status_code == 200
    assert response.json() == {
        "baseUrl": "http://test",
        "token": "test-token",
        "service": "股识本地数据服务",
    }


@pytest.mark.asyncio
async def test_admin_can_publish_current_database(client) -> None:
    response = await client.post(
        "/api/v1/admin/sync",
        headers=auth_headers(),
        json={"kind": "publish"},
    )

    assert response.status_code == 200
    assert response.json()["kind"] == "publish"
    assert response.json()["status"] == "completed"
