import {router, useFocusEffect, useLocalSearchParams} from "expo-router";
import {useCallback, useState} from "react";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";

import {loadPairing} from "@/src/api/config";
import {createQuoteLoader, refreshVisibleQuotes} from "@/src/api/quotes";
import {useDatabase} from "@/src/db/DatabaseProvider";
import {StockRepository, type BrowseStockRecord} from "@/src/db/repository";
import {FavoritesRepository} from "@/src/features/favorites/favoritesRepository";
import {StockList} from "@/src/features/stocks/StockList";
import {colors} from "@/src/theme/tokens";

export default function DeckRoute() {
  const db = useDatabase();
  const {deckId: rawDeckId} = useLocalSearchParams<{deckId: string}>();
  const deckId = decodeURIComponent(rawDeckId ?? "market:all");
  const [stocks, setStocks] = useState<BrowseStockRecord[] | null>(null);
  const [error, setError] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const load = useCallback(async () => {
    setStocks(await new StockRepository(db).listStocks({deckId}));
  }, [db, deckId]);
  useFocusEffect(useCallback(() => { load().catch((reason) => setError(reason instanceof Error ? reason.message : "股票列表载入失败")); }, [load]));

  const refreshVisible = useCallback(async (stockIds: string[]) => {
    if (!stockIds.length) return;
    const pairing = await loadPairing(db);
    if (!pairing) return;
    try {
      await refreshVisibleQuotes(createQuoteLoader(pairing), db, stockIds);
      setQuoteError("");
      await load();
    } catch (reason) {
      setQuoteError(reason instanceof Error ? reason.message : "行情刷新失败，已保留缓存行情");
    }
  }, [db, load]);

  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!stocks) return <View style={styles.center}><ActivityIndicator color={colors.inkBlue} /></View>;
  return (
    <StockList
      deckId={deckId}
      onOpenStock={(stockId) => router.push(`/stock/${encodeURIComponent(stockId)}`)}
      onStartStudy={(id) => router.push(`/study/${encodeURIComponent(id)}`)}
      onToggleFavorite={async (stockId, favorite) => { await new FavoritesRepository(db).setFavorite(stockId, favorite); await load(); }}
      onVisibleStockIdsChange={(ids) => { void refreshVisible(ids); }}
      quoteError={quoteError}
      stocks={stocks}
    />
  );
}

const styles = StyleSheet.create({center: {flex: 1, alignItems: "center", justifyContent: "center"}, error: {padding: 24, color: colors.rise}});
