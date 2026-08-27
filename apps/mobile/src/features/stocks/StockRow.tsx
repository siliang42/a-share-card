import {Bookmark, BookmarkCheck, ChevronRight} from "lucide-react-native";
import {Pressable, StyleSheet, Text, View} from "react-native";

import type {BrowseStockRecord, LocalQuote} from "@/src/db/repository";
import {boardLabels, colors, tabularNumbers} from "@/src/theme/tokens";

export type BrowseStock = Omit<BrowseStockRecord, "quote" | "businessSummarySource" | "sectorNames"> & {
  businessSummarySource?: string | null;
  sectorNames?: string[];
  quote: (Omit<LocalQuote, "stockId" | "source" | "fetchedAt"> & Partial<Pick<LocalQuote, "stockId" | "source" | "fetchedAt">>) | null;
};
export type StockDensity = "detail" | "compact";

function quoteLabel(stock: BrowseStock): string {
  if (!stock.quote) return `${stock.name}，${stock.symbol}，暂无行情`;
  const direction = stock.quote.changePercent >= 0 ? "上涨" : "下跌";
  return `${stock.name}，${stock.symbol}，${direction} ${Math.abs(stock.quote.changePercent).toFixed(2)}%`;
}

function percent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function StockRow({
  stock,
  density,
  onPress,
  onToggleFavorite,
}: {
  stock: BrowseStock;
  density: StockDensity;
  onPress?: (stockId: string) => void;
  onToggleFavorite?: (stockId: string, favorite: boolean) => void;
}) {
  const up = (stock.quote?.changePercent ?? 0) >= 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={quoteLabel(stock)}
      onPress={() => onPress?.(stock.id)}
      style={({pressed}) => [styles.root, density === "compact" ? styles.compact : styles.detail, pressed && styles.pressed]}
    >
      <View style={styles.identity}>
        <View style={styles.nameLine}>
          <Text style={styles.name} numberOfLines={1}>{stock.name}</Text>
          {stock.isFavorite ? <BookmarkCheck size={14} color={colors.study} /> : null}
        </View>
        <Text style={styles.code}>{stock.symbol} · {boardLabels[stock.board] ?? stock.board}</Text>
        {density === "detail" ? (
          <>
            <Text style={styles.sector} numberOfLines={1}>{stock.primarySector ?? "板块待补充"} · {stock.memoryStatus}</Text>
            <Text style={styles.summary} numberOfLines={2}>{stock.businessSummary ?? "主营信息待补充"}</Text>
          </>
        ) : null}
      </View>
      <View style={styles.quote}>
        <Text style={[styles.price, stock.quote ? (up ? styles.rise : styles.fall) : styles.muted]}>
          {stock.quote ? stock.quote.price.toFixed(2) : "--"}
        </Text>
        <Text style={[styles.change, stock.quote ? (up ? styles.rise : styles.fall) : styles.muted]}>
          {stock.quote ? percent(stock.quote.changePercent) : "暂无行情"}
        </Text>
        {stock.quote?.freshness !== "fresh" ? <Text style={styles.stale}>缓存行情</Text> : null}
      </View>
      {onToggleFavorite ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={stock.isFavorite ? `取消收藏 ${stock.name}` : `收藏 ${stock.name}`}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavorite(stock.id, !stock.isFavorite);
          }}
          style={styles.iconButton}
        >
          {stock.isFavorite
            ? <BookmarkCheck size={18} color={colors.study} />
            : <Bookmark size={18} color={colors.faint} />}
        </Pressable>
      ) : <ChevronRight size={17} color={colors.faint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.surface},
  compact: {height: 68},
  detail: {minHeight: 126, paddingVertical: 13},
  pressed: {backgroundColor: "#EDF2F6"},
  identity: {flex: 1, minWidth: 0},
  nameLine: {flexDirection: "row", alignItems: "center", gap: 5},
  name: {maxWidth: "90%", fontSize: 16, lineHeight: 21, fontWeight: "700", color: colors.ink},
  code: {...tabularNumbers, marginTop: 3, fontSize: 11, color: colors.muted},
  sector: {marginTop: 7, fontSize: 11, fontWeight: "600", color: colors.inkBlue},
  summary: {marginTop: 5, fontSize: 12, lineHeight: 18, color: colors.muted},
  quote: {width: 82, alignItems: "flex-end"},
  price: {...tabularNumbers, fontSize: 16, fontWeight: "700"},
  change: {...tabularNumbers, marginTop: 4, fontSize: 12, fontWeight: "700"},
  rise: {color: colors.rise},
  fall: {color: colors.fall},
  muted: {color: colors.faint},
  stale: {marginTop: 4, fontSize: 9, color: colors.stale},
  iconButton: {width: 32, height: 40, alignItems: "center", justifyContent: "center"},
});
