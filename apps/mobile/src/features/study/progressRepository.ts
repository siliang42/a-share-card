import {StockRepository, type ProgressRecord, type SqlDatabase} from "@/src/db/repository";

import type {BinaryRating, PromptDirection, ScheduledProgress} from "./fsrsScheduler";

export type StudyMode = "sequential" | "review";

export type StudyEventInput = {
  eventId: string;
  sessionId: string;
  deckId: string;
  mode: StudyMode;
  stockId: string;
  direction: PromptDirection;
  rating: BinaryRating;
  nextStockId: string | null;
  studiedAt: string;
};

export type DailyStudyStats = {
  studied: number;
  remembered: number;
  again: number;
};

export type StudyOverview = {
  completedToday: number;
  rememberedToday: number;
  againToday: number;
  dueCount: number;
  streakDays: number;
};

function localDayKey(date: Date, utcOffsetMinutes: number): string {
  return new Date(date.getTime() + utcOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

export class ProgressRepository extends StockRepository {
  constructor(db: SqlDatabase) {
    super(db);
  }

  async getCheckpoint(deckId: string, mode: StudyMode = "sequential"): Promise<string | null> {
    const row = await this.db.getFirstAsync<{last_stock_id: string | null}>(
      "SELECT last_stock_id FROM deck_checkpoints WHERE deck_id = ? AND mode = ?",
      deckId,
      mode,
    );
    return row?.last_stock_id ?? null;
  }

  async saveCheckpoint(deckId: string, stockId: string | null, mode: StudyMode = "sequential"): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO deck_checkpoints (deck_id, mode, last_stock_id, ordering_seed, updated_at)
       VALUES (?, ?, ?, 0, ?)
       ON CONFLICT(deck_id, mode) DO UPDATE SET
        last_stock_id = excluded.last_stock_id, updated_at = excluded.updated_at`,
      deckId,
      mode,
      stockId,
      new Date().toISOString(),
    );
  }

  async getDueStockIds(direction: PromptDirection, now: Date): Promise<string[]> {
    const rows = await this.db.getAllAsync<{stock_id: string}>(
      `SELECT stock_id FROM card_progress
       WHERE direction = ? AND due_at IS NOT NULL AND due_at <= ?
       ORDER BY due_at, stock_id`,
      direction,
      now.toISOString(),
    );
    return rows.map((row) => row.stock_id);
  }

  async applyRating(
    input: StudyEventInput,
    schedule: (previous: ProgressRecord | null) => ScheduledProgress,
  ): Promise<ScheduledProgress> {
    let resulting!: ScheduledProgress;
    await this.db.withTransactionAsync(async () => {
      const previous = await this.getProgress(input.stockId, input.direction);
      const previousCheckpoint = await this.getCheckpoint(input.deckId, input.mode);
      resulting = schedule(previous);
      await this.db.runAsync(
        `INSERT INTO card_progress
          (stock_id, direction, state_json, due_at, repetitions, last_rating, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(stock_id, direction) DO UPDATE SET
          state_json = excluded.state_json, due_at = excluded.due_at,
          repetitions = excluded.repetitions, last_rating = excluded.last_rating,
          updated_at = excluded.updated_at`,
        resulting.stockId,
        resulting.direction,
        resulting.stateJson,
        resulting.dueAt,
        resulting.repetitions,
        resulting.lastRating,
        resulting.updatedAt,
      );
      await this.db.runAsync(
        `INSERT INTO deck_checkpoints (deck_id, mode, last_stock_id, ordering_seed, updated_at)
         VALUES (?, ?, ?, 0, ?)
         ON CONFLICT(deck_id, mode) DO UPDATE SET
          last_stock_id = excluded.last_stock_id, updated_at = excluded.updated_at`,
        input.deckId,
        input.mode,
        input.nextStockId,
        input.studiedAt,
      );
      await this.db.runAsync(
        `INSERT INTO study_events
          (id, stock_id, direction, deck_id, rating, previous_state_json,
           resulting_state_json, studied_at, undone_at, session_id,
           previous_checkpoint_stock_id, resulting_checkpoint_stock_id, mode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
        input.eventId,
        input.stockId,
        input.direction,
        input.deckId,
        input.rating,
        previous ? JSON.stringify(previous) : null,
        JSON.stringify(resulting),
        input.studiedAt,
        input.sessionId,
        previousCheckpoint,
        input.nextStockId,
        input.mode,
      );
    });
    return resulting;
  }

  async undoLastRating(sessionId: string): Promise<{stockId: string; deckId: string; rating: BinaryRating} | null> {
    let undone: {stockId: string; deckId: string; rating: BinaryRating} | null = null;
    await this.db.withTransactionAsync(async () => {
      const event = await this.db.getFirstAsync<{
        id: string;
        stock_id: string;
        direction: string;
        deck_id: string;
        rating: BinaryRating;
        mode: StudyMode;
        previous_state_json: string | null;
        previous_checkpoint_stock_id: string | null;
      }>(
        `SELECT id, stock_id, direction, deck_id, rating, mode, previous_state_json, previous_checkpoint_stock_id
         FROM study_events
         WHERE session_id = ? AND undone_at IS NULL
         ORDER BY studied_at DESC, id DESC LIMIT 1`,
        sessionId,
      );
      if (!event) return;
      if (event.previous_state_json) {
        const previous = JSON.parse(event.previous_state_json) as ProgressRecord;
        await this.db.runAsync(
          `INSERT INTO card_progress
            (stock_id, direction, state_json, due_at, repetitions, last_rating, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(stock_id, direction) DO UPDATE SET
            state_json = excluded.state_json, due_at = excluded.due_at,
            repetitions = excluded.repetitions, last_rating = excluded.last_rating,
            updated_at = excluded.updated_at`,
          previous.stockId,
          previous.direction,
          previous.stateJson,
          previous.dueAt,
          previous.repetitions,
          previous.lastRating,
          previous.updatedAt,
        );
      } else {
        await this.db.runAsync(
          "DELETE FROM card_progress WHERE stock_id = ? AND direction = ?",
          event.stock_id,
          event.direction,
        );
      }
      await this.db.runAsync(
        `INSERT INTO deck_checkpoints (deck_id, mode, last_stock_id, ordering_seed, updated_at)
         VALUES (?, ?, ?, 0, ?)
         ON CONFLICT(deck_id, mode) DO UPDATE SET
          last_stock_id = excluded.last_stock_id, updated_at = excluded.updated_at`,
        event.deck_id,
        event.mode,
        event.previous_checkpoint_stock_id,
        new Date().toISOString(),
      );
      await this.db.runAsync("UPDATE study_events SET undone_at = ? WHERE id = ?", new Date().toISOString(), event.id);
      undone = {stockId: event.stock_id, deckId: event.deck_id, rating: event.rating};
    });
    return undone;
  }

  async getDailyStats(start: Date, end: Date): Promise<DailyStudyStats> {
    const row = await this.db.getFirstAsync<{studied: number; remembered: number; again: number}>(
      `SELECT COUNT(*) AS studied,
        SUM(CASE WHEN rating = 'good' THEN 1 ELSE 0 END) AS remembered,
        SUM(CASE WHEN rating = 'again' THEN 1 ELSE 0 END) AS again
       FROM study_events
       WHERE undone_at IS NULL AND studied_at >= ? AND studied_at < ?`,
      start.toISOString(),
      end.toISOString(),
    );
    return {studied: row?.studied ?? 0, remembered: row?.remembered ?? 0, again: row?.again ?? 0};
  }

  async getStudyOverview(now: Date, utcOffsetMinutes = 8 * 60): Promise<StudyOverview> {
    const [events, due] = await Promise.all([
      this.db.getAllAsync<{studied_at: string; rating: BinaryRating}>(
        "SELECT studied_at, rating FROM study_events WHERE undone_at IS NULL ORDER BY studied_at DESC",
      ),
      this.db.getFirstAsync<{due_count: number}>(
        "SELECT COUNT(*) AS due_count FROM card_progress WHERE due_at IS NOT NULL AND due_at <= ?",
        now.toISOString(),
      ),
    ]);
    const today = localDayKey(now, utcOffsetMinutes);
    const todayEvents = events.filter((event) => localDayKey(new Date(event.studied_at), utcOffsetMinutes) === today);
    const activeDays = new Set(events.map((event) => localDayKey(new Date(event.studied_at), utcOffsetMinutes)));
    let streakDays = 0;
    const shiftedDay = new Date(now.getTime() + utcOffsetMinutes * 60_000);
    shiftedDay.setUTCHours(0, 0, 0, 0);
    while (activeDays.has(shiftedDay.toISOString().slice(0, 10))) {
      streakDays += 1;
      shiftedDay.setUTCDate(shiftedDay.getUTCDate() - 1);
    }
    return {
      completedToday: todayEvents.length,
      rememberedToday: todayEvents.filter((event) => event.rating === "good").length,
      againToday: todayEvents.filter((event) => event.rating === "again").length,
      dueCount: due?.due_count ?? 0,
      streakDays,
    };
  }

  async snapshot(deckId: string, stockId: string, direction: PromptDirection) {
    return {
      checkpoint: await this.getCheckpoint(deckId),
      progress: await this.getProgress(stockId, direction),
    };
  }
}
