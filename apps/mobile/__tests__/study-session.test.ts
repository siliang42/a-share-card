import {runMigrations} from "@/src/db/migrations";
import {
  createReviewSession,
  createSequentialSession,
  rateCard,
  undoLastRating,
  type StudyStock,
} from "@/src/features/study/session";
import {ProgressRepository} from "@/src/features/study/progressRepository";

import {NodeTestDatabase} from "./support/database";

const stockA: StudyStock = {stockId: "SH:600519", symbol: "600519", name: "贵州茅台", board: "SH_MAIN", businessSummary: "白酒生产销售", sectors: ["食品饮料"]};
const stockInserted: StudyStock = {stockId: "SH:600036", symbol: "600036", name: "招商银行", board: "SH_MAIN", businessSummary: "商业银行服务", sectors: ["银行"]};
const stockXj: StudyStock = {stockId: "SZ:000400", symbol: "000400", name: "许继电气", board: "SZ_MAIN", businessSummary: "电力自动化与保护控制", sectors: ["电力设备", "智能电网"]};

describe("study sessions", () => {
  it("resumes a sequential deck by stock id after membership order changes", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const repository = new ProgressRepository(db);
    await repository.saveCheckpoint("sector:shenwan:801120", "SZ:000400");

    const session = await createSequentialSession("sector:shenwan:801120", [stockA, stockInserted, stockXj], repository);

    expect(session.current?.stockId).toBe("SZ:000400");
    expect(session.currentIndex).toBe(2);
    db.close();
  });

  it("stores name-to-profile and code-to-name progress independently", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const repository = new ProgressRepository(db);

    await rateCard(repository, {
      sessionId: "session-a",
      deckId: "market:sh_main",
      stock: stockA,
      direction: "name_to_profile",
      rating: "good",
      now: new Date("2026-08-27T07:00:00Z"),
      nextStockId: stockInserted.stockId,
    });

    expect(await repository.getProgress(stockA.stockId, "name_to_profile")).toMatchObject({lastRating: "good", repetitions: 1});
    expect(await repository.getProgress(stockA.stockId, "code_to_name")).toBeNull();
    db.close();
  });

  it("undo restores both FSRS state and checkpoint", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const repository = new ProgressRepository(db);
    await repository.saveCheckpoint("market:sh_main", stockA.stockId);
    const before = await repository.snapshot("market:sh_main", stockA.stockId, "name_to_profile");

    await rateCard(repository, {
      sessionId: "session-undo",
      deckId: "market:sh_main",
      stock: stockA,
      direction: "name_to_profile",
      rating: "again",
      now: new Date("2026-08-27T07:00:00Z"),
      nextStockId: stockInserted.stockId,
    });
    await undoLastRating(repository, "session-undo");

    expect(await repository.snapshot("market:sh_main", stockA.stockId, "name_to_profile")).toEqual(before);
    db.close();
  });

  it("builds smart review sessions from cards due at the requested time", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const repository = new ProgressRepository(db);
    await repository.saveProgress({stockId: stockA.stockId, direction: "name_to_profile", stateJson: "{}", dueAt: "2026-08-27T06:59:00Z", repetitions: 2, lastRating: "good"});
    await repository.saveProgress({stockId: stockXj.stockId, direction: "name_to_profile", stateJson: "{}", dueAt: "2026-08-28T07:00:00Z", repetitions: 2, lastRating: "good"});

    const session = await createReviewSession("review:all", [stockA, stockXj], repository, "name_to_profile", new Date("2026-08-27T07:00:00Z"));

    expect(session.stocks.map((stock) => stock.stockId)).toEqual([stockA.stockId]);
    db.close();
  });

  it("keeps review checkpoints separate from sequential checkpoints", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const repository = new ProgressRepository(db);
    await repository.saveCheckpoint("market:sh_main", stockA.stockId, "sequential");

    await rateCard(repository, {sessionId: "review-mode", deckId: "market:sh_main", mode: "review", stock: stockA, direction: "name_to_profile", rating: "good", now: new Date("2026-08-27T07:00:00Z"), nextStockId: stockXj.stockId});

    expect(await repository.getCheckpoint("market:sh_main", "sequential")).toBe(stockA.stockId);
    expect(await repository.getCheckpoint("market:sh_main", "review")).toBe(stockXj.stockId);
    db.close();
  });

  it("summarizes today's work, due cards, and consecutive study days", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const repository = new ProgressRepository(db);
    for (const [sessionId, now] of [
      ["stats-day-one", new Date("2026-08-26T07:00:00Z")],
      ["stats-day-two", new Date("2026-08-27T07:00:00Z")],
    ] as const) {
      await rateCard(repository, {sessionId, deckId: "market:sh_main", stock: stockA, direction: "name_to_profile", rating: "good", now, nextStockId: stockA.stockId});
    }
    await repository.saveProgress({stockId: stockXj.stockId, direction: "name_to_profile", stateJson: "{}", dueAt: "2026-08-27T07:30:00Z", repetitions: 1, lastRating: "again"});

    const overview = await repository.getStudyOverview(new Date("2026-08-27T08:00:00Z"), 8 * 60);

    expect(overview).toMatchObject({completedToday: 1, rememberedToday: 1, dueCount: 1, streakDays: 2});
    db.close();
  });
});
