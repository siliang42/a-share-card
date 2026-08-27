# A-Share Memory Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a local Docker data service and admin console plus an Expo iOS-first App that synchronizes the full A-share catalog, browses stocks by market or sector, and persists sequential and FSRS learning progress offline.

**Architecture:** A FastAPI service owns source adapters, normalization, SQLite, CSV workflows, and a versioned mobile dataset. A Next.js admin application reaches FastAPI through a server-side proxy, while an Expo React Native App pairs to the LAN API, copies reference data into device SQLite, and keeps device-owned learning state separate. Third-party responses are normalized behind adapters and never consumed directly by clients.

**Tech Stack:** Python 3.13, FastAPI, SQLAlchemy 2, Alembic, httpx, Pydantic 2, pytest; Node 22, npm workspaces, TypeScript, Next.js, React, Vitest, Playwright; Expo React Native, Expo Router, Expo SQLite, ts-fsrs, Jest, React Native Testing Library; Docker Compose.

## Global Constraints

- The product is single-user and local-first; it has no registration, account login, or cloud progress synchronization.
- Expo ships iOS first and must retain a buildable Android project.
- The mobile App must remain usable for study, browsing, favorites, and progress while the Mac service is offline.
- The App must never call a third-party market-data source directly.
- Live quote requests are batched for visible stocks and throttled to no faster than once per 15 seconds.
- SQLite is canonical; CSV is an exchange format and compressed JSONL stores source evidence.
- Manual overrides and manual-source stocks must survive every upstream synchronization.
- Market/sector checkpoints use stable stock IDs, while memory state is keyed by stock ID and prompt direction.
- Eastmoney industry labels must never be presented as Shenwan industry labels.
- The first release excludes trading, recommendations, historical chart storage, Web learning, and store submission.
- Production code is written only after its focused test has failed for the expected missing behavior.

---

## File Map

```text
package.json                         npm workspaces and cross-project commands
Makefile                             repeatable setup, test, run, and sync commands
.env.example                         non-secret local configuration contract
infra/docker-compose.yml             api, worker, and admin runtime
services/api/pyproject.toml           Python dependencies and pytest configuration
services/api/alembic.ini              migration configuration
services/api/alembic/                 database migrations
services/api/app/main.py              FastAPI composition root
services/api/app/config.py            validated environment settings
services/api/app/db.py                engine, sessions, WAL setup
services/api/app/models.py            SQLAlchemy persistence models
services/api/app/schemas.py           public API schemas
services/api/app/domain/              classification, merging, summaries, publication
services/api/app/sources/             exchange, Shenwan, Eastmoney, Tencent adapters
services/api/app/services/            sync, quotes, CSV, pairing application services
services/api/app/routes/              health, catalog, stocks, sync, quotes, admin routes
services/api/tests/                   pytest unit, integration, and fixture tests
apps/admin/app/                       Next.js App Router pages and BFF route handlers
apps/admin/components/                dashboard, table, editor, import, pairing components
apps/admin/lib/                       API client, formatting, validation
apps/admin/tests/                     Vitest and Playwright tests
apps/mobile/app/                      Expo Router screens and layouts
apps/mobile/src/db/                   Expo SQLite schema and repositories
apps/mobile/src/api/                  pairing, manifest, dataset, quote clients
apps/mobile/src/features/             home, catalog, stocks, study, favorites, settings
apps/mobile/src/theme/                colors, typography, spacing, component tokens
apps/mobile/__tests__/                Jest and React Native Testing Library tests
packages/contracts/                   generated TypeScript API client
scripts/                              OpenAPI generation and local smoke checks
docs/operations.md                    startup, pairing, synchronization, and recovery
```

### Task 1: Workspace and Executable API Skeleton

**Files:**
- Create: `package.json`
- Create: `Makefile`
- Create: `.env.example`
- Create: `services/api/pyproject.toml`
- Create: `services/api/app/__init__.py`
- Create: `services/api/app/config.py`
- Create: `services/api/app/main.py`
- Test: `services/api/tests/test_health.py`

**Interfaces:**
- Consumes: no prior task interfaces.
- Produces: `create_app(settings: Settings | None = None) -> FastAPI`, `GET /health -> {status, service}`, root npm commands, and the environment contract used by every later task.

- [ ] **Step 1: Write the failing health test**

```python
from fastapi.testclient import TestClient
from app.main import create_app


def test_health_reports_service_name() -> None:
    response = TestClient(create_app()).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "gushi-api"}
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd services/api && python -m pytest tests/test_health.py -q`

Expected: FAIL because `app.main` or `create_app` does not exist.

- [ ] **Step 3: Add the minimal application and workspace configuration**

