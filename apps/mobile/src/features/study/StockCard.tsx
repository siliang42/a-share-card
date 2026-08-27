import {Eye} from "lucide-react-native";
import {useMemo} from "react";
import {PanResponder, Pressable, StyleSheet, Text, View} from "react-native";

import type {BinaryRating, PromptDirection, StudyStock} from "./session";
import {boardLabels, colors, tabularNumbers} from "@/src/theme/tokens";

export function StockCard({
  stock,
  direction,
  revealed,
  onReveal,
  onSwipeRate,
}: {
  stock: StudyStock;
  direction: PromptDirection;
  revealed: boolean;
  onReveal: () => void;
  onSwipeRate: (rating: BinaryRating) => void;
}) {
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => revealed && Math.abs(gesture.dx) > 12,
    onPanResponderRelease: (_, gesture) => {
      if (!revealed) return;
      if (gesture.dx <= -72) onSwipeRate("again");
      if (gesture.dx >= 72) onSwipeRate("good");
    },
  }), [onSwipeRate, revealed]);
  const prompt = direction === "name_to_profile" ? stock.name : stock.symbol;
  const supporting = direction === "name_to_profile"
    ? stock.sectors.slice(0, 2).join(" · ") || "回忆代码与主营"
    : `${boardLabels[stock.board] ?? stock.board} · 回忆股票名称`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={revealed ? "答案已显示" : "显示答案"}
      onPress={revealed ? undefined : onReveal}
      style={({pressed}) => [styles.card, pressed && !revealed && styles.pressed]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.promptType}>{direction === "name_to_profile" ? "名称 → 代码与主营" : "代码 → 名称"}</Text>
      <View style={styles.promptCenter}>
        <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={direction === "name_to_profile" ? styles.namePrompt : styles.codePrompt}>{prompt}</Text>
        <Text style={styles.clue} numberOfLines={2}>{supporting}</Text>
      </View>
      {!revealed ? (
        <View style={styles.revealHint}>
          <Eye size={17} color={colors.inkBlue} />
          <Text style={styles.revealText}>显示答案</Text>
        </View>
      ) : <Text style={styles.swipeHint}>左滑不熟悉 · 右滑记得</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {height: 268, padding: 20, justifyContent: "space-between", borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 8, backgroundColor: colors.surface},
  pressed: {backgroundColor: "#F8FAFC"},
  promptType: {fontSize: 10, fontWeight: "700", color: colors.inkBlue},
  promptCenter: {alignItems: "center", paddingHorizontal: 4},
  namePrompt: {fontSize: 34, lineHeight: 42, fontWeight: "700", color: colors.inkBlueDark},
  codePrompt: {...tabularNumbers, fontSize: 37, lineHeight: 45, fontWeight: "700", color: colors.inkBlueDark},
  clue: {marginTop: 13, textAlign: "center", fontSize: 13, lineHeight: 20, color: colors.muted},
  revealHint: {height: 38, alignSelf: "center", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 5, backgroundColor: "#E8EEF5"},
  revealText: {fontSize: 12, fontWeight: "700", color: colors.inkBlue},
  swipeHint: {textAlign: "center", fontSize: 10, color: colors.faint},
});
