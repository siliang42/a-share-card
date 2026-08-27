import {bytesToHex} from "@noble/hashes/utils.js";
import {sha256} from "@noble/hashes/sha2.js";
import type {DatasetManifest} from "@gushi/contracts";
import {gzipSync} from "fflate";

export function datasetFixture(version = "v2") {
  const document = {
    version,
    generatedAt: "2026-08-27T05:00:00Z",
    stocks: [{
      id: "SZ:000400",
      symbol: "000400",
      name: "许继电气",
      board: "SZ_MAIN",
      businessSummary: "电网自动化与特高压设备",
      businessSummarySource: "manual",
    }],
    sectors: [{id: "shenwan:801730", taxonomy: "shenwan", name: "电力设备"}],
    memberships: [{stockId: "SZ:000400", sectorId: "shenwan:801730"}],
  };
  const payload = gzipSync(new TextEncoder().encode(JSON.stringify(document)), {mtime: 0});
  const manifest: DatasetManifest = {
    version,
    generatedAt: document.generatedAt,
    sha256: bytesToHex(sha256(payload)),
    sizeBytes: payload.byteLength,
    stockCount: document.stocks.length,
    sectorCount: document.sectors.length,
  };
  return {document, manifest, payload};
}