```python
# services/api/app/main.py
from fastapi import FastAPI
from .config import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    app = FastAPI(title="Gushi API", version="0.1.0")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "service": "gushi-api"}

    return app


app = create_app()
```

```python
# services/api/app/config.py
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/gushi.db"
    data_dir: Path = Path("./data")
    pairing_token: str = "local-development-token"
    quote_refresh_seconds: int = 15
    model_config = SettingsConfigDict(env_file=".env", env_prefix="GUSHI_")
```

Create `package.json` with workspaces `apps/admin`, `apps/mobile`, and `packages/contracts`; create `Makefile` targets `setup`, `test-api`, `test-web`, `test-mobile`, `test`, `dev`, and `sync`; define the same `GUSHI_` keys without real secrets in `.env.example`.

- [ ] **Step 4: Verify GREEN**

Run: `cd services/api && python -m pytest tests/test_health.py -q`

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add package.json Makefile .env.example services/api
git commit -m "chore: scaffold gushi workspace and api"
```

### Task 2: SQLite Schema, Migrations, and Effective Stock Projection

**Files:**
- Create: `services/api/app/db.py`
- Create: `services/api/app/models.py`
- Create: `services/api/app/domain/effective_stock.py`
- Create: `services/api/alembic.ini`
- Create: `services/api/alembic/env.py`
- Create: `services/api/alembic/versions/0001_initial.py`
- Test: `services/api/tests/test_effective_stock.py`
- Test: `services/api/tests/test_database.py`

**Interfaces:**
- Consumes: `Settings.database_url` and `Settings.data_dir`.
- Produces: `Stock`, `StockSourceValue`, `StockOverride`, `Sector`, `StockSector`, `CompanyProfile`, `LatestQuote`, `SyncRun`, `ImportBatch`, `DatasetRelease`; `create_engine_for(settings)`, `session_scope(settings)`, and `project_effective_stock(stock) -> EffectiveStock`.

- [ ] **Step 1: Write failing precedence and retention tests**

```python
def test_manual_summary_wins_without_replacing_source_text(session):
    stock = stock_factory(source_summary="Source summary")
    stock.override = StockOverride(business_summary="Manual summary")
    session.add(stock)
    session.commit()

    result = project_effective_stock(stock)
    assert result.business_summary == "Manual summary"
    assert result.business_summary_source == "manual"
    assert stock.profile.source_business_summary == "Source summary"


def test_sqlite_uses_wal_mode(engine):
    with engine.connect() as connection:
        assert connection.exec_driver_sql("PRAGMA journal_mode").scalar().lower() == "wal"
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `cd services/api && python -m pytest tests/test_effective_stock.py tests/test_database.py -q`

Expected: FAIL because models, engine configuration, and projection do not exist.

- [ ] **Step 3: Implement normalized tables and projection**

Use `exchange:symbol` as `stocks.id`, enum values `SH_MAIN`, `SZ_MAIN`, `CHINEXT`, `STAR`, and `BSE`, explicit source/fetch timestamps on sourced rows, uniqueness on `(taxonomy, source_code)`, and uniqueness on stock/sector membership. The effective projection must apply `StockOverride` field-by-field without mutating source rows.

```python
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
    return EffectiveStock(
        id=stock.id,
        symbol=stock.symbol,
        name=override.name if override and override.name else stock.name,
        board=stock.board,
        business_summary=(override.business_summary if override and override.business_summary else source_summary),
        business_summary_source="manual" if override and override.business_summary else stock.profile.source if source_summary else None,
    )
```

- [ ] **Step 4: Run migrations and verify GREEN**

Run: `cd services/api && alembic upgrade head && python -m pytest tests/test_effective_stock.py tests/test_database.py -q`

Expected: migration succeeds and all focused tests pass.

- [ ] **Step 5: Commit**

```bash
git add services/api/app services/api/alembic.ini services/api/alembic services/api/tests
git commit -m "feat: add canonical stock data model"
```

### Task 3: Stock Universe and Board Classification

**Files:**
- Create: `services/api/app/sources/base.py`
- Create: `services/api/app/sources/eastmoney.py`
- Create: `services/api/app/domain/classification.py`
- Create: `services/api/app/services/universe_sync.py`
- Create: `services/api/tests/fixtures/eastmoney_stock_list.json`
- Test: `services/api/tests/test_classification.py`
- Test: `services/api/tests/test_universe_sync.py`

**Interfaces:**
- Consumes: canonical stock models and session factory.
- Produces: `NormalizedStock`, `StockUniverseSource.fetch() -> list[NormalizedStock]`, `classify_board(exchange, symbol, source_board) -> Board`, and `UniverseSyncService.run() -> SyncResult`.

- [ ] **Step 1: Write failing classification and idempotency tests**

