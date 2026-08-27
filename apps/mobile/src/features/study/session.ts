import type {ProgressRepository, StudyMode} from "./progressRepository";
import {scheduleProgress, type BinaryRating, type PromptDirection, type ScheduledProgress} from "./fsrsScheduler";

export type {BinaryRating, PromptDirection} from "./fsrsScheduler";

export type StudyStock = {
  stockId: string;
  symbol: string;
  name: string;
  board: string;
  businessSummary: string | null;
  sectors: string[];
  price?: number | null;
  changePercent?: number | null;
  quoteFreshness?: string | null;
};

export type StudySession = {
  deckId: string;
  mode: StudyMode;
  stocks: StudyStock[];
  currentIndex: number;
  current: StudyStock | null;
  completedCount: number;
  total: number;
};

export function resumeCheckpoint(stocks: StudyStock[], stockId: string | null): number {
  if (!stocks.length) return 0;
  const index = stockId ? stocks.findIndex((stock) => stock.stockId === stockId) : -1;
  return index >= 0 ? index : 0;
}

export async function createSequentialSession(
  deckId: string,
  stocks: StudyStock[],
  repository: ProgressRepository,
): Promise<StudySession> {
  const checkpoint = await repository.getCheckpoint(deckId, "sequential");
  const currentIndex = resumeCheckpoint(stocks, checkpoint);
  return {
    deckId,
    mode: "sequential",
    stocks,
    currentIndex,
    current: stocks[currentIndex] ?? null,
    completedCount: currentIndex,
    total: stocks.length,
  };
}

export async function createReviewSession(
  deckId: string,
  stocks: StudyStock[],
  repository: ProgressRepository,
  direction: PromptDirection,
  now: Date,
): Promise<StudySession> {
  const due = new Set(await repository.getDueStockIds(direction, now));
  const reviewStocks = stocks.filter((stock) => due.has(stock.stockId));
  return {deckId, mode: "review", stocks: reviewStocks, currentIndex: 0, current: reviewStocks[0] ?? null, completedCount: 0, total: reviewStocks.length};
}

export function advanceSession(session: StudySession): StudySession {
  const currentIndex = session.currentIndex + 1;
  return {
    ...session,
    currentIndex,
    current: session.stocks[currentIndex] ?? null,
    completedCount: Math.min(currentIndex, session.total),
  };
}

export function rewindSessionToStock(session: StudySession, stockId: string): StudySession {
  const currentIndex = session.stocks.findIndex((stock) => stock.stockId === stockId);
  if (currentIndex < 0) return session;
  return {...session, currentIndex, current: session.stocks[currentIndex], completedCount: currentIndex};
}

export async function rateCard(
  repository: ProgressRepository,
  input: {
    sessionId: string;
    deckId: string;
    mode?: StudyMode;
    stock: StudyStock;
    direction: PromptDirection;
    rating: BinaryRating;
    now: Date;
    nextStockId: string | null;
  },
): Promise<ScheduledProgress> {
  const eventId = `${input.sessionId}:${input.now.getTime()}:${input.stock.stockId}:${input.direction}`;
  return repository.applyRating(
    {
      eventId,
      sessionId: input.sessionId,
      deckId: input.deckId,
      mode: input.mode ?? "sequential",
      stockId: input.stock.stockId,
      direction: input.direction,
      rating: input.rating,
      nextStockId: input.nextStockId,
      studiedAt: input.now.toISOString(),
    },
    (previous) => scheduleProgress(input.stock.stockId, input.direction, previous, input.rating, input.now),
  );
}

export function undoLastRating(repository: ProgressRepository, sessionId: string) {
  return repository.undoLastRating(sessionId);
}
