import type {SqlDatabase} from "./repository";

const SCHEMA_VERSION = 1;

const INITIAL_SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS dataset_manifest (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version TEXT NOT NULL,
    generated_at TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    stock_count INTEGER NOT NULL,
    sector_count INTEGER NOT NULL,
    applied_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stocks (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    board TEXT NOT NULL,
    business_summary TEXT,
    business_summary_source TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_stocks_name ON stocks(name);
  CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
  CREATE INDEX IF NOT EXISTS idx_stocks_board ON stocks(board);

  CREATE TABLE IF NOT EXISTS sectors (
    id TEXT PRIMARY KEY,
    taxonomy TEXT NOT NULL,
    name TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sectors_taxonomy_name ON sectors(taxonomy, name);

  CREATE TABLE IF NOT EXISTS stock_sectors (
    stock_id TEXT NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    sector_id TEXT NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
    PRIMARY KEY (stock_id, sector_id)
  );
  CREATE INDEX IF NOT EXISTS idx_stock_sectors_sector ON stock_sectors(sector_id, stock_id);

  CREATE TABLE IF NOT EXISTS latest_quotes (
    stock_id TEXT PRIMARY KEY,
    price REAL NOT NULL,
    change_percent REAL NOT NULL,
    source TEXT NOT NULL,
    source_time TEXT NOT NULL,
    freshness TEXT NOT NULL,
    fetched_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS card_progress (
    stock_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    state_json TEXT NOT NULL,
    due_at TEXT,
    repetitions INTEGER NOT NULL DEFAULT 0,
    last_rating TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (stock_id, direction)
  );
  CREATE INDEX IF NOT EXISTS idx_card_progress_due ON card_progress(direction, due_at);

  CREATE TABLE IF NOT EXISTS deck_checkpoints (
    deck_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    last_stock_id TEXT,
    ordering_seed INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (deck_id, mode)
  );

  CREATE TABLE IF NOT EXISTS study_events (
    id TEXT PRIMARY KEY,
    stock_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    deck_id TEXT NOT NULL,
    rating TEXT NOT NULL,
    previous_state_json TEXT,
    resulting_state_json TEXT NOT NULL,
    studied_at TEXT NOT NULL,
    undone_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_study_events_time ON study_events(studied_at);

  CREATE TABLE IF NOT EXISTS favorites (
    stock_id TEXT PRIMARY KEY,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  PRAGMA user_version = ${SCHEMA_VERSION};
`;

export async function runMigrations(db: SqlDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  const row = await db.getFirstAsync<{user_version: number}>("PRAGMA user_version");
  if ((row?.user_version ?? 0) < SCHEMA_VERSION) {
    await db.execAsync(INITIAL_SCHEMA);
  }
}
