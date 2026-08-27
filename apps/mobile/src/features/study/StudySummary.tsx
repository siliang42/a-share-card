import {CheckCircle2, RotateCcw, X} from "lucide-react-native";
import {Pressable, StyleSheet, Text, View} from "react-native";

import {colors, tabularNumbers} from "@/src/theme/tokens";

export function StudySummary({
  studied,
  remembered,
  again,
  onRestart,
  onUndo,
  onClose,
}: {
  studied: number;
  remembered: number;
  again: number;
  onRestart?: () => void;
  onUndo?: () => void;
  onClose?: () => void;
}) {
  return (
    <View style={styles.root}>
      {onClose ? (
        <Pressable accessibilityRole="button" accessibilityLabel="退出学习" onPress={onClose} style={styles.closeButton}>
          <X size={20} color={colors.inkBlue} />
        </Pressable>
      ) : null}
      <CheckCircle2 size={42} color={colors.fall} />
      <Text style={styles.title}>本组学习完成</Text>
      <View style={styles.stats}>
        <View style={styles.stat}><Text style={styles.value}>{studied}</Text><Text style={styles.label}>已学习</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{remembered}</Text><Text style={styles.label}>记得</Text></View>
        <View style={styles.stat}><Text style={styles.value}>{again}</Text><Text style={styles.label}>不熟悉</Text></View>
      </View>
      {onRestart ? (
        <Pressable accessibilityRole="button" onPress={onRestart} style={styles.button}>
          <RotateCcw size={16} color={colors.inkBlue} />
          <Text style={styles.buttonText}>再学一遍</Text>
        </Pressable>
      ) : null}
      {onUndo ? (
        <Pressable accessibilityRole="button" onPress={onUndo} style={styles.undoButton}>
          <Text style={styles.undoText}>撤销上一步</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: colors.canvas},
  closeButton: {position: "absolute", top: 16, right: 16, width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, backgroundColor: colors.surface},
  title: {marginTop: 14, fontSize: 23, fontWeight: "700", color: colors.inkBlueDark},
  stats: {width: "100%", marginTop: 28, flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border},
  stat: {height: 82, flex: 1, alignItems: "center", justifyContent: "center"},
  value: {...tabularNumbers, fontSize: 23, fontWeight: "700", color: colors.ink},
  label: {marginTop: 4, fontSize: 11, color: colors.muted},
  button: {height: 42, marginTop: 24, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, backgroundColor: colors.surface},
  buttonText: {fontSize: 12, fontWeight: "700", color: colors.inkBlue},
  undoButton: {height: 36, marginTop: 10, justifyContent: "center", paddingHorizontal: 12},
  undoText: {fontSize: 11, color: colors.muted},
});