```python
@pytest.mark.parametrize(("exchange", "symbol", "source_board", "expected"), [
    ("SH", "600519", "沪市主板", Board.SH_MAIN),
    ("SZ", "000400", "深市主板", Board.SZ_MAIN),
    ("SZ", "300750", "创业板", Board.CHINEXT),
    ("SH", "688981", "科创板", Board.STAR),
    ("BJ", "920992", "北交所", Board.BSE),
])
def test_board_classification_uses_source_metadata(exchange, symbol, source_board, expected):
    assert classify_board(exchange, symbol, source_board) is expected


def test_repeated_universe_sync_updates_without_duplicates(session, fixture_source):
    service = UniverseSyncService(session, fixture_source)
    service.run()
    service.run()
    assert session.scalar(select(func.count()).select_from(Stock)) == 5
```

- [ ] **Step 2: Verify RED**

Run: `cd services/api && python -m pytest tests/test_classification.py tests/test_universe_sync.py -q`

Expected: FAIL because classification and sync services do not exist.

- [ ] **Step 3: Implement the adapter and transactional upsert**

The Eastmoney adapter requests paginated `clist/get` data, maps `f12`, `f14`, `f13`, `f100`, and board metadata, rejects funds/indices/B shares, and keeps the raw payload through `RawSnapshotWriter`. `UniverseSyncService` upserts by `exchange:symbol`, marks missing rows `pending_confirmation`, and never deletes manual-source stocks.

```python
class StockUniverseSource(Protocol):
    async def fetch(self) -> list[NormalizedStock]: ...


@dataclass(frozen=True)
class SyncResult:
    inserted: int
    updated: int
    unchanged: int
    pending_confirmation: int
```

- [ ] **Step 4: Verify GREEN and run an opt-in live smoke test**

Run: `cd services/api && python -m pytest tests/test_classification.py tests/test_universe_sync.py -q`

Expected: all fixture tests pass.

Run: `cd services/api && GUSHI_LIVE_TESTS=1 python -m pytest tests/live/test_eastmoney_universe.py -q`

Expected: response count is greater than 5,000 and contains one representative symbol for each board; skip with a clear reason when the endpoint is unavailable.

- [ ] **Step 5: Commit**

```bash
git add services/api/app services/api/tests
git commit -m "feat: synchronize a-share stock universe"
```

### Task 4: Sectors, Profiles, Summaries, and Quote Fallback

**Files:**
- Create: `services/api/app/sources/shenwan.py`
- Create: `services/api/app/sources/tencent.py`
- Modify: `services/api/app/sources/eastmoney.py`
- Create: `services/api/app/domain/summaries.py`
- Create: `services/api/app/services/sector_sync.py`
- Create: `services/api/app/services/profile_sync.py`
- Create: `services/api/app/services/quotes.py`
- Test: `services/api/tests/test_sector_sync.py`
- Test: `services/api/tests/test_summaries.py`
- Test: `services/api/tests/test_quotes.py`

**Interfaces:**
- Consumes: stocks and sector/profile/quote persistence models.
- Produces: `SectorSyncService`, `ProfileSyncService`, `QuoteService.get(stock_ids) -> QuoteBatch`, `summarize_profile(source_summary, introduction, manual_override) -> SummaryResult`.

- [ ] **Step 1: Write failing taxonomy, summary, and fallback tests**

```python
def test_eastmoney_industry_is_not_labeled_shenwan(normalized_sector):
    assert normalized_sector.taxonomy == "eastmoney_industry"


def test_summary_precedence_is_manual_then_source_then_excerpt():
    assert summarize_profile("source", "intro", "manual").text == "manual"
    assert summarize_profile("source", "intro", None).text == "source"
    assert summarize_profile(None, "第一句主营。第二句历史。", None).text == "第一句主营。"


async def test_quote_service_falls_back_and_marks_source(primary_failure, tencent_success):
    batch = await QuoteService(primary_failure, tencent_success, cache).get(["SH:600519"])
    assert batch.quotes[0].source == "tencent"
    assert batch.quotes[0].freshness == "fresh"
```

- [ ] **Step 2: Verify RED**

Run: `cd services/api && python -m pytest tests/test_sector_sync.py tests/test_summaries.py tests/test_quotes.py -q`

Expected: FAIL because services are missing.

- [ ] **Step 3: Implement source-specific taxonomies and quote cache**

Shenwan adapter rows use taxonomy `shenwan`; Eastmoney concepts use `eastmoney_concept`; Eastmoney industry data may be stored for diagnostics but never satisfies a Shenwan deck. The quote service uses Eastmoney first, Tencent second, batches symbols, stores only latest quotes, and returns `fresh`, `cached`, or `stale` using source/fetch timestamps.

