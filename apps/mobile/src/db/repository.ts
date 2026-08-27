import type {DatasetManifest} from "@gushi/contracts";
import {openDatabaseAsync} from "expo-sqlite";

import {runMigrations} from "./migrations";

export type SqlRunResult = {changes: number; lastInsertRowId: number};

export type SqlStatement = {
  executeAsync: (...params: unknown[]) => Promise<SqlRunResult>;
  finalizeAsync: () => Promise<unknown>;
};

export type SqlDatabase = {
  execAsync: (source: string) => Promise<void>;
  runAsync: (source: string, ...params: unknown[]) => Promise<SqlRunResult>;
  getFirstAsync: <T>(source: string, ...params: unknown[]) => Promise<T | null>;
  getAllAsync: <T>(source: string, ...params: unknown[]) => Promise<T[]>;
  prepareAsync: (source: string) => Promise<SqlStatement>;
  withTransactionAsync: (task: () => Promise<void>) => Promise<void>;
};

export type LocalManifest = DatasetManifest & {appliedAt: string};

export type ProgressRecord = {
  stockId: string;
  direction: string;
  stateJson: string;
  dueAt: string | null;
  repetitions: number;
  lastRating: string | null;
  updatedAt: string;
};

export type StockRecord = {
  id: string;
  symbol: string;
  name: string;
  board: string;
  businessSummary: string | null;
  businessSummarySource: string | null;
};

export type CatalogDeck = {
  id: string;
  name: string;
  taxonomy: "market" | string;
  stockCount: number;
};

export type LocalCatalog = {markets: CatalogDeck[]; sectors: CatalogDeck[]};

export type LocalQuote = {
  stockId: string;
  price: number;
  changePercent: number;
  source: string;
  sourceTime: string;
  freshness: string;
  fetchedAt: string;
};

export type BrowseStockRecord = StockRecord & {
  primarySector: string | null;
  sectorNames: string[];
  quote: LocalQuote | null;
  isFavorite: boolean;
  memoryStatus: string;
};

const MARKET_DECKS = [
  {board: "SH_MAIN", name: "沪市主板"},
  {board: "SZ_MAIN", name: "深市主板"},
  {board: "CHINEXT", name: "创业板"},
  {board: "STAR", name: "科创板"},
  {board: "BSE", name: "北交所"},
] as const;

export async function openDatabase(name = "gushi.db"): Promise<SqlDatabase> {
  const database = await openDatabaseAsync(name);
  const db = database as unknown as SqlDatabase;
  await runMigrations(db);
  return db;
}

export class StockRepository {
  constructor(public readonly db: SqlDatabase) {}

  async getManifest(): Promise<LocalManifest | null> {
    const row = await this.db.getFirstAsync<{
      version: string;
      generated_at: string;
      sha256: string;
      size_bytes: number;
      stock_count: number;
      sector_count: number;
      applied_at: string;
    }>("SELECT * FROM dataset_manifest WHERE id = 1");
    return row ? {
      version: row.version,
      generatedAt: row.generated_at,
      sha256: row.sha256,
      sizeBytes: row.size_bytes,
      stockCount: row.stock_count,
      sectorCount: row.sector_count,
      appliedAt: row.applied_at,
    } : null;
  }

