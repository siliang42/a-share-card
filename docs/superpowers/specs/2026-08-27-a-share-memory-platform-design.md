# A-Share Memory Platform Design

**Date:** 2026-08-27

**Status:** Approved product design

**Working name:** 股识

## 1. Goal

Build a single-user, local-first A-share learning system that helps a learner remember stock names, codes, market boards, sectors, current prices, and concise business descriptions.

The first release contains three running parts:

1. A React Native application built with Expo, released first for iOS and kept compatible with Android.
2. A local Web administration application for data synchronization, editing, import, export, and diagnostics.
3. A local API and synchronization service running on the user's Mac through Docker Compose.

The App must continue to support card study and list browsing when the Mac is offline. Live quotes and dataset updates require the App to reach the Mac on the same LAN.

## 2. First-Release Scope

### 2.1 Included markets

The stock universe contains active and historically retained A-share securities from:

- Shanghai Main Board
- Shenzhen Main Board
- ChiNext
- STAR Market
- Beijing Stock Exchange

Board classification is taken from source exchange/board metadata. Code-prefix rules are validation fallbacks only, because prefixes and listing rules can change.

### 2.2 Learning catalog

The catalog has two top-level collections:

- **Stock markets:** Shanghai Main Board, Shenzhen Main Board, ChiNext, STAR Market, and Beijing Stock Exchange.
- **Sector markets:** Shenwan industries and popular concept sectors.

A stock can belong to many sectors. A deck is a query over the current stock and sector data, not a copied list. Sequential checkpoints are stored by stable stock ID so a dataset update does not shift the learner to the wrong stock.

### 2.3 Explicit exclusions

The first release does not include:

- User registration, login, multiple users, or cloud progress synchronization
- A browser-based learning client
- Trading, simulated trading, recommendations, or buy/sell signals
- Intraday charting, K-line history, or a tick-history warehouse
- Paid market data or a promise of exchange-authorized real-time quotes
- App Store or Google Play submission work

## 3. Product Experience

### 3.1 Navigation

The App has four primary tabs:

- **Today:** compact market summary, today's goal, continue-learning action, and the two catalog entries.
- **Markets:** stock-market decks, Shenwan industry decks, concept decks, search, and filtering.
- **Favorites:** a watchlist-style stock list, personal notes, and a quick-review entry.
- **Settings:** local server pairing, dataset synchronization, backup/restore, study target, and quote-source disclosure.

The home page follows the approved hybrid direction: learning is the primary action, while a small market strip and direct market-browsing entrances remain visible.

### 3.2 Card study

The default prompt shows the stock name and sector clues. The learner recalls the code and main business, then taps the card to reveal:

- Stock code and exchange
- Current or last cached price with quote time
- Market board
- Concise main-business summary
- Industry and concept tags

An always-available concealment control switches to code-to-name prompts. Progress is stored separately for each prompt direction because recalling a code from a name is not the same memory task as recalling a name from a code.

Gestures and commands are:

- Tap: reveal the answer
- Swipe left: "Not familiar," mapped to FSRS `Again`
- Swipe right: "Remembered," mapped to FSRS `Good`
- Undo icon: revert the most recent rating in the current session

The interface also provides accessible buttons for all gestures. It does not rely on red/green color alone.

### 3.3 Study modes and progress

Two modes coexist:

- **Sequential:** uses the selected deck's stable checkpoint and resumes from the last stock on the next launch.
- **Smart review:** schedules due cards with a maintained FSRS library rather than a custom scheduling algorithm.

Ratings update a global memory record keyed by stock and prompt direction. Learning a stock through an industry deck therefore also improves its status in the board deck. Checkpoints remain deck-specific.

The default daily target is 40 cards and can be set from 10 to 200. The Today screen reports newly studied, reviewed, mastered, due, and consecutive-study-day counts.

### 3.4 Fast list browsing

The approved list has two density modes:

- **Detail:** name, code, current price, percentage change, market board, primary sector, concise business summary, and memory status.
- **Compact:** a Tonghuashun-inspired dense list emphasizing name/code and price/change.

The list supports vertical scrolling, search by name/code, board and sector filters, favorites, and a stock detail view. Chinese market convention is used for rise/fall colors, with signs and labels retained for accessibility.

## 4. System Architecture

### 4.1 Repository structure

The implementation will use a mixed-language monorepo:

```text
apps/
  mobile/              Expo React Native application
  admin/               Next.js administration application
services/
  api/                 FastAPI API and source adapters
  worker/              Scheduled and manually triggered synchronization jobs
packages/
  contracts/           Generated TypeScript client and shared API schemas
infra/
  docker-compose.yml   Local Mac runtime
data/                  Runtime database, snapshots, imports, and exports
```

FastAPI is the contract authority. Its OpenAPI document generates the TypeScript client used by the App and admin application, preventing manually duplicated request/response types.

### 4.2 Runtime boundaries