```python
class QuoteService:
    async def get(self, stock_ids: list[str]) -> QuoteBatch:
        cached = self.cache.fresh(stock_ids, max_age_seconds=15)
        missing = [stock_id for stock_id in stock_ids if stock_id not in cached]
        if missing:
            try:
                cached.update(await self.primary.fetch_quotes(missing))
            except SourceUnavailable:
                cached.update(await self.fallback.fetch_quotes(missing))
        return self.cache.batch(stock_ids)
```

- [ ] **Step 4: Verify GREEN**

Run: `cd services/api && python -m pytest tests/test_sector_sync.py tests/test_summaries.py tests/test_quotes.py -q`

Expected: all focused tests pass with no network access.

- [ ] **Step 5: Commit**

```bash
git add services/api/app services/api/tests
git commit -m "feat: add sectors profiles and quote fallback"
```

### Task 5: Versioned Dataset Publication and CSV Round Trips

**Files:**
- Create: `services/api/app/services/publication.py`
- Create: `services/api/app/services/csv_exchange.py`
- Create: `services/api/app/services/raw_snapshots.py`
- Create: `services/api/app/schemas/imports.py`
- Test: `services/api/tests/test_publication.py`
- Test: `services/api/tests/test_csv_exchange.py`

**Interfaces:**
- Consumes: effective stock projection and normalized relations.
- Produces: `DatasetPublisher.publish() -> DatasetManifest`, `CsvExchange.preview(file, kind) -> ImportPreview`, `CsvExchange.apply(batch_id) -> ImportResult`, and gzip JSON/CSV export artifacts.

- [ ] **Step 1: Write failing atomic-publication and override round-trip tests**

```python
def test_failed_validation_does_not_replace_last_release(publisher, valid_release):
    first = publisher.publish(valid_release)
    with pytest.raises(DatasetValidationError):
        publisher.publish({"stocks": [], "sectors": [{"stock_id": "missing"}]})
    assert publisher.current_manifest().version == first.version


def test_override_csv_round_trip_preserves_manual_summary(csv_exchange, session):
    exported = csv_exchange.export("stock_overrides")
    preview = csv_exchange.preview(exported, "stock_overrides")
    csv_exchange.apply(preview.batch_id)
    assert session.get(StockOverride, "SZ:000400").business_summary == "人工主营摘要"
```

- [ ] **Step 2: Verify RED**

Run: `cd services/api && python -m pytest tests/test_publication.py tests/test_csv_exchange.py -q`

Expected: FAIL because publication and CSV exchange services do not exist.

- [ ] **Step 3: Implement manifests, checksums, previews, and transactions**

Dataset payload shape is `{version, generatedAt, stocks, sectors, memberships}`; publication writes a temporary gzip file, validates references/counts, computes SHA-256, atomically renames it, then commits `DatasetRelease`. CSV preview returns exact insert/update/unchanged/conflict/rejected counts and row errors. Apply checks the original checksum and commits in one transaction.

```python
class DatasetManifest(BaseModel):
    version: str
    generated_at: datetime
    sha256: str
    size_bytes: int
    stock_count: int
    sector_count: int
```

- [ ] **Step 4: Verify GREEN**

Run: `cd services/api && python -m pytest tests/test_publication.py tests/test_csv_exchange.py -q`

Expected: all focused tests pass, including failed-reference and duplicate-key cases.

- [ ] **Step 5: Commit**

```bash
git add services/api/app services/api/tests
git commit -m "feat: publish datasets and exchange csv data"
```

### Task 6: API Contracts, Pairing, and Generated TypeScript Client

**Files:**
- Create: `services/api/app/security.py`
- Create: `services/api/app/routes/catalog.py`
- Create: `services/api/app/routes/stocks.py`
- Create: `services/api/app/routes/sync.py`
- Create: `services/api/app/routes/quotes.py`
- Create: `services/api/app/routes/admin.py`
- Modify: `services/api/app/main.py`
- Create: `services/api/tests/test_api_contract.py`
- Create: `scripts/generate-contracts.sh`
- Create: `packages/contracts/package.json`
- Generate: `packages/contracts/src/client.ts`

**Interfaces:**
- Consumes: application services from Tasks 3-5.
- Produces: authenticated `/api/v1` routes and `@gushi/contracts` client functions `getManifest`, `downloadDataset`, `getCatalog`, `listStocks`, `getQuotes`, `triggerSync`, `previewImport`, `applyImport`, `updateStockOverride`, and `getPairingInfo`.

- [ ] **Step 1: Write failing authentication and response-shape tests**

