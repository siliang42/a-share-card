import {router} from "expo-router";
import {useEffect, useState} from "react";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";

import {useDatabase} from "@/src/db/DatabaseProvider";
import {StockRepository} from "@/src/db/repository";
import {HomeScreen, type HomeSnapshot} from "@/src/features/home/HomeScreen";
import {colors} from "@/src/theme/tokens";

export default function TodayRoute() {
  const db = useDatabase();
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const repository = new StockRepository(db);
    Promise.all([repository.getCatalog(), repository.getSetting("daily_target"), repository.getSetting("last_deck_id")])
      .then(([catalog, dailyTarget, lastDeckId]) => {
        const deck = catalog.markets.find((item) => item.id === lastDeckId) ?? catalog.markets[0] ?? null;
        setSnapshot({
          marketStrip: [
            {id: "sse", name: "上证", value: "--", changePercent: 0},
            {id: "szse", name: "深证", value: "--", changePercent: 0},
          ],
          progress: {completed: 0, target: Number(dailyTarget) || 40, due: 0, streakDays: 0},
          continueDeck: deck ? {id: deck.id, name: deck.name} : null,
          marketDeckCount: catalog.markets.length,
          sectorDeckCount: catalog.sectors.length,
        });
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "首页资料载入失败"));
  }, [db]);
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!snapshot) return <View style={styles.center}><ActivityIndicator color={colors.inkBlue} /></View>;
  return (
    <HomeScreen
      onContinue={(deckId) => router.push(`/study/${encodeURIComponent(deckId)}`)}
      onOpenCatalog={() => router.push("/(tabs)/markets")}
      snapshot={snapshot}
    />
  );
}

const styles = StyleSheet.create({center: {flex: 1, alignItems: "center", justifyContent: "center"}, error: {color: colors.rise}});
