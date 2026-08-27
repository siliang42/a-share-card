import {BookOpen, Rows3, Search} from "lucide-react-native";
import {useMemo, useRef, useState} from "react";
import {FlatList, Pressable, StyleSheet, Text, TextInput, View} from "react-native";

import {StockRow, type BrowseStock, type StockDensity} from "./StockRow";
import {colors} from "@/src/theme/tokens";

export function StockList({
  deckId,
  stocks,
  initialDensity = "detail",
  onOpenStock,
  onToggleFavorite,
  onStartStudy,
  onVisibleStockIdsChange,
  quoteError,
  emptyMessage = "当前牌组还没有股票",
}: {
  deckId: string;
  stocks: BrowseStock[];
  initialDensity?: StockDensity;
  onOpenStock?: (stockId: string) => void;
  onToggleFavorite?: (stockId: string, favorite: boolean) => void;
  onStartStudy?: (deckId: string) => void;
  onVisibleStockIdsChange?: (stockIds: string[]) => void;
  quoteError?: string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<StockDensity>(initialDensity);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return stocks;
    return stocks.filter((stock) => stock.name.toLocaleLowerCase().includes(normalized) || stock.symbol.includes(normalized));
  }, [query, stocks]);
  const visibleHandler = useRef(onVisibleStockIdsChange);
  visibleHandler.current = onVisibleStockIdsChange;
  const onViewableItemsChanged = useRef(({viewableItems}: {viewableItems: Array<{item: BrowseStock}>}) => {
    visibleHandler.current?.(viewableItems.map(({item}) => item.id));
  }).current;

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={17} color={colors.faint} />
          <TextInput
            accessibilityLabel="搜索股票"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="名称 / 代码"
            placeholderTextColor={colors.faint}
            style={styles.searchInput}
            value={query}
          />
        </View>
        <View accessibilityRole="tablist" style={styles.segmented}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="详细列表"
            accessibilityState={{selected: density === "detail"}}
            onPress={() => setDensity("detail")}
            style={[styles.segment, density === "detail" && styles.segmentActive]}
          >
            <Rows3 size={16} color={density === "detail" ? "#FFFFFF" : colors.inkBlue} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="紧凑列表"
            accessibilityState={{selected: density === "compact"}}
            onPress={() => setDensity("compact")}
            style={[styles.segment, density === "compact" && styles.segmentActive]}
          >
            <Text style={[styles.compactIcon, density === "compact" && styles.compactIconActive]}>≡</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.count}>{filtered.length} 只股票</Text>
        {onStartStudy ? (
          <Pressable accessibilityRole="button" onPress={() => onStartStudy(deckId)} style={styles.studyButton}>
            <BookOpen size={15} color={colors.inkBlue} />
            <Text style={styles.studyText}>开始背诵</Text>
          </Pressable>
        ) : null}
      </View>
      {quoteError ? <Text accessibilityRole="alert" style={styles.quoteError}>{quoteError}</Text> : null}
      <FlatList
        data={filtered}
        getItemLayout={(_, index) => {
          const length = density === "compact" ? 68 : 126;
          return {length, offset: length * index, index};
        }}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>{query ? "没有匹配的股票" : emptyMessage}</Text>}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({item}) => (
          <StockRow
            density={density}
            onPress={onOpenStock}
            onToggleFavorite={onToggleFavorite}
            stock={item}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.surface},
  toolbar: {height: 62, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.canvas},
  searchBox: {height: 40, flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, backgroundColor: colors.surface},
  searchInput: {height: 40, flex: 1, paddingVertical: 0, fontSize: 14, color: colors.ink},
  segmented: {height: 38, flexDirection: "row", overflow: "hidden", borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, backgroundColor: colors.surface},
  segment: {width: 38, alignItems: "center", justifyContent: "center"},
  segmentActive: {backgroundColor: colors.inkBlue},
  compactIcon: {fontSize: 20, lineHeight: 22, color: colors.inkBlue},
  compactIconActive: {color: "#FFFFFF"},
  metaRow: {height: 42, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderColor: colors.border},
  count: {fontSize: 11, fontWeight: "600", color: colors.muted},
  studyButton: {height: 30, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, borderRadius: 5, backgroundColor: "#E8EEF5"},
  studyText: {fontSize: 11, fontWeight: "700", color: colors.inkBlue},
  empty: {padding: 32, textAlign: "center", fontSize: 13, lineHeight: 20, color: colors.muted},
  quoteError: {paddingHorizontal: 16, paddingVertical: 8, fontSize: 11, color: colors.stale, backgroundColor: "#FFF8E6"},
});