Docker Compose runs the API, synchronization worker, admin application, and persistent data volume on the Mac.

- The admin site binds to localhost and reaches the API through a server-side proxy.
- The mobile API binds to the LAN and requires a generated pairing token even though the product has no user accounts.
- The admin displays a pairing QR code containing the LAN URL and token.
- The iOS application declares local-network usage and the narrow development/local HTTP allowance required for the paired host. Android compatibility includes the equivalent local cleartext-network configuration.
- Tokens and machine-specific URLs are excluded from source control and exports unless the user explicitly includes connection settings.

The mobile application never calls third-party market-data endpoints directly. Source changes and rate-limit handling stay inside server adapters.

### 4.3 Mobile synchronization

The service publishes a new immutable dataset version only after validation succeeds. The App compares a manifest, downloads a gzip-compressed JSON dataset when the version changes, verifies its checksum, and applies all upserts in a local SQLite transaction.

The dataset contains stock identity, effective display fields, market/sector relationships, and company profiles. Quotes use a separate endpoint and are never part of the versioned reference dataset.

If synchronization fails, the App keeps its previous version. If the Mac is unavailable, card study, list browsing, favorites, notes, and progress remain usable.

## 5. Data Sources and Provenance

### 5.1 Source strategy

No free public endpoint is treated as a guaranteed service. Every adapter records its source name, source timestamp, fetch timestamp, raw response location, and parser version.

The intended source order is:

1. Public Shanghai, Shenzhen, and Beijing exchange files for security identity and listing status where practical.
2. Public Shenwan index data, accessed through a dedicated adapter, for Shenwan industry definitions and constituents.
3. Eastmoney public endpoints for broad-universe cross-checks, concept sectors, company profiles, and primary quotes.
4. Tencent public quotes as a quote fallback.
5. Validated local CSV imports when an upstream field is unavailable or temporarily broken.

Live probes on 2026-08-27 confirmed that the Eastmoney stock-list endpoint returned 5,904 records with code, name, price, percentage change, and an industry field; its board endpoint returned 496 categories; its F10 company endpoint returned exchange, industry, company introduction, and business details. Tencent returned current quote payloads for tested Shanghai and Shenzhen symbols. These observations prove current technical availability, not future reliability or data licensing for redistribution.

Eastmoney's industry field is not presented as Shenwan classification. Shenwan decks use the Shenwan adapter or an explicitly labeled manual CSV fallback. The UI always labels sector taxonomy and quote timestamps.

### 5.2 Quote behavior

During trading hours, the App requests quotes only for currently visible stocks, at most once every 15 seconds. The API batches symbols, caches responses, enforces source-specific rate limits, and switches to the fallback adapter when appropriate.

Only the latest quote per stock is stored. A quote includes source time, fetch time, source, and freshness status. When refreshing fails, the latest value remains visible with a cached/stale label. The interface includes "Public data for learning; not investment advice."

### 5.3 Business summaries

The system stores both source text and a concise display summary. Summary precedence is:

1. Manual override maintained in the admin application
2. A concise source-provided business field
3. A deterministic excerpt from the company introduction, clearly marked as generated

The first release does not require an LLM or silently fabricate business descriptions. Editors can compare the effective summary with its source text and provenance.

## 6. Server Data Model

SQLite runs in WAL mode with Alembic migrations. One synchronization worker owns scheduled source writes; API writes remain transactional.

Core entities are:

- `stocks`: stable identity, exchange, symbol, board, status, list dates, and source timestamps
- `stock_source_values`: source-specific normalized values and provenance
- `stock_overrides`: manual name, business summary, tags, and notes; these win during effective-view projection
- `sectors`: taxonomy, source code, name, status, and source version
- `stock_sectors`: many-to-many memberships with source and effective dates
- `company_profiles`: source business text, company introduction, normalized summary, and provenance
- `latest_quotes`: current price/change values, source time, fetch time, and freshness
- `sync_runs`: job status, counts, source, parser version, errors, and published dataset version
- `import_batches`: file checksum, validation result, preview summary, commit result, and rejected rows

Missing source records are first marked for confirmation. Delisted or inactive stocks are retained rather than deleted so study history remains referentially valid.

## 7. Mobile Data Model

The App uses Expo SQLite for the synchronized dataset and device-owned learning state:

- `dataset_manifest`: version, checksum, applied time
- Local projections of stocks, sectors, memberships, profiles, and latest cached quotes
- `card_progress`: stock ID, prompt direction, FSRS state, due date, repetitions, and last rating
- `deck_checkpoints`: deck identity, study mode, last stock ID, and ordering seed
- `study_events`: append-only ratings used for statistics and undo
- `favorites`: stock ID, personal note, and timestamps
- `settings`: daily target, display mode, concealment mode, and paired-server configuration

Learning data is never overwritten by a reference-data synchronization.

## 8. CSV Import, Export, and Backups

