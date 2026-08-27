import type { components } from "./schema.js";

export type ApiConfig = {
  baseUrl: string;
  token: string;
};

export type DatasetManifest = components["schemas"]["ManifestResponse"];
export type Catalog = components["schemas"]["CatalogResponse"];
export type Stock = components["schemas"]["StockResponse"];
export type StockList = components["schemas"]["StockListResponse"];
export type QuoteBatch = components["schemas"]["QuoteBatchResponse"];
export type Dashboard = components["schemas"]["DashboardResponse"];
export type PairingInfo = components["schemas"]["PairingResponse"];
export type ImportPreview = components["schemas"]["ImportPreviewResponse"];
export type ImportResult = components["schemas"]["ImportApplyResponse"];
export type SyncResult = components["schemas"]["SyncResponse"];
export type StockOverrideUpdate = components["schemas"]["StockOverrideUpdate"];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function request<T>(
  config: ApiConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      ...(init.body && !(init.body instanceof Uint8Array)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: response.statusText }));
    throw new ApiError(response.status, String(payload.detail ?? response.statusText));
  }
  return response.json() as Promise<T>;
}

export function getManifest(config: ApiConfig): Promise<DatasetManifest> {
  return request(config, "/api/v1/sync/manifest");
}

export async function downloadDataset(config: ApiConfig): Promise<ArrayBuffer> {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/api/v1/sync/dataset`, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!response.ok) {
    throw new ApiError(response.status, "数据集下载失败");
  }
  return response.arrayBuffer();
}

export function getCatalog(config: ApiConfig): Promise<Catalog> {
  return request(config, "/api/v1/catalog");
}

export function listStocks(
  config: ApiConfig,
  params: {
    query?: string;
    board?: string;
    sectorId?: string;
    cursor?: string;
    limit?: number;
  } = {},
): Promise<StockList> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  const suffix = search.size ? `?${search.toString()}` : "";
  return request(config, `/api/v1/stocks${suffix}`);
}

export function getQuotes(config: ApiConfig, ids: string[]): Promise<QuoteBatch> {
  const search = new URLSearchParams({ ids: ids.join(",") });
  return request(config, `/api/v1/quotes?${search.toString()}`);
}

export function getDashboard(config: ApiConfig): Promise<Dashboard> {
  return request(config, "/api/v1/admin/dashboard");
}

export function getPairingInfo(config: ApiConfig): Promise<PairingInfo> {
  return request(config, "/api/v1/admin/pairing");
}

export function updateStockOverride(
  config: ApiConfig,
  stockId: string,
  update: StockOverrideUpdate,
): Promise<Stock> {
  return request(config, `/api/v1/admin/stocks/${encodeURIComponent(stockId)}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export function triggerSync(config: ApiConfig, kind: string): Promise<SyncResult> {
  return request(config, "/api/v1/admin/sync", {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}

export function previewImport(
  config: ApiConfig,
  kind: "stock_overrides" | "manual_stocks",
  content: Uint8Array,
): Promise<ImportPreview> {
  return request(config, `/api/v1/admin/imports/preview?kind=${kind}`, {
    method: "POST",
    headers: { "Content-Type": "text/csv" },
    body: content as unknown as BodyInit,
  });
}

export function applyImport(config: ApiConfig, batchId: string): Promise<ImportResult> {
  return request(config, `/api/v1/admin/imports/${encodeURIComponent(batchId)}/apply`, {
    method: "POST",
  });
}
