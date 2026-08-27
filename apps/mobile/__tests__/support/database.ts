import Database from "better-sqlite3";

import type {SqlDatabase} from "@/src/db/repository";

export class NodeTestDatabase implements SqlDatabase {
  private readonly raw = new Database(":memory:");

  async execAsync(source: string): Promise<void> {
    this.raw.exec(source);
  }

  async runAsync(source: string, ...params: unknown[]) {
    const result = this.raw.prepare(source).run(...params);
    return {changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid)};
  }

  async getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null> {
    return (this.raw.prepare(source).get(...params) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...params: unknown[]): Promise<T[]> {
    return this.raw.prepare(source).all(...params) as T[];
  }

  async prepareAsync(source: string) {
    const statement = this.raw.prepare(source);
    return {
      executeAsync: async (...params: unknown[]) => {
        const result = statement.run(...params);
        return {changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid)};
      },
      finalizeAsync: async () => undefined,
    };
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.raw.exec("BEGIN IMMEDIATE");
    try {
      await task();
      this.raw.exec("COMMIT");
    } catch (error) {
      this.raw.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.raw.close();
  }
}