```python
def test_mobile_api_requires_pairing_token(client):
    assert client.get("/api/v1/sync/manifest").status_code == 401
    response = client.get("/api/v1/sync/manifest", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 200
    assert set(response.json()) >= {"version", "sha256", "generatedAt"}


def test_quote_request_rejects_more_than_100_symbols(client, auth_headers):
    ids = ",".join(f"SH:{600000 + index}" for index in range(101))
    assert client.get(f"/api/v1/quotes?ids={ids}", headers=auth_headers).status_code == 422
```

- [ ] **Step 2: Verify RED**

Run: `cd services/api && python -m pytest tests/test_api_contract.py -q`

Expected: FAIL because routes/security are missing.

- [ ] **Step 3: Implement routes and generate the client**

Use constant-time bearer-token comparison, a maximum quote batch of 100, cursor pagination for stock lists, camelCase response aliases, and admin-only BFF headers. Export `/openapi.json`; generate the client with `openapi-typescript` plus a small fetch wrapper that accepts `{baseUrl, token}`.

```typescript
export type ApiConfig = { baseUrl: string; token: string };

export async function getManifest(config: ApiConfig): Promise<DatasetManifest> {
  return request(config, "/api/v1/sync/manifest");
}
```

- [ ] **Step 4: Verify GREEN and contract generation stability**

Run: `cd services/api && python -m pytest tests/test_api_contract.py -q && cd ../.. && ./scripts/generate-contracts.sh && git diff --exit-code packages/contracts/src/client.ts`

Expected: tests pass and regenerated client has no diff after it is staged once.

- [ ] **Step 5: Commit**

```bash
git add services/api packages/contracts scripts
git commit -m "feat: expose paired api contracts"
```

### Task 7: Admin Dashboard and Data Maintenance

**Files:**
- Create: `apps/admin/package.json`
- Create: `apps/admin/app/layout.tsx`
- Create: `apps/admin/app/page.tsx`
- Create: `apps/admin/app/stocks/page.tsx`
- Create: `apps/admin/app/imports/page.tsx`
- Create: `apps/admin/app/settings/page.tsx`
- Create: `apps/admin/app/api/[...path]/route.ts`
- Create: `apps/admin/app/globals.css`
- Create: `apps/admin/components/AppShell.tsx`
- Create: `apps/admin/components/StockTable.tsx`
- Create: `apps/admin/components/StockEditor.tsx`
- Create: `apps/admin/components/ImportPreview.tsx`
- Create: `apps/admin/components/PairingPanel.tsx`
- Create: `apps/admin/lib/api.ts`
- Test: `apps/admin/tests/dashboard.test.tsx`
- Test: `apps/admin/tests/stock-editor.test.tsx`

**Interfaces:**
- Consumes: `@gushi/contracts` API client.
- Produces: localhost admin pages for status, stock editing, sync, import/export, and pairing.

- [ ] **Step 1: Write failing dashboard and editor tests**

```tsx
it("shows source health and stale data without marketing copy", async () => {
  render(<Dashboard snapshot={dashboardFixture} />);
  expect(screen.getByText("5,904")).toBeVisible();
  expect(screen.getByText("腾讯行情 · 备用")).toBeVisible();
  expect(screen.getByText("2 项数据已过期")).toBeVisible();
});

it("sends only manual override fields", async () => {
  render(<StockEditor stock={stockFixture} onSave={save} />);
  await user.type(screen.getByLabelText("人工主营摘要"), "电网自动化与特高压设备");
  await user.click(screen.getByRole("button", {name: "保存修改"}));
  expect(save).toHaveBeenCalledWith({businessSummary: "电网自动化与特高压设备"});
});
```

- [ ] **Step 2: Verify RED**

Run: `npm --workspace @gushi/admin test -- --run`

Expected: FAIL because the admin application/components do not exist.

- [ ] **Step 3: Build the quiet operations UI**

Use PingFang SC/system sans for Chinese text, DIN/system tabular numerals for market values, ink blue `#173F6F`, study yellow `#D5A82E`, quote red `#C83A3A`, quote green `#21855B`, white/cool-gray surfaces, 6-8px radii, Lucide icons, keyboard focus states, and no nested cards. The table supports search, market/sector/status filters, compact rows, source/effective comparison, and a side editor. Import shows a diff before enabling Apply.

The browser calls only `/api/*`; the Next route handler injects the Docker-network API URL and token so the secret is not embedded into client JavaScript.

- [ ] **Step 4: Verify GREEN and production build**

Run: `npm --workspace @gushi/admin test -- --run && npm --workspace @gushi/admin run build`

