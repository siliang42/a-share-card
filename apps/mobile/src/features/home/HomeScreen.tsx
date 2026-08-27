import {ArrowRight, BookOpen, Building2, Flame, LayoutGrid} from "lucide-react-native";
import {Pressable, ScrollView, StyleSheet, Text, View} from "react-native";

import {colors, tabularNumbers} from "@/src/theme/tokens";

export type HomeSnapshot = {
  marketStrip: Array<{id: string; name: string; value: string; changePercent: number}>;
  progress: {completed: number; target: number; due: number; streakDays: number};
  continueDeck: {id: string; name: string; nextStockName?: string | null} | null;
  marketDeckCount: number;
  sectorDeckCount: number;
};

function signedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function HomeScreen({
  snapshot,
  onContinue,
  onOpenCatalog,
}: {
  snapshot: HomeSnapshot;
  onContinue: (deckId: string) => void;
  onOpenCatalog: (kind: "markets" | "sectors") => void;
}) {
  const progress = Math.min(1, snapshot.progress.completed / Math.max(snapshot.progress.target, 1));
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.eyebrow}>今日学习</Text>
          <Text style={styles.title}>股识</Text>
        </View>
        <View style={styles.streak}>
          <Flame size={16} color={colors.study} />
          <Text style={styles.streakText}>{snapshot.progress.streakDays} 天</Text>
        </View>
      </View>

      <View accessibilityLabel="市场概览" style={styles.marketStrip}>
        {snapshot.marketStrip.map((market) => (
          <View key={market.id} style={styles.marketItem}>
            <Text style={styles.marketName}>{market.name}</Text>
            <Text style={styles.marketValue}>{market.value}</Text>
            <Text style={[styles.marketChange, market.changePercent >= 0 ? styles.rise : styles.fall]}>
              {signedPercent(market.changePercent)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.progressBand}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.sectionLabel}>今日进度</Text>
            <Text style={styles.progressValue}>{snapshot.progress.completed} / {snapshot.progress.target}</Text>
          </View>
          <Text style={styles.dueText}>待复习 {snapshot.progress.due}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {width: `${Math.round(progress * 100)}%`}]} />
        </View>
        {snapshot.continueDeck ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`继续学习 ${snapshot.continueDeck.name}`}
            onPress={() => onContinue(snapshot.continueDeck!.id)}
            style={({pressed}) => [styles.continueButton, pressed && styles.pressed]}
          >
            <BookOpen size={20} color="#FFFFFF" />
            <View style={styles.continueCopy}>
              <Text style={styles.continueTitle}>继续学习</Text>
              <Text style={styles.continueDetail} numberOfLines={1}>
                {snapshot.continueDeck.name}{snapshot.continueDeck.nextStockName ? ` · 下一张 ${snapshot.continueDeck.nextStockName}` : ""}
              </Text>
            </View>
            <ArrowRight size={20} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="开始学习"
            onPress={() => onOpenCatalog("markets")}
            style={({pressed}) => [styles.continueButton, pressed && styles.pressed]}
          >
            <BookOpen size={20} color="#FFFFFF" />
            <Text style={styles.continueTitle}>选择一个牌组开始学习</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      <Text style={styles.catalogHeading}>浏览牌组</Text>
      <View style={styles.catalogList}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenCatalog("markets")}
          style={({pressed}) => [styles.catalogRow, pressed && styles.rowPressed]}
        >
          <View style={styles.catalogIcon}><Building2 size={21} color={colors.inkBlue} /></View>
          <View style={styles.catalogCopy}>
            <Text style={styles.catalogTitle}>股票市场</Text>
            <Text style={styles.catalogDetail}>主板、创业板、科创板、北交所 · {snapshot.marketDeckCount} 个牌组</Text>
          </View>
          <ArrowRight size={18} color={colors.faint} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpenCatalog("sectors")}
          style={({pressed}) => [styles.catalogRow, pressed && styles.rowPressed]}
        >
          <View style={styles.catalogIcon}><LayoutGrid size={21} color={colors.inkBlue} /></View>
          <View style={styles.catalogCopy}>
            <Text style={styles.catalogTitle}>板块市场</Text>
            <Text style={styles.catalogDetail}>申万行业与热门概念 · {snapshot.sectorDeckCount} 个牌组</Text>
          </View>
          <ArrowRight size={18} color={colors.faint} />
        </Pressable>
      </View>
      <Text style={styles.disclosure}>公开数据仅用于学习，不构成投资建议</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.canvas},
  content: {paddingHorizontal: 18, paddingTop: 14, paddingBottom: 40},
  headingRow: {flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18},
  eyebrow: {fontSize: 12, fontWeight: "600", color: colors.muted},
  title: {marginTop: 2, fontSize: 30, lineHeight: 36, fontWeight: "700", color: colors.inkBlueDark},
  streak: {height: 32, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: "#E7D48D", borderRadius: 6, backgroundColor: colors.studySoft},
  streakText: {fontSize: 12, fontWeight: "700", color: "#795D0A"},
  marketStrip: {minHeight: 72, flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface},
  marketItem: {flex: 1, minWidth: 0, justifyContent: "center", paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: colors.border},
  marketName: {fontSize: 11, color: colors.muted},
  marketValue: {...tabularNumbers, marginTop: 3, fontSize: 15, fontWeight: "700", color: colors.ink},
  marketChange: {...tabularNumbers, marginTop: 2, fontSize: 11, fontWeight: "600"},
  rise: {color: colors.rise},
  fall: {color: colors.fall},
  progressBand: {marginTop: 18, padding: 18, borderRadius: 7, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border},
  progressTop: {flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end"},
  sectionLabel: {fontSize: 12, fontWeight: "600", color: colors.muted},
  progressValue: {...tabularNumbers, marginTop: 3, fontSize: 26, lineHeight: 31, fontWeight: "700", color: colors.inkBlueDark},
  dueText: {fontSize: 12, fontWeight: "600", color: colors.muted},
  progressTrack: {height: 6, marginTop: 12, overflow: "hidden", borderRadius: 3, backgroundColor: "#E7EBEF"},
  progressFill: {height: 6, backgroundColor: colors.study},
  continueButton: {minHeight: 58, marginTop: 18, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 6, backgroundColor: colors.inkBlue},
  pressed: {backgroundColor: colors.inkBlueDark},
  continueCopy: {flex: 1, minWidth: 0},
  continueTitle: {fontSize: 15, fontWeight: "700", color: "#FFFFFF"},
  continueDetail: {marginTop: 3, fontSize: 11, color: "#DDE8F4"},
  catalogHeading: {marginTop: 26, marginBottom: 8, fontSize: 15, fontWeight: "700", color: colors.ink},
  catalogList: {borderTopWidth: 1, borderColor: colors.border},
  catalogRow: {minHeight: 76, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderColor: colors.border},
  rowPressed: {backgroundColor: "#EBF0F5"},
  catalogIcon: {width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: "#E8EEF5"},
  catalogCopy: {flex: 1, minWidth: 0},
  catalogTitle: {fontSize: 15, fontWeight: "700", color: colors.ink},
  catalogDetail: {marginTop: 4, fontSize: 11, color: colors.muted},
  disclosure: {marginTop: 22, textAlign: "center", fontSize: 10, color: colors.faint},
});
