import {Clock3} from "lucide-react-native";
import {StyleSheet, Text, View} from "react-native";

import type {StudyStock} from "./session";
import {boardLabels, colors, tabularNumbers} from "@/src/theme/tokens";

export function RevealAnswer({stock}: {stock: StudyStock}) {
  const up = (stock.changePercent ?? 0) >= 0;
  return (
    <View style={styles.root}>
      <View style={styles.identity}>
        <View>
          <Text style={styles.name}>{stock.name}</Text>
          <View style={styles.codeLine}>
            <Text style={styles.code}>{stock.symbol}</Text>
            <Text style={styles.board}>· {boardLabels[stock.board] ?? stock.board}</Text>
          </View>
        </View>
        <View style={styles.quote}>
          <Text style={[styles.price, stock.price == null ? styles.muted : up ? styles.rise : styles.fall]}>{stock.price == null ? "--" : stock.price.toFixed(2)}</Text>
          <Text style={[styles.change, stock.changePercent == null ? styles.muted : up ? styles.rise : styles.fall]}>
            {stock.changePercent == null ? "暂无行情" : `${stock.changePercent > 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%`}
          </Text>
        </View>
      </View>
      <Text style={styles.summary}>{stock.businessSummary ?? "主营信息待补充，可在 Web 后台维护。"}</Text>
      <View style={styles.tags}>{stock.sectors.slice(0, 4).map((sector) => <View key={sector} style={styles.tag}><Text style={styles.tagText}>{sector}</Text></View>)}</View>
      <View style={styles.freshness}><Clock3 size={12} color={colors.faint} /><Text style={styles.freshnessText}>{stock.quoteFreshness === "fresh" ? "最新行情" : "缓存/离线行情"}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {marginTop: 10, padding: 16, borderLeftWidth: 3, borderLeftColor: colors.study, backgroundColor: "#FFFDF5"},
  identity: {flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12},
  name: {fontSize: 19, fontWeight: "700", color: colors.ink},
  codeLine: {marginTop: 4, flexDirection: "row", alignItems: "center", gap: 4},
  code: {...tabularNumbers, fontSize: 11, color: colors.muted},
  board: {fontSize: 11, color: colors.muted},
  quote: {alignItems: "flex-end"},
  price: {...tabularNumbers, fontSize: 17, fontWeight: "700"},
  change: {...tabularNumbers, marginTop: 3, fontSize: 11, fontWeight: "700"},
  rise: {color: colors.rise},
  fall: {color: colors.fall},
  muted: {color: colors.faint},
  summary: {marginTop: 13, fontSize: 14, lineHeight: 22, color: colors.ink},
  tags: {marginTop: 11, flexDirection: "row", flexWrap: "wrap", gap: 6},
  tag: {height: 25, paddingHorizontal: 8, justifyContent: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.surface},
  tagText: {fontSize: 10, color: colors.muted},
  freshness: {marginTop: 12, flexDirection: "row", alignItems: "center", gap: 5},
  freshnessText: {fontSize: 9, color: colors.faint},
});