Expected: all tests pass and Next.js production build exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/admin package.json package-lock.json
git commit -m "feat: add local stock administration console"
```

### Task 8: Mobile Database, Pairing, and Dataset Synchronization

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/src/db/migrations.ts`
- Create: `apps/mobile/src/db/repository.ts`
- Create: `apps/mobile/src/api/config.ts`
- Create: `apps/mobile/src/api/sync.ts`
- Create: `apps/mobile/src/features/settings/PairingScreen.tsx`
- Create: `apps/mobile/src/features/settings/SyncStatus.tsx`
- Test: `apps/mobile/__tests__/sync.test.ts`
- Test: `apps/mobile/__tests__/repository.test.ts`

**Interfaces:**
- Consumes: `@gushi/contracts`, manifest and gzip dataset endpoints.
- Produces: `openDatabase()`, `applyDataset(db, manifest, payload)`, `syncDataset(api, db) -> SyncOutcome`, `savePairing(config)`, and query repositories used by all screens.

- [ ] **Step 1: Write failing atomic-sync and learning-retention tests**

```typescript
it("keeps the previous dataset when checksum validation fails", async () => {
  const db = await testDatabase({manifestVersion: "v1"});
  await expect(syncDataset(apiWithBadChecksum, db)).rejects.toThrow("数据校验失败");
  expect(await db.getManifest()).toMatchObject({version: "v1"});
});

it("does not delete learning progress while replacing reference rows", async () => {
  const db = await testDatabase({progress: [{stockId: "SZ:000400", direction: "name_to_profile"}]});
  await applyDataset(db, manifestV2, datasetV2);
  expect(await db.getProgress("SZ:000400", "name_to_profile")).not.toBeNull();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm --workspace @gushi/mobile test -- --runInBand`

Expected: FAIL because database and sync modules do not exist.

- [ ] **Step 3: Implement separate reference and learning tables**

Create Expo SQLite migrations with foreign keys enabled. Apply downloaded reference rows and manifest in one transaction after SHA-256 verification. Store pairing secrets with Expo SecureStore and non-secret base URL/settings in SQLite. Configure `NSLocalNetworkUsageDescription` and the equivalent Android local-network behavior in `app.json`.

```typescript
export type SyncOutcome =
  | {kind: "up-to-date"; version: string}
  | {kind: "updated"; previousVersion: string | null; version: string; stockCount: number};
```

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace @gushi/mobile test -- --runInBand`

Expected: sync/repository tests pass, including offline, bad checksum, and rollback cases.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile package.json package-lock.json
git commit -m "feat: add mobile pairing and offline dataset sync"
```

### Task 9: Mobile Home, Catalog, Search, and Dual-Density Lists

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/index.tsx`
- Create: `apps/mobile/app/(tabs)/markets.tsx`
- Create: `apps/mobile/app/(tabs)/favorites.tsx`
- Create: `apps/mobile/app/(tabs)/settings.tsx`
- Create: `apps/mobile/app/deck/[deckId].tsx`
- Create: `apps/mobile/app/stock/[stockId].tsx`
- Create: `apps/mobile/src/features/home/HomeScreen.tsx`
- Create: `apps/mobile/src/features/catalog/MarketCatalog.tsx`
- Create: `apps/mobile/src/features/stocks/StockList.tsx`
- Create: `apps/mobile/src/features/stocks/StockRow.tsx`
- Create: `apps/mobile/src/features/stocks/StockDetail.tsx`
- Create: `apps/mobile/src/features/favorites/favoritesRepository.ts`
- Create: `apps/mobile/src/theme/tokens.ts`
- Test: `apps/mobile/__tests__/home.test.tsx`
- Test: `apps/mobile/__tests__/stock-list.test.tsx`

**Interfaces:**
- Consumes: local repositories and quote client.
- Produces: routeable App shell, `MarketCatalog`, `StockList({deckId, density})`, favorites, search, filters, and stock details.

- [ ] **Step 1: Write failing home and density tests**

```tsx
it("makes continue learning primary and exposes both catalog types", async () => {
  render(<HomeScreen snapshot={homeFixture} />);
  expect(screen.getByRole("button", {name: /继续学习/})).toBeVisible();
  expect(screen.getByText("股票市场")).toBeVisible();
  expect(screen.getByText("板块市场")).toBeVisible();
});

it("hides summaries in compact density without hiding quote signs", () => {
  render(<StockRow stock={stockFixture} density="compact" />);
  expect(screen.queryByText(stockFixture.businessSummary)).toBeNull();
  expect(screen.getByText("-2.18%")).toBeVisible();
});
```

- [ ] **Step 2: Verify RED**

Run: `npm --workspace @gushi/mobile test -- --runInBand home stock-list`

Expected: FAIL because screens/components do not exist.

- [ ] **Step 3: Implement the approved hybrid home and list UI**

Use stable list dimensions, `FlashList` or `FlatList` with estimated/fixed row heights, a segmented density control, Lucide icons, explicit stale quote labels, and buttons equivalent to swipe actions. Home shows a compact market strip, today's `18 / 40`-style progress, continue deck, and market/sector entries. Avoid viewport-scaled typography and decorative gradients.

- [ ] **Step 4: Verify GREEN and type safety**

Run: `npm --workspace @gushi/mobile test -- --runInBand && npm --workspace @gushi/mobile run typecheck`

Expected: all component tests and TypeScript checks pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile
git commit -m "feat: add mobile markets and stock browsing"
```

