import {EyeOff, RotateCcw, X} from "lucide-react-native";
import {useCallback, useEffect, useState} from "react";
import {Pressable, ScrollView, StyleSheet, Text, View} from "react-native";

import {RevealAnswer} from "./RevealAnswer";
import {StockCard} from "./StockCard";
import {StudySummary} from "./StudySummary";
import type {BinaryRating, PromptDirection, StudySession} from "./session";
import {colors, tabularNumbers} from "@/src/theme/tokens";

export function StudyScreen({
  session,
  direction,
  onDirectionChange,
  onRate,
  onUndo,
  onModeChange,
  onRestart,
  onClose,
  summary,
}: {
  session: StudySession;
  direction: PromptDirection;
  onDirectionChange?: (direction: PromptDirection) => void;
  onRate: (rating: BinaryRating) => Promise<void> | void;
  onUndo: () => Promise<void> | void;
  onModeChange?: (mode: "sequential" | "review") => void;
  onRestart?: () => void;
  onClose?: () => void;
  summary?: {remembered: number; again: number};
}) {
  const [revealed, setRevealed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setRevealed(false);
    setError("");
  }, [session.current?.stockId]);
  const submitRating = useCallback(async (rating: BinaryRating) => {
    if (!revealed || processing) return;
    setProcessing(true);
    setError("");
    try {
      await onRate(rating);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "学习记录保存失败");
    } finally {
      setProcessing(false);
    }
  }, [onRate, processing, revealed]);

  if (!session.current) {
    return <StudySummary studied={session.completedCount} remembered={summary?.remembered ?? 0} again={summary?.again ?? 0} onClose={onClose} onRestart={onRestart} onUndo={() => void onUndo()} />;
  }
  return (
    <View style={styles.root}>
      <View style={styles.topbar}>
        <View>
          <View style={styles.modeRow}>
            <Pressable accessibilityRole="button" accessibilityState={{selected: session.mode === "sequential"}} onPress={() => onModeChange?.("sequential")}>
              <Text style={[styles.deckLabel, session.mode === "sequential" && styles.modeActive]}>顺序学习</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{selected: session.mode === "review"}} onPress={() => onModeChange?.("review")}>
              <Text style={[styles.deckLabel, session.mode === "review" && styles.modeActive]}>智能复习</Text>
            </Pressable>
          </View>
          <Text style={styles.progress}>{session.completedCount + 1} / {session.total}</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="撤销上次评分" onPress={() => void onUndo()} style={styles.iconButton}>
            <RotateCcw size={19} color={colors.inkBlue} />
          </Pressable>
          {onClose ? (
            <Pressable accessibilityRole="button" accessibilityLabel="退出学习" onPress={onClose} style={styles.iconButton}>
              <X size={20} color={colors.inkBlue} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, {width: `${Math.round((session.completedCount / Math.max(session.total, 1)) * 100)}%`}]} /></View>
      <View style={styles.directionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{selected: direction === "name_to_profile"}}
          onPress={() => onDirectionChange?.("name_to_profile")}
          style={[styles.directionButton, direction === "name_to_profile" && styles.directionActive]}
        >
          <Text style={[styles.directionText, direction === "name_to_profile" && styles.directionTextActive]}>名称背资料</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{selected: direction === "code_to_name"}}
          onPress={() => onDirectionChange?.("code_to_name")}
          style={[styles.directionButton, direction === "code_to_name" && styles.directionActive]}
        >
          <EyeOff size={14} color={direction === "code_to_name" ? "#FFFFFF" : colors.inkBlue} />
          <Text style={[styles.directionText, direction === "code_to_name" && styles.directionTextActive]}>代码背名称</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <StockCard direction={direction} onReveal={() => setRevealed(true)} onSwipeRate={(rating) => void submitRating(rating)} revealed={revealed} stock={session.current} />
        {revealed ? <RevealAnswer stock={session.current} /> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="不熟悉"
          accessibilityState={{disabled: !revealed || processing}}
          disabled={!revealed || processing}
          onPress={() => void submitRating("again")}
          style={[styles.rateButton, styles.againButton, (!revealed || processing) && styles.disabled]}
        >
          <Text style={styles.againText}>不熟悉</Text>
          <Text style={styles.rateHint}>向左滑</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="记得"
          accessibilityState={{disabled: !revealed || processing}}
          disabled={!revealed || processing}
          onPress={() => void submitRating("good")}
          style={[styles.rateButton, styles.goodButton, (!revealed || processing) && styles.disabled]}
        >
          <Text style={styles.goodText}>记得</Text>
          <Text style={styles.goodHint}>向右滑</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.canvas},
  topbar: {height: 58, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between"},
  deckLabel: {fontSize: 10, fontWeight: "600", color: colors.muted},
  modeRow: {flexDirection: "row", gap: 10},
  modeActive: {color: colors.inkBlue, fontWeight: "700"},
  progress: {...tabularNumbers, marginTop: 2, fontSize: 15, fontWeight: "700", color: colors.inkBlueDark},
  iconButton: {width: 38, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 6, backgroundColor: colors.surface},
  topActions: {flexDirection: "row", gap: 7},
  progressTrack: {height: 3, backgroundColor: colors.border},
  progressFill: {height: 3, backgroundColor: colors.study},
  directionRow: {height: 52, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6},
  directionButton: {height: 32, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 5, backgroundColor: colors.surface},
  directionActive: {borderColor: colors.inkBlue, backgroundColor: colors.inkBlue},
  directionText: {fontSize: 11, fontWeight: "600", color: colors.inkBlue},
  directionTextActive: {color: "#FFFFFF"},
  content: {paddingHorizontal: 16, paddingBottom: 18},
  error: {marginTop: 10, fontSize: 11, color: colors.rise},
  actions: {height: 86, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, flexDirection: "row", gap: 10, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface},
  rateButton: {flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 6},
  againButton: {borderColor: "#D8A9A9", backgroundColor: "#FFF3F3"},
  goodButton: {borderColor: "#9CCBB8", backgroundColor: "#EDF8F2"},
  disabled: {opacity: 0.42},
  againText: {fontSize: 14, fontWeight: "700", color: colors.rise},
  goodText: {fontSize: 14, fontWeight: "700", color: colors.fall},
  rateHint: {marginTop: 3, fontSize: 9, color: "#9B5C5C"},
  goodHint: {marginTop: 3, fontSize: 9, color: "#4B7F68"},
});