CSV is an interoperability format, not the canonical relational store. Exports use UTF-8 with stable English headers and include:

- `stocks.csv`: effective read-only stock view
- `sectors.csv`: sector catalog
- `stock_sectors.csv`: memberships
- `stock_overrides.csv`: editable enrichment and overrides
- `manual_stocks.csv`: validated supplementary securities owned by the local source
- `learning_backup.csv`: card state and deck checkpoints exported from the App

Imports follow a preview-then-apply workflow:

1. Validate encoding, headers, unique keys, required fields, references, and row limits.
2. Show inserts, updates, unchanged rows, conflicts, and rejected rows.
3. Apply accepted changes in one transaction.
4. Retain the import checksum and result report.

An upstream synchronization updates source values but never overwrites manual overrides or manual-source records. "Write back" means writing to this local canonical store and its export files; the product does not attempt to modify third-party sources.

Raw third-party responses are stored as date-partitioned compressed JSONL snapshots for diagnosis. Retention is configurable, with 30 days as the default.

## 9. Update Schedule and Failure Handling

Default schedules are:

- Security universe: daily before market open and on demand
- Shenwan and concept membership: daily after market close and on demand
- Company profiles: weekly incremental refresh and single-stock force refresh
- Quotes: on-demand batches from visible App rows/cards, no faster than every 15 seconds

A sync run writes into a staging scope, validates counts, identities, required fields, and membership references, then atomically publishes a dataset version. A partially failed run never replaces the last good version.

The admin dashboard shows last success, last attempt, duration, record counts, source health, stale data, and parser errors. Invalid CSV rows produce a downloadable error report. Sudden large removals or category-count changes require explicit confirmation.

## 10. Administration Application

The Web admin provides:

- Dashboard with dataset version, stock/sector counts, source health, stale-data alerts, and recent sync runs
- Stock table with search, market/sector/status filters, source/effective value comparison, and single-stock editing
- Sector catalog and constituent maintenance
- Manual summary, tags, notes, and supplementary-stock editing
- Full, incremental, and single-stock synchronization controls
- CSV import validation, change preview, application, error download, and export
- Raw-source provenance and job diagnostics
- Pairing QR code and connection diagnostics for the App

Destructive bulk operations require confirmation and show exact affected counts.

## 11. Visual Direction

The visual system is a quiet learning tool rather than a trading terminal or marketing page.

- Primary ink blue anchors navigation and study controls.
- Warm yellow marks learning progress and pending review.
- Red and green follow Chinese quote convention, always paired with signs/text.
- Surfaces remain mostly white and cool gray so market colors retain meaning.
- Data uses a compact utility type style; stock names receive stronger display weight.
- Cards use restrained radii and one clear layer. Pages do not stack decorative cards inside cards.

The signature interaction is the reveal transition: the concealed code/business area opens like a study answer sheet, after which the rating controls become active. Motion respects reduced-motion settings.

## 12. Verification Strategy

### 12.1 API and data service

Pytest covers board classification, source normalization, override precedence, sector memberships, quote freshness, dataset publication, CSV round trips, rejected rows, and migration behavior. Adapter tests use captured fixtures; opt-in live smoke tests confirm current endpoint compatibility without making the normal test suite network-dependent.

### 12.2 Admin application

Component tests cover tables, forms, diff previews, and failure states. Playwright tests run the real local stack through synchronization status, stock editing, CSV preview/apply, export, and pairing flows.

### 12.3 Mobile application

Unit and React Native Testing Library tests cover study-session transitions, rating mapping, undo, checkpoints, statistics, concealment modes, and offline sync behavior. Maestro or an equivalent simulator-level suite verifies the iOS path from selecting a deck through studying, terminating, reopening, and resuming at the correct checkpoint.

Android is not a first-release delivery target, but CI must keep the Android project buildable and shared behavior covered.

### 12.4 Acceptance criteria

The release is acceptable when:

- All five A-share board groups can be synchronized, browsed, searched, and studied.
- Shenwan industry and popular concept decks show labeled membership data and independent checkpoints.
- The default card shows name first and reveals code, business summary, price, and sectors.
- Sequential mode resumes after a process restart; smart review schedules and restores due cards.
- Detail and compact lists both work with current or clearly stale prices.
- A source outage leaves the last good dataset and cached quotes usable.
- An admin edit survives later upstream synchronization.
- CSV preview rejects invalid relationships and a valid export/import round trip preserves data.
- The local stack starts from documented Docker Compose commands and the iOS simulator completes the primary learning flow.

## 13. Delivery Sequence

Implementation is divided into independently verifiable milestones:

1. Data schema, source adapters, normalization, CSV workflows, and API contracts
2. Admin dashboard and maintenance workflows
3. Mobile dataset sync, market catalog, and fast list browsing
4. Card sessions, FSRS progress, checkpoints, statistics, and offline behavior
5. Real quote refresh, fallback handling, pairing, integrated testing, and operator documentation
