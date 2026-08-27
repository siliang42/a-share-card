import {router, useFocusEffect, useLocalSearchParams} from "expo-router";
import {useCallback, useState} from "react";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";

import {loadPairing} from "@/src/api/config";
import {createQuoteLoader, refreshVisibleQuotes} from "@/src/api/quotes";
import {useDatabase} from "@/src/db/DatabaseProvider";
import {StockRepository, type BrowseStockRecord} from "@/src/db/repository";
import {FavoritesRepository} from "@/src/features/favorites/favoritesRepository";
import {StockDetail} from "@/src/features/stocks/StockDetail";
import {colors} from "@/src/theme/tokens";

export default function StockDetailRoute() {
  const db = useDatabase();
  const {stockId: rawStockId} = useLocalSearchParams<{stockId: string}>();
  const stockId = decodeURIComponent(rawStockId ?? "");
  const [stock, setStock] = useState<BrowseStockRecord | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const [item] = await new StockRepository(db).listStocks({stockId});
    if (!item) throw new Error("未找到这只股票，可能需要重新同步数据");
    setStock(item);
    setNote(await new FavoritesRepository(db).getNote(stockId) ?? "");
  }, [db, stockId]);
  useFocusEffect(useCallback(() => {
    load().then(async () => {
      const pairing = await loadPairing(db);
      if (pairing) await refreshVisibleQuotes(createQuoteLoader(pairing), db, [stockId]).then(load);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "股票资料载入失败"));
  }, [db, load, stockId]));
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!stock) return <View style={styles.center}><ActivityIndicator color={colors.inkBlue} /></View>;
  return (
    <StockDetail
      note={note}
      onSaveNote={async (id, value) => { await new FavoritesRepository(db).saveNote(id, value); setNote(value.trim()); await load(); }}
      onStartStudy={(id) => router.push(`/study/${encodeURIComponent(`stock:${id}`)}`)}
      onToggleFavorite={async (id, favorite) => { await new FavoritesRepository(db).setFavorite(id, favorite); await load(); }}
      stock={stock}
    />
  );
}

const styles = StyleSheet.create({center: {flex: 1, alignItems: "center", justifyContent: "center"}, error: {padding: 24, color: colors.rise}});
