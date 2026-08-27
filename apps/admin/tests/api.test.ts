import {afterEach, describe, expect, it, vi} from "vitest";

import {getAdminDashboard, getStocks, saveStockOverride} from "@/lib/api";


afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin browser API", () => {
  it("uses the same-origin proxy without exposing the pairing token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        datasetVersion: null,
        stockCount: 0,
        sectorCount: 0,
        pendingConfirmationCount: 0,
        staleQuoteCount: 0,
        recentSyncs: [],
      }), {status: 200, headers: {"Content-Type": "application/json"}}),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getAdminDashboard();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/admin/dashboard", expect.objectContaining({
      headers: expect.not.objectContaining({Authorization: expect.anything()}),
    }));
  });

  it("maps stock filters to FastAPI query names and encodes stock ids", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({items: [], total: 0}), {status: 200}))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: "SH:600519",
        exchange: "SH",
        symbol: "600519",
        name: "贵州茅台",
        board: "SH_MAIN",
        listingStatus: "active",
        sectors: [],
      }), {status: 200}));
    vi.stubGlobal("fetch", fetchMock);

    await getStocks({query: "茅台", sectorId: "shenwan:801120", limit: 50});
    await saveStockOverride("SH:600519", {notes: "核心资产"});

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/v1/stocks?query=%E8%8C%85%E5%8F%B0&sector_id=shenwan%3A801120&limit=50",
    );
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/admin/stocks/SH%3A600519");
  });
});
