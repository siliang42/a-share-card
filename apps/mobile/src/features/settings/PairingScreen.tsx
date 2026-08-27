import {Ionicons} from "@expo/vector-icons";
import {useState} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type {PairingConfig} from "@/src/api/config";

export function PairingScreen({
  initialBaseUrl,
  onPair,
}: {
  initialBaseUrl: string;
  onPair: (config: PairingConfig) => Promise<void>;
}) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await onPair({baseUrl: baseUrl.trim(), token: token.trim()});
      setMessage("连接信息已保存");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "连接信息保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <View style={styles.iconStage}><Ionicons name="phone-portrait-outline" size={25} color="#173F6F" /></View>
          <View style={styles.headingCopy}>
            <Text style={styles.eyebrow}>LOCAL CONNECTION</Text>
            <Text style={styles.title}>连接 Mac 数据服务</Text>
          </View>
        </View>
        <Text style={styles.supporting}>手机和 Mac 处于同一局域网时，可同步股票资料并刷新行情。</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Mac 服务地址</Text>
          <TextInput
            accessibilityLabel="Mac 服务地址"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.1.8:8000"
            placeholderTextColor="#8B98A5"
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>配对令牌</Text>
          <TextInput
            accessibilityLabel="配对令牌"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="扫描后台二维码或输入令牌"
            placeholderTextColor="#8B98A5"
            secureTextEntry
            style={styles.input}
            value={token}
            onChangeText={setToken}
          />
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="保存并连接"
          disabled={saving || !baseUrl.trim() || !token.trim()}
          onPress={submit}
          style={({pressed}) => [styles.button, pressed && styles.buttonPressed, saving && styles.buttonDisabled]}
        >
          <Ionicons name="link-outline" size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>{saving ? "正在保存" : "保存并连接"}</Text>
        </Pressable>
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={17} color="#21855B" />
          <Text style={styles.noticeText}>令牌保存在系统安全存储中，不会写入学习数据备份。</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: "#F4F6F8"},
  content: {padding: 22, paddingTop: 36, paddingBottom: 48},
  heading: {flexDirection: "row", alignItems: "center", gap: 12},
  iconStage: {width: 46, height: 46, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF0F7"},
  headingCopy: {flex: 1},
  eyebrow: {fontSize: 10, fontWeight: "700", color: "#173F6F"},
  title: {marginTop: 3, fontSize: 23, lineHeight: 30, fontWeight: "700", color: "#102D50"},
  supporting: {marginTop: 18, marginBottom: 26, fontSize: 14, lineHeight: 22, color: "#677584"},
  field: {gap: 7, marginBottom: 17},
  label: {fontSize: 13, fontWeight: "600", color: "#33414E"},
  input: {height: 48, borderWidth: 1, borderColor: "#C4CDD6", borderRadius: 6, paddingHorizontal: 13, backgroundColor: "#FFFFFF", color: "#1B2733", fontSize: 15},
  error: {marginBottom: 12, color: "#A72D2D", lineHeight: 20},
  success: {marginBottom: 12, color: "#21855B", fontWeight: "600"},
  button: {height: 48, borderRadius: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#173F6F"},
  buttonPressed: {backgroundColor: "#102D50"},
  buttonDisabled: {opacity: 0.55},
  buttonText: {fontSize: 15, fontWeight: "700", color: "#FFFFFF"},
  notice: {marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#DBE1E7", flexDirection: "row", alignItems: "flex-start", gap: 9},
  noticeText: {flex: 1, fontSize: 12, lineHeight: 19, color: "#677584"},
});
