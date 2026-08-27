import * as SecureStore from "expo-secure-store";

import {StockRepository, type SqlDatabase} from "@/src/db/repository";

const TOKEN_KEY = "gushi_pairing_token";
const BASE_URL_KEY = "pairing_base_url";

export type PairingConfig = {
  baseUrl: string;
  token: string;
};

export type SecretStore = {
  setItemAsync: (key: string, value: string) => Promise<void>;
  getItemAsync: (key: string) => Promise<string | null>;
  deleteItemAsync: (key: string) => Promise<void>;
};

function normalizePairing(config: PairingConfig): PairingConfig {
  const token = config.token.trim();
  let url: URL;
  try {
    url = new URL(config.baseUrl.trim());
  } catch {
    throw new Error("请输入完整的 Mac 服务地址");
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error("Mac 服务地址必须使用 http 或 https");
  }
  if (!token) throw new Error("配对令牌不能为空");
  return {baseUrl: url.toString().replace(/\/$/, ""), token};
}

export async function savePairing(
  db: SqlDatabase,
  config: PairingConfig,
  secretStore: SecretStore = SecureStore,
): Promise<PairingConfig> {
  const normalized = normalizePairing(config);
  await new StockRepository(db).setSetting(BASE_URL_KEY, normalized.baseUrl);
  await secretStore.setItemAsync(TOKEN_KEY, normalized.token);
  return normalized;
}

export async function loadPairing(
  db: SqlDatabase,
  secretStore: SecretStore = SecureStore,
): Promise<PairingConfig | null> {
  const [baseUrl, token] = await Promise.all([
    new StockRepository(db).getSetting(BASE_URL_KEY),
    secretStore.getItemAsync(TOKEN_KEY),
  ]);
  return baseUrl && token ? {baseUrl, token} : null;
}

export async function clearPairing(
  db: SqlDatabase,
  secretStore: SecretStore = SecureStore,
): Promise<void> {
  await new StockRepository(db).setSetting(BASE_URL_KEY, "");
  await secretStore.deleteItemAsync(TOKEN_KEY);
}