### Task 10: Study Sessions, FSRS, Checkpoints, Undo, and Statistics

**Files:**
- Create: `apps/mobile/app/study/[deckId].tsx`
- Create: `apps/mobile/src/features/study/session.ts`
- Create: `apps/mobile/src/features/study/progressRepository.ts`
- Create: `apps/mobile/src/features/study/fsrsScheduler.ts`
- Create: `apps/mobile/src/features/study/StudyScreen.tsx`
- Create: `apps/mobile/src/features/study/StockCard.tsx`
- Create: `apps/mobile/src/features/study/RevealAnswer.tsx`
- Create: `apps/mobile/src/features/study/StudySummary.tsx`
- Test: `apps/mobile/__tests__/study-session.test.ts`
- Test: `apps/mobile/__tests__/study-screen.test.tsx`

**Interfaces:**
- Consumes: deck stock queries, SQLite repository, and `ts-fsrs`.
- Produces: `createSequentialSession`, `createReviewSession`, `rateCard`, `undoLastRating`, `resumeCheckpoint`, and the complete study route.

- [ ] **Step 1: Write failing checkpoint, direction, and undo tests**

```typescript
it("resumes a sequential deck by stock id after membership order changes", async () => {
  await repository.saveCheckpoint("sector:shenwan:801120", "SZ:000400");
  const session = await createSequentialSession([stockA, stockInserted, stockXj], repository);
  expect(session.current.stockId).toBe("SZ:000400");
});

it("stores name-to-profile and code-to-name progress independently", async () => {
  await rateCard(stock, "name_to_profile", "good", now);
  expect(await repository.getProgress(stock.id, "code_to_name")).toBeNull();
});

it("undo restores both FSRS state and checkpoint", async () => {
  const before = await repository.snapshot();
  await rateCard(stock, "name_to_profile", "again", now);
  await undoLastRating();
  expect(await repository.snapshot()).toEqual(before);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm --workspace @gushi/mobile test -- --runInBand study`

Expected: FAIL because session and progress services do not exist.

- [ ] **Step 3: Implement deterministic session transitions**

Map left/button `Not familiar` to FSRS `Again` and right/button `Remembered` to `Good`. Disable rating until answer reveal. Persist the study event, FSRS state, statistics, and checkpoint in one SQLite transaction. Undo consumes the latest reversible event in the current session and restores the stored before-state.

```typescript
export type PromptDirection = "name_to_profile" | "code_to_name";
export type BinaryRating = "again" | "good";

export async function rateCard(
  stock: StudyStock,
  direction: PromptDirection,
  rating: BinaryRating,
  now: Date,
): Promise<CardProgress> {
  const fsrsRating = rating === "again" ? Rating.Again : Rating.Good;
  return progressRepository.applyFsrsRating(stock.id, direction, fsrsRating, now);
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm --workspace @gushi/mobile test -- --runInBand study && npm --workspace @gushi/mobile run typecheck`

Expected: all session/state/rendering tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile
git commit -m "feat: add stock memory study sessions"
```

### Task 11: Docker Runtime, Worker Schedule, and Operations

**Files:**
- Create: `services/api/Dockerfile`
- Create: `apps/admin/Dockerfile`
- Create: `infra/docker-compose.yml`
- Create: `services/api/app/worker.py`
- Create: `services/api/app/services/schedule.py`
- Create: `scripts/smoke-local.sh`
- Create: `docs/operations.md`
- Test: `services/api/tests/test_schedule.py`

**Interfaces:**
- Consumes: sync/profile/sector/publication services and application settings.
- Produces: `docker compose up --build`, deterministic schedules, persisted `/data`, admin at `http://localhost:3000`, and API on LAN port `8000`.

- [ ] **Step 1: Write failing schedule tests**

```python
def test_default_schedule_uses_shanghai_timezone():
    schedule = build_schedule(Settings())
    assert schedule.timezone.key == "Asia/Shanghai"
    assert schedule.job("universe_sync").cron == "0 8 * * 1-5"
    assert schedule.job("sector_sync").cron == "30 16 * * 1-5"
    assert schedule.job("profile_sync").cron == "0 3 * * 0"
```

