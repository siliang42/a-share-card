import {afterEach, describe, expect, it, vi} from "vitest";

import {GET} from "@/app/api/[...path]/route";


afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GUSHI_API_URL;
  delete process.env.GUSHI_PAIRING_TOKEN;
});

describe("admin API proxy", () => {
  it("injects the server token and preserves path and query", async () => {
    process.env.GUSHI_API_URL = "http://api:8000";
    process.env.GUSHI_PAIRING_TOKEN = "server-only-token";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({items: [], total: 0}), {
        status: 200,
        headers: {"Content-Type": "application/json"},
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new Request("http://localhost:3000/api/v1/stocks?limit=5"),
      {params: Promise.resolve({path: ["v1", "stocks"]})},
    );

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api:8000/api/v1/stocks?limit=5");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer server-only-token");
  });
});
