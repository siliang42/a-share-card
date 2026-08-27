import {Bookmark, BookmarkCheck, BookOpen, Clock3, Save} from "lucide-react-native";
import {useState} from "react";
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from "react-native";

import type {BrowseStock} from "./StockRow";
import {boardLabels, colors, tabularNumbers} from "@/src/theme/tokens";

export function StockDetail({
  stock,
  note,
  onToggleFavorite,
  onSaveNote,
  onStartStudy,
}: {
  stock: BrowseStock;
  note: string;
  onToggleFavorite: (stockId: string, favorite: boolean) => void;
  onSaveNote: (stockId: string, note: string) => Promise<void>;
  onStartStudy?: (stockId: string) => void;
}) {
  const [draft, setDraft] = useState(note);
  const [saved, setSaved] = useState(false);
  const quoteUp = (stock.quote?.changePercent ?? 0) >= 0;

  async function save() {
    await onSaveNote(stock.id, draft);
    setSaved(true);
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.identityRow}>
        <View style={styles.identity}>
          <Text style={styles.name}>{stock.name}</Text>
          <Text style={styles.code}>{stock.symbol} · {boardLabels[stock.board] ?? stock.board}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={stock.isFavorite ? `取消收藏 ${stock.name}` : `收藏 ${stock.name}`}
          onPress={() => onToggleFavorite(stock.id, !stock.isFavorite)}
          style={styles.favoriteButton}
        >
          {stock.isFavorite ? <BookmarkCheck size={21} color={colors.study} /> : <Bookmark size={21} color={colors.inkBlue} />}
        </Pressable>
      </View>

      <View style={styles.quoteBand}>
        <View>
          <Text style={styles.miniLabel}>最新价格</Text>
          <Text style={[styles.price, stock.quote ? (quoteUp ? styles.rise : styles.fall) : styles.muted]}>
            {stock.quote ? stock.quote.price.toFixed(2) : "--"}
          </Text>
        </View>
        <View style={styles.quoteRight}>
          <Text style={[styles.change, stock.quote ? (quoteUp ? styles.rise : styles.fall) : styles.muted]}>
            {stock.quote ? `${stock.quote.changePercent > 0 ? "+" : ""}${stock.quote.changePercent.toFixed(2)}%` : "暂无行情"}
          </Text>
          <View style={styles.timeRow}>
            <Clock3 size={12} color={colors.faint} />
            <Text style={styles.time}>{stock.quote ? (stock.quote.freshness === "fresh" ? "实时/最新" : "缓存行情") : "连接 Mac 后刷新"}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>所属板块</Text>
      <View style={styles.tags}>
        <View style={styles.primaryTag}><Text style={styles.primaryTagText}>{stock.primarySector ?? "板块待补充"}</Text></View>
        {(stock.sectorNames ?? []).filter((name) => name !== stock.primarySector).map((name) => (
          <View key={name} style={styles.tag}><Text style={styles.tagText}>{name}</Text></View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>主营摘要</Text>
      <Text style={styles.summary}>{stock.businessSummary ?? "主营信息待补充，可在 Web 后台维护。"}</Text>
      <Text style={styles.source}>资料来源：{stock.businessSummarySource ?? "待补充"}</Text>

      <View style={styles.studyLine}>
        <View>
          <Text style={styles.sectionLabelNoMargin}>记忆状态</Text>
          <Text style={styles.studyStatus}>{stock.memoryStatus}</Text>
        </View>
        {onStartStudy ? (
          <Pressable accessibilityRole="button" onPress={() => onStartStudy(stock.id)} style={styles.studyButton}>
            <BookOpen size={16} color="#FFFFFF" />
            <Text style={styles.studyButtonText}>背诵这只股票</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.sectionLabel}>个人笔记</Text>
      <TextInput
        accessibilityLabel="个人笔记"
        multiline
        onChangeText={(value) => { setDraft(value); setSaved(false); }}
        placeholder="记录容易混淆的代码、行业或主营关键词"
        placeholderTextColor={colors.faint}
        style={styles.noteInput}
        textAlignVertical="top"
        value={draft}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="保存笔记" onPress={save} style={styles.saveButton}>
        <Save size={16} color={colors.inkBlue} />
        <Text style={styles.saveText}>{saved ? "已保存" : "保存笔记"}</Text>
      </Pressable>
      <Text style={styles.disclosure}>公开数据仅用于学习，不构成投资建议</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.canvas},
  content: {padding: 18, paddingBottom: 44},
  identityRow: {flexDirection: "row", alignItems: "center", gap: 12},
  identity: {flex: 1},
  name: {fontSize: 27, lineHeight: 34, fontWeight: "700", color: colors.inkBlueDark},
  code: {...tabularNumbers, marginTop: 5, fontSize: 12, color: colors.muted},
  favoriteButton: {width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, backgroundColor: colors.surface},
  quoteBand: {minHeight: 94, marginTop: 20, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface},
  miniLabel: {fontSize: 10, color: colors.muted},
  price: {...tabularNumbers, marginTop: 5, fontSize: 27, fontWeight: "700"},
  quoteRight: {alignItems: "flex-end"},
  change: {...tabularNumbers, fontSize: 15, fontWeight: "700"},
  timeRow: {marginTop: 7, flexDirection: "row", alignItems: "center", gap: 4},
  time: {fontSize: 10, color: colors.faint},
  rise: {color: colors.rise},
  fall: {color: colors.fall},
  muted: {color: colors.faint},
  sectionLabel: {marginTop: 24, marginBottom: 9, fontSize: 12, fontWeight: "700", color: colors.ink},
  sectionLabelNoMargin: {fontSize: 12, fontWeight: "700", color: colors.ink},
  tags: {flexDirection: "row", flexWrap: "wrap", gap: 7},
  primaryTag: {height: 29, paddingHorizontal: 10, justifyContent: "center", borderRadius: 5, backgroundColor: colors.inkBlue},
  primaryTagText: {fontSize: 11, fontWeight: "600", color: "#FFFFFF"},
  tag: {height: 29, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 5, backgroundColor: colors.surface},
  tagText: {fontSize: 11, color: colors.muted},
  summary: {fontSize: 15, lineHeight: 25, color: colors.ink},
  source: {marginTop: 8, fontSize: 10, color: colors.faint},
  studyLine: {marginTop: 25, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border},
  studyStatus: {marginTop: 4, fontSize: 13, color: colors.muted},
  studyButton: {height: 38, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 6, backgroundColor: colors.inkBlue},
  studyButtonText: {fontSize: 12, fontWeight: "700", color: "#FFFFFF"},
  noteInput: {minHeight: 104, padding: 12, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, backgroundColor: colors.surface, fontSize: 14, lineHeight: 21, color: colors.ink},
  saveButton: {height: 40, marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, backgroundColor: colors.surface},
  saveText: {fontSize: 12, fontWeight: "700", color: colors.inkBlue},
  disclosure: {marginTop: 26, textAlign: "center", fontSize: 10, color: colors.faint},
});