- [ ] **Step 2: Verify RED**

Run: `cd services/api && python -m pytest tests/test_schedule.py -q`

Expected: FAIL because schedule/runtime modules do not exist.

- [ ] **Step 3: Implement the local runtime and operator guide**

Run one API process and one worker process against SQLite WAL. Bind admin to `127.0.0.1:3000`; bind API to `0.0.0.0:8000`; mount `../data:/data`; add health checks and dependency ordering. Generate a pairing token on first startup and persist it in the data volume. Document startup, first sync, pairing, CSV import/export, backups, restore, stale quotes, and source failures.

- [ ] **Step 4: Verify GREEN and container health**

Run: `cd services/api && python -m pytest tests/test_schedule.py -q && cd ../.. && docker compose -f infra/docker-compose.yml config && docker compose -f infra/docker-compose.yml up --build -d && ./scripts/smoke-local.sh`

Expected: schedule tests pass, Compose validates, all health checks become healthy, admin returns HTTP 200, API health returns `{"status":"ok","service":"gushi-api"}`.

- [ ] **Step 5: Commit**

```bash
git add services/api apps/admin infra scripts docs/operations.md
git commit -m "chore: add local docker runtime and operations"
```

### Task 12: End-to-End Browser and iOS Verification

**Files:**
- Create: `apps/admin/tests/e2e/admin.spec.ts`
- Create: `apps/mobile/.maestro/primary-flow.yaml`
- Create: `scripts/verify-all.sh`
- Modify: `docs/operations.md`

**Interfaces:**
- Consumes: the complete local stack and seeded fixture/live dataset.
- Produces: repeatable release verification for admin, API, iOS resume behavior, and Android type/build compatibility.

- [ ] **Step 1: Write failing E2E specifications**

```typescript
test("manual summary survives synchronization", async ({page}) => {
  await page.goto("/stocks?query=000400");
  await page.getByRole("button", {name: "编辑许继电气"}).click();
  await page.getByLabel("人工主营摘要").fill("电网自动化与特高压设备");
  await page.getByRole("button", {name: "保存修改"}).click();
  await page.getByRole("button", {name: "同步单只股票"}).click();
  await expect(page.getByText("电网自动化与特高压设备")).toBeVisible();
});
```

```yaml
# apps/mobile/.maestro/primary-flow.yaml
appId: com.gushi.mobile
---
- launchApp:
    clearState: true
- tapOn: "股票市场"
- tapOn: "深市主板"
- tapOn: "开始顺序学习"
- tapOn: "查看答案"
- tapOn: "记住了"
- stopApp
- launchApp
- assertVisible: "继续学习"
```

- [ ] **Step 2: Run E2E tests and verify RED**

Run: `npm --workspace @gushi/admin run test:e2e`

Expected: FAIL until the real stack, selectors, and seeded data are wired end to end.

- [ ] **Step 3: Wire deterministic seed and verification commands**

Add a test-only seed command that loads captured source fixtures through the same normalization services as production. `scripts/verify-all.sh` must run API tests, admin tests/build, mobile tests/typecheck, Compose smoke, Playwright, and an Android Expo prebuild check. Keep live-source smoke separate and opt-in.

- [ ] **Step 4: Run full verification and visual QA**

Run: `./scripts/verify-all.sh`

Expected: every suite exits 0 with no failed tests.

Run the admin Playwright suite at desktop `1440x900` and mobile `390x844` viewports, capture screenshots, and verify no overflow or overlap. Run the Maestro flow on an iOS simulator, terminate/relaunch, and verify the displayed checkpoint matches the stored stock ID. Run `npx expo export --platform android` to confirm shared Android compatibility.

- [ ] **Step 5: Commit**

```bash
git add apps/admin apps/mobile scripts docs/operations.md
git commit -m "test: verify complete stock learning workflow"
```

## Final Release Gate

- [ ] Run `./scripts/verify-all.sh` from a clean checkout.
- [ ] Run opt-in live source checks and record source counts/timestamps without treating them as deterministic tests.
- [ ] Run one real full-universe sync and confirm all five board groups are non-empty.
- [ ] Confirm Shenwan decks are sourced from taxonomy `shenwan`, never `eastmoney_industry`.
- [ ] Export all CSV artifacts, import them into a fresh database, and compare canonical counts/checksums.
- [ ] Disconnect the Mac, relaunch the App, and complete a study session using cached data.
- [ ] Reconnect, refresh visible quotes, and confirm quote source time/freshness appears.
- [ ] Review screenshots for desktop admin and iOS App, including long Chinese stock/sector names and large prices.
- [ ] Check `git status --short` and ensure no data files, tokens, raw snapshots, screenshots, or build outputs are staged.
