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
