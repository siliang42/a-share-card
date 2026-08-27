import {router, useFocusEffect} from "expo-router";
import {useCallback, useState} from "react";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";

import {useDatabase} from "@/src/db/DatabaseProvider";
import {StockRepository, type LocalCatalog} from "@/src/db/repository";
import {MarketCatalog} from "@/src/features/catalog/MarketCatalog";
import {colors} from "@/src/theme/tokens";

export default function MarketsRoute() {
  const db = useDatabase();
  const [catalog, setCatalog] = useState<LocalCatalog | null>(null);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    new StockRepository(db).getCatalog().then(setCatalog).catch((reason) => setError(reason instanceof Error ? reason.message : "市场目录载入失败"));
  }, [db]));
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!catalog) return <View style={styles.center}><ActivityIndicator color={colors.inkBlue} /></View>;
  return <MarketCatalog catalog={catalog} onOpenDeck={(deckId) => router.push(`/deck/${encodeURIComponent(deckId)}`)} />;
}

const styles = StyleSheet.create({center: {flex: 1, alignItems: "center", justifyContent: "center"}, error: {color: colors.rise}});
