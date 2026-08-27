import {router, useFocusEffect} from "expo-router";
import {useCallback, useState} from "react";
import {ActivityIndicator, StyleSheet, View} from "react-native";

import {useDatabase} from "@/src/db/DatabaseProvider";
import {StockRepository, type BrowseStockRecord} from "@/src/db/repository";
import {FavoritesRepository} from "@/src/features/favorites/favoritesRepository";
import {StockList} from "@/src/features/stocks/StockList";
import {colors} from "@/src/theme/tokens";

export default function FavoritesRoute() {
  const db = useDatabase();
  const [stocks, setStocks] = useState<BrowseStockRecord[] | null>(null);
  const load = useCallback(() => new StockRepository(db).listStocks({favoritesOnly: true}).then(setStocks), [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!stocks) return <View style={styles.center}><ActivityIndicator color={colors.inkBlue} /></View>;
  return (
    <StockList
      deckId="favorites"
      emptyMessage="还没有收藏股票，可在市场列表中点击书签"
      onOpenStock={(stockId) => router.push(`/stock/${encodeURIComponent(stockId)}`)}
      onStartStudy={() => router.push("/study/favorites")}
      onToggleFavorite={async (stockId, favorite) => { await new FavoritesRepository(db).setFavorite(stockId, favorite); await load(); }}
      stocks={stocks}
    />
  );
}

const styles = StyleSheet.create({center: {flex: 1, alignItems: "center", justifyContent: "center"}});