  async saveManifest(manifest: DatasetManifest, appliedAt = new Date().toISOString()): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO dataset_manifest
        (id, version, generated_at, sha256, size_bytes, stock_count, sector_count, applied_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        version = excluded.version,
        generated_at = excluded.generated_at,
        sha256 = excluded.sha256,
        size_bytes = excluded.size_bytes,
        stock_count = excluded.stock_count,
        sector_count = excluded.sector_count,
        applied_at = excluded.applied_at`,
      manifest.version,
      manifest.generatedAt,
      manifest.sha256,
      manifest.sizeBytes,
      manifest.stockCount,
      manifest.sectorCount,
      appliedAt,
    );
  }

  async getStock(stockId: string): Promise<StockRecord | null> {
    const row = await this.db.getFirstAsync<{
      id: string;
      symbol: string;
      name: string;
      board: string;
      business_summary: string | null;
      business_summary_source: string | null;
    }>("SELECT * FROM stocks WHERE id = ?", stockId);
    return row ? {
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      board: row.board,
      businessSummary: row.business_summary,
      businessSummarySource: row.business_summary_source,
    } : null;
  }

  async getCatalog(): Promise<LocalCatalog> {
    const marketRows = await this.db.getAllAsync<{board: string; stock_count: number}>(
      "SELECT UPPER(board) AS board, COUNT(*) AS stock_count FROM stocks GROUP BY UPPER(board)",
    );
    const marketCounts = new Map(marketRows.map((row) => [row.board, row.stock_count]));
    const sectors = await this.db.getAllAsync<{
      id: string;
      taxonomy: string;
      name: string;
      stock_count: number;
    }>(
      `SELECT sectors.id, sectors.taxonomy, sectors.name, COUNT(stock_sectors.stock_id) AS stock_count
       FROM sectors
       LEFT JOIN stock_sectors ON stock_sectors.sector_id = sectors.id
       GROUP BY sectors.id, sectors.taxonomy, sectors.name
       ORDER BY sectors.taxonomy, sectors.name`,
    );
    return {
      markets: MARKET_DECKS.map(({board, name}) => ({
        id: `market:${board.toLowerCase()}`,
        name,
        taxonomy: "market",
        stockCount: marketCounts.get(board) ?? 0,
      })),
      sectors: sectors.map((row) => ({
        id: `sector:${row.id}`,
        name: row.name,
        taxonomy: row.taxonomy,
        stockCount: row.stock_count,
      })),
    };
  }

  async listStocks(options: {
    deckId?: string;
    query?: string;
    favoritesOnly?: boolean;
    stockId?: string;
  } = {}): Promise<BrowseStockRecord[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (options.stockId) {
      where.push("stocks.id = ?");
      params.push(options.stockId);
    }
    if (options.deckId?.startsWith("market:") && options.deckId !== "market:all") {
      where.push("UPPER(stocks.board) = ?");
      params.push(options.deckId.slice("market:".length).toUpperCase());
    }
    if (options.deckId?.startsWith("sector:")) {
      where.push("EXISTS (SELECT 1 FROM stock_sectors filter_membership WHERE filter_membership.stock_id = stocks.id AND filter_membership.sector_id = ?)");
      params.push(options.deckId.slice("sector:".length));
    }
    if (options.query?.trim()) {
      where.push("(stocks.name LIKE ? OR stocks.symbol LIKE ?)");
      const query = `%${options.query.trim()}%`;
      params.push(query, query);
    }
    if (options.favoritesOnly) where.push("favorites.stock_id IS NOT NULL");
    const rows = await this.db.getAllAsync<{
      id: string;
      symbol: string;
      name: string;
      board: string;
      business_summary: string | null;
      business_summary_source: string | null;
      sector_names: string | null;
      price: number | null;
      change_percent: number | null;
      quote_source: string | null;
      source_time: string | null;
      freshness: string | null;
      fetched_at: string | null;
      favorite_id: string | null;
      repetitions: number | null;
      due_at: string | null;
    }>(
      `SELECT stocks.*,
        (SELECT GROUP_CONCAT(sectors.name, '|')
          FROM stock_sectors
          JOIN sectors ON sectors.id = stock_sectors.sector_id
          WHERE stock_sectors.stock_id = stocks.id
          ORDER BY CASE sectors.taxonomy WHEN 'shenwan' THEN 0 ELSE 1 END, sectors.name) AS sector_names,
        latest_quotes.price, latest_quotes.change_percent, latest_quotes.source AS quote_source,
        latest_quotes.source_time, latest_quotes.freshness, latest_quotes.fetched_at,
        favorites.stock_id AS favorite_id,
        progress.repetitions, progress.due_at
       FROM stocks
       LEFT JOIN latest_quotes ON latest_quotes.stock_id = stocks.id
       LEFT JOIN favorites ON favorites.stock_id = stocks.id
       LEFT JOIN card_progress progress ON progress.stock_id = stocks.id AND progress.direction = 'name_to_profile'
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY stocks.symbol, stocks.id`,
      ...params,
    );
    const now = Date.now();
    return rows.map((row) => {
      const sectorNames = row.sector_names?.split("|").filter(Boolean) ?? [];
      const quote = row.price === null || row.change_percent === null || !row.quote_source
        || !row.source_time || !row.freshness || !row.fetched_at
        ? null
        : {
          stockId: row.id,
          price: Number(row.price),
          changePercent: Number(row.change_percent),
          source: row.quote_source,
          sourceTime: row.source_time,
          freshness: row.freshness,
          fetchedAt: row.fetched_at,
        };
      return {
        id: row.id,
        symbol: row.symbol,
        name: row.name,
        board: row.board,
        businessSummary: row.business_summary,
        businessSummarySource: row.business_summary_source,
        primarySector: sectorNames[0] ?? null,
        sectorNames,
        quote,
        isFavorite: Boolean(row.favorite_id),
        memoryStatus: !row.repetitions
          ? "未学习"
          : row.due_at && Date.parse(row.due_at) <= now ? "待复习" : "学习中",
      };
    });
  }

  async upsertQuotes(quotes: Array<Omit<LocalQuote, "fetchedAt">>, fetchedAt: string): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      const statement = await this.db.prepareAsync(
        `INSERT INTO latest_quotes
          (stock_id, price, change_percent, source, source_time, freshness, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(stock_id) DO UPDATE SET
          price = excluded.price, change_percent = excluded.change_percent,
          source = excluded.source, source_time = excluded.source_time,
          freshness = excluded.freshness, fetched_at = excluded.fetched_at`,
      );
      try {
        for (const quote of quotes) {
          await statement.executeAsync(
            quote.stockId,
            quote.price,
            quote.changePercent,
            quote.source,
            quote.sourceTime,
            quote.freshness,
            fetchedAt,
          );
        }
      } finally {
        await statement.finalizeAsync();
      }
    });
  }

  async getQuotes(stockIds: string[]): Promise<LocalQuote[]> {
    if (!stockIds.length) return [];
    const placeholders = stockIds.map(() => "?").join(", ");
    const rows = await this.db.getAllAsync<{
      stock_id: string;
      price: number;
      change_percent: number;
      source: string;
      source_time: string;
      freshness: string;
      fetched_at: string;
    }>(`SELECT * FROM latest_quotes WHERE stock_id IN (${placeholders})`, ...stockIds);
    return rows.map((row) => ({
      stockId: row.stock_id,
      price: Number(row.price),
      changePercent: Number(row.change_percent),
      source: row.source,
      sourceTime: row.source_time,
      freshness: row.freshness,
      fetchedAt: row.fetched_at,
    }));
  }

  async saveProgress(progress: {
    stockId: string;
    direction: string;
    stateJson: string;
    dueAt?: string | null;
    repetitions?: number;
    lastRating?: string | null;
  }): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO card_progress
        (stock_id, direction, state_json, due_at, repetitions, last_rating, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(stock_id, direction) DO UPDATE SET
        state_json = excluded.state_json,
        due_at = excluded.due_at,
        repetitions = excluded.repetitions,
        last_rating = excluded.last_rating,
        updated_at = excluded.updated_at`,
      progress.stockId,
      progress.direction,
      progress.stateJson,
      progress.dueAt ?? null,
      progress.repetitions ?? 0,
      progress.lastRating ?? null,
      new Date().toISOString(),
    );
  }

  async getProgress(stockId: string, direction: string): Promise<ProgressRecord | null> {
    const row = await this.db.getFirstAsync<{
      stock_id: string;
      direction: string;
      state_json: string;
      due_at: string | null;
      repetitions: number;
      last_rating: string | null;
      updated_at: string;
    }>("SELECT * FROM card_progress WHERE stock_id = ? AND direction = ?", stockId, direction);
    return row ? {
      stockId: row.stock_id,
      direction: row.direction,
      stateJson: row.state_json,
      dueAt: row.due_at,
      repetitions: row.repetitions,
      lastRating: row.last_rating,
      updatedAt: row.updated_at,
    } : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      key,
      value,
      new Date().toISOString(),
    );
  }

  async getSetting(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{value: string}>("SELECT value FROM settings WHERE key = ?", key);
    return row?.value ?? null;
  }
}
