import {bytesToHex} from "@noble/hashes/utils.js";
import {sha256} from "@noble/hashes/sha2.js";
import type {DatasetManifest} from "@gushi/contracts";
import {gunzipSync, strFromU8} from "fflate";

import type {PairingConfig} from "./config";
import {StockRepository, type SqlDatabase, type SqlStatement} from "@/src/db/repository";

type DatasetStock = {
  id: string;
  symbol: string;
  name: string;
  board: string;
  businessSummary?: string | null;
  businessSummarySource?: string | null;
};

type DatasetSector = {id: string; taxonomy: string; name: string};
type DatasetMembership = {stockId: string; sectorId: string};

type DatasetDocument = {
  version: string;
  generatedAt: string;
  stocks: DatasetStock[];
  sectors: DatasetSector[];
  memberships: DatasetMembership[];
};

export type DatasetApi = {
  getManifest: () => Promise<DatasetManifest>;
  downloadDataset: () => Promise<Uint8Array>;
};

export type SyncOutcome =
  | {kind: "up-to-date"; version: string}
  | {kind: "updated"; previousVersion: string | null; version: string; stockCount: number};

async function apiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({detail: response.statusText}));
    throw new Error(String(payload.detail ?? "本地服务请求失败"));
  }
  return response.json() as Promise<T>;
}

export function createDatasetApi(pairing: PairingConfig): DatasetApi {
  const headers = {Authorization: `Bearer ${pairing.token}`};
  const baseUrl = pairing.baseUrl.replace(/\/$/, "");
  return {
    getManifest: async () => apiResponse<DatasetManifest>(await fetch(`${baseUrl}/api/v1/sync/manifest`, {headers})),
    downloadDataset: async () => {
      const response = await fetch(`${baseUrl}/api/v1/sync/dataset`, {headers});
      if (!response.ok) throw new Error("数据集下载失败");
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}

function decodeDataset(manifest: DatasetManifest, payload: Uint8Array): DatasetDocument {
  if (payload.byteLength !== manifest.sizeBytes || bytesToHex(sha256(payload)) !== manifest.sha256) {
    throw new Error("数据校验失败：下载内容与发布清单不一致");
  }
  let document: DatasetDocument;
  try {
    document = JSON.parse(strFromU8(gunzipSync(payload))) as DatasetDocument;
  } catch {
    throw new Error("数据校验失败：数据集无法解压或解析");
  }
  if (document.version !== manifest.version
    || document.stocks.length !== manifest.stockCount
    || document.sectors.length !== manifest.sectorCount) {
    throw new Error("数据校验失败：数据集版本或数量不匹配");
  }
  const stockIds = new Set(document.stocks.map((stock) => stock.id));
  const sectorIds = new Set(document.sectors.map((sector) => sector.id));
  if (stockIds.size !== document.stocks.length || sectorIds.size !== document.sectors.length) {
    throw new Error("数据校验失败：标识重复");
  }
  for (const row of document.memberships) {
    if (!stockIds.has(row.stockId) || !sectorIds.has(row.sectorId)) {
      throw new Error("数据校验失败：板块关系引用了不存在的数据");
    }
  }
  return document;
}

async function executeRows(
  statement: SqlStatement,
  rows: unknown[][],
): Promise<void> {
  try {
    for (const row of rows) await statement.executeAsync(...row);
  } finally {
    await statement.finalizeAsync();
  }
}

export async function applyDataset(
  db: SqlDatabase,
  manifest: DatasetManifest,
  payload: Uint8Array,
): Promise<void> {
  const document = decodeDataset(manifest, payload);
  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM stock_sectors; DELETE FROM sectors; DELETE FROM stocks;");
    const stockStatement = await db.prepareAsync(
      `INSERT INTO stocks
        (id, symbol, name, board, business_summary, business_summary_source)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    await executeRows(stockStatement, document.stocks.map((stock) => [
      stock.id,
      stock.symbol,
      stock.name,
      stock.board,
      stock.businessSummary ?? null,
      stock.businessSummarySource ?? null,
    ]));
    const sectorStatement = await db.prepareAsync(
      "INSERT INTO sectors (id, taxonomy, name) VALUES (?, ?, ?)",
    );
    await executeRows(sectorStatement, document.sectors.map((sector) => [
      sector.id,
      sector.taxonomy,
      sector.name,
    ]));
    const membershipStatement = await db.prepareAsync(
      "INSERT INTO stock_sectors (stock_id, sector_id) VALUES (?, ?)",
    );
    await executeRows(membershipStatement, document.memberships.map((row) => [row.stockId, row.sectorId]));
    await new StockRepository(db).saveManifest(manifest);
  });
}

export async function syncDataset(api: DatasetApi, db: SqlDatabase): Promise<SyncOutcome> {
  const repository = new StockRepository(db);
  const previous = await repository.getManifest();
  const manifest = await api.getManifest();
  if (previous?.version === manifest.version) {
    return {kind: "up-to-date", version: manifest.version};
  }
  const payload = await api.downloadDataset();
  await applyDataset(db, manifest, payload);
  return {
    kind: "updated",
    previousVersion: previous?.version ?? null,
    version: manifest.version,
    stockCount: manifest.stockCount,
  };
}
