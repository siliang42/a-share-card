import type {SqlDatabase} from "@/src/db/repository";

export class FavoritesRepository {
  constructor(private readonly db: SqlDatabase) {}

  async setFavorite(stockId: string, favorite: boolean): Promise<void> {
    if (!favorite) {
      await this.db.runAsync("DELETE FROM favorites WHERE stock_id = ?", stockId);
      return;
    }
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO favorites (stock_id, note, created_at, updated_at) VALUES (?, NULL, ?, ?)
       ON CONFLICT(stock_id) DO UPDATE SET updated_at = excluded.updated_at`,
      stockId,
      now,
      now,
    );
  }

  async isFavorite(stockId: string): Promise<boolean> {
    return Boolean(await this.db.getFirstAsync<{stock_id: string}>(
      "SELECT stock_id FROM favorites WHERE stock_id = ?",
      stockId,
    ));
  }

  async saveNote(stockId: string, note: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO favorites (stock_id, note, created_at, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(stock_id) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at`,
      stockId,
      note.trim() || null,
      now,
      now,
    );
  }

  async getNote(stockId: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{note: string | null}>(
      "SELECT note FROM favorites WHERE stock_id = ?",
      stockId,
    );
    return row?.note ?? null;
  }
}
