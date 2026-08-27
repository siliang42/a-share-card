import {Ionicons} from "@expo/vector-icons";
import {StyleSheet, Text, View} from "react-native";

export function SyncStatus({
  version,
  appliedAt,
  error,
}: {
  version: string | null;
  appliedAt: string | null;
  error?: string | null;
}) {
  return (
    <View style={[styles.root, error ? styles.errorRoot : undefined]}>
      <Ionicons
        name={error ? "warning-outline" : version ? "checkmark-circle-outline" : "cloud-offline-outline"}
        size={20}
        color={error ? "#A72D2D" : version ? "#21855B" : "#677584"}
      />
      <View style={styles.copy}>
        <Text style={styles.label}>{error ? "同步未完成" : version ? "离线数据可用" : "尚未同步数据"}</Text>
        <Text style={styles.detail}>
          {error ?? (version ? `版本 ${version}${appliedAt ? ` · ${appliedAt}` : ""}` : "连接 Mac 后下载首个数据集")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flexDirection: "row", gap: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: "#21855B", backgroundColor: "#F3FAF6"},
  errorRoot: {borderLeftColor: "#C83A3A", backgroundColor: "#FFF2F2"},
  copy: {flex: 1, gap: 3},
  label: {fontSize: 13, fontWeight: "700", color: "#1B2733"},
  detail: {fontSize: 11, lineHeight: 17, color: "#677584"},
});
