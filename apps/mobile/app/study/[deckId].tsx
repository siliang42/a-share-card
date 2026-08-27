import {router, useLocalSearchParams} from "expo-router";
import {useCallback, useEffect, useMemo, useState} from "react";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";

import {useDatabase} from "@/src/db/DatabaseProvider";
import {StockRepository, type BrowseStockRecord} from "@/src/db/repository";
import {ProgressRepository, type StudyMode} from "@/src/features/study/progressRepository";
import {
  advanceSession,
  createReviewSession,
  createSequentialSession,
  rateCard,
  rewindSessionToStock,
  undoLastRating,
  type BinaryRating,
  type PromptDirection,
  type StudySession,
  type StudyStock,
} from "@/src/features/study/session";
import {StudyScreen} from "@/src/features/study/StudyScreen";
import {colors} from "@/src/theme/tokens";

function toStudyStock(stock: BrowseStockRecord): StudyStock {
  return {
    stockId: stock.id,
    symbol: stock.symbol,
    name: stock.name,
    board: stock.board,
    businessSummary: stock.businessSummary,
    sectors: stock.sectorNames,
    price: stock.quote?.price ?? null,
    changePercent: stock.quote?.changePercent ?? null,
    quoteFreshness: stock.quote?.freshness ?? null,
  };
}

export default function StudyRoute() {
  const db = useDatabase();
  const {deckId: rawDeckId} = useLocalSearchParams<{deckId: string}>();
  const deckId = decodeURIComponent(rawDeckId ?? "market:all");
  const [sessionId] = useState(() => `study-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`);
  const [direction, setDirection] = useState<PromptDirection>("name_to_profile");
  const [mode, setMode] = useState<StudyMode>("sequential");
  const [session, setSession] = useState<StudySession | null>(null);
  const [summary, setSummary] = useState({remembered: 0, again: 0});
  const [error, setError] = useState("");
  const repository = useMemo(() => new ProgressRepository(db), [db]);

  const loadStocks = useCallback(async () => {
    const stockRepository = new StockRepository(db);
    if (deckId === "favorites") return stockRepository.listStocks({favoritesOnly: true});
    if (deckId.startsWith("stock:")) return stockRepository.listStocks({stockId: deckId.slice("stock:".length)});
    return stockRepository.listStocks({deckId});
  }, [db, deckId]);

  const buildSession = useCallback(async (nextMode: StudyMode, nextDirection: PromptDirection) => {
    const stocks = (await loadStocks()).map(toStudyStock);
    const next = nextMode === "review"
      ? await createReviewSession(deckId, stocks, repository, nextDirection, new Date())
      : await createSequentialSession(deckId, stocks, repository);
    setSession(next);
    setError("");
  }, [deckId, loadStocks, repository]);

  useEffect(() => {
    new StockRepository(db).getSetting("prompt_direction")
      .then((saved) => {
        const initial = saved === "code_to_name" ? "code_to_name" : "name_to_profile";
        setDirection(initial);
        return buildSession("sequential", initial);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "学习牌组载入失败"));
  }, [buildSession, db]);

  async function submitRating(rating: BinaryRating) {
    if (!session?.current) return;
    const nextStockId = session.stocks[session.currentIndex + 1]?.stockId ?? null;
    await rateCard(repository, {sessionId, deckId, mode: session.mode, stock: session.current, direction, rating, now: new Date(), nextStockId});
    await new StockRepository(db).setSetting("last_deck_id", deckId);
    setSummary((current) => ({...current, [rating === "good" ? "remembered" : "again"]: current[rating === "good" ? "remembered" : "again"] + 1}));
    setSession(advanceSession(session));
  }

  async function undo() {
    const undone = await undoLastRating(repository, sessionId);
    if (!undone || !session) return;
    setSession(rewindSessionToStock(session, undone.stockId));
    setSummary((current) => ({...current, [undone.rating === "good" ? "remembered" : "again"]: Math.max(0, current[undone.rating === "good" ? "remembered" : "again"] - 1)}));
  }

  async function changeDirection(next: PromptDirection) {
    setDirection(next);
    await new StockRepository(db).setSetting("prompt_direction", next);
    if (mode === "review") await buildSession(mode, next);
  }

  async function changeMode(next: StudyMode) {
    setMode(next);
    setSummary({remembered: 0, again: 0});
    await buildSession(next, direction);
  }

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!session) return <View style={styles.center}><ActivityIndicator color={colors.inkBlue} /></View>;
  return (
    <StudyScreen
      direction={direction}
      onClose={() => router.back()}
      onDirectionChange={(next) => { void changeDirection(next); }}
      onModeChange={(next) => { void changeMode(next); }}
      onRate={submitRating}
      onRestart={() => { void buildSession(mode, direction); setSummary({remembered: 0, again: 0}); }}
      onUndo={undo}
      session={session}
      summary={summary}
    />
  );
}

const styles = StyleSheet.create({center: {flex: 1, alignItems: "center", justifyContent: "center"}, error: {padding: 24, textAlign: "center", color: colors.rise}});
