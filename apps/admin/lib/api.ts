import type {
  Catalog,
  Dashboard,
  ImportPreview,
  ImportResult,
  PairingInfo,
  QuoteBatch,
  Stock,
  StockList,
  StockOverrideUpdate,
  SyncResult,
} from "@gushi/contracts";

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof Blob) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {...init, headers});
  if (!response.ok) {
    const payload = await response.json().catch(() => ({detail: response.statusText}));
    throw new AdminApiError(response.status, String(payload.detail ?? response.statusText));
  }
  return response.json() as Promise<T>;
}

export function getAdminDashboard(): Promise<Dashboard> {
  return request("/api/v1/admin/dashboard");
}

export function getCatalog(): Promise<Catalog> {
  return request("/api/v1/catalog");
}

export function getStocks(params: {
  query?: string;
  board?: string;
  sectorId?: string;
  status?: string;
  cursor?: string;
  limit?: number;
} = {}): Promise<StockList> {
  const search = new URLSearchParams();
  const values: Record<string, string | number | undefined> = {
    query: params.query,
    board: params.board,
    sector_id: params.sectorId,
    status: params.status,
    cursor: params.cursor,
    limit: params.limit,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  return request(`/api/v1/stocks${search.size ? `?${search.toString()}` : ""}`);
}

export function getQuotes(stockIds: string[]): Promise<QuoteBatch> {
  const search = new URLSearchParams({ids: stockIds.join(",")});
  return request(`/api/v1/quotes?${search.toString()}`);
}

export function saveStockOverride(stockId: string, update: StockOverrideUpdate): Promise<Stock> {
  return request(`/api/v1/admin/stocks/${encodeURIComponent(stockId)}`, {
    method: "PATCH",
    body: JSON.stringify(update),
  });
}

export function runSync(kind: string): Promise<SyncResult> {
  return request("/api/v1/admin/sync", {
    method: "POST",
    body: JSON.stringify({kind}),
  });
}

export function getPairing(): Promise<PairingInfo> {
  return request("/api/v1/admin/pairing");
}

export function previewCsv(
  kind: "stock_overrides" | "manual_stocks",
  file: Blob,
): Promise<ImportPreview> {
  return request(`/api/v1/admin/imports/preview?kind=${kind}`, {
    method: "POST",
    headers: {"Content-Type": "text/csv"},
    body: file,
  });
}

export function applyCsv(batchId: string): Promise<ImportResult> {
  return request(`/api/v1/admin/imports/${encodeURIComponent(batchId)}/apply`, {method: "POST"});
}

export function exportCsvUrl(kind: "stock_overrides" | "manual_stocks" | "stocks"): string {
  return `/api/v1/admin/exports/${kind}`;
}
