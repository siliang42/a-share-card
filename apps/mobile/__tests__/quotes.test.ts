import {refreshVisibleQuotes} from "@/src/api/quotes";
import {runMigrations} from "@/src/db/migrations";

import {NodeTestDatabase} from "./support/database";

describe("visible quote refresh", () => {
  it("caches visible quotes and does not poll the same stock inside 15 seconds", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    await db.execAsync("INSERT INTO stocks (id, symbol, name, board) VALUES ('SZ:000400', '000400', '许继电气', 'SZ_MAIN')");
    const api = jest.fn().mockResolvedValue([{stockId: "SZ:000400", price: 31.42, changePercent: -2.18, source: "eastmoney", sourceTime: "2026-08-27T06:58:00Z", freshness: "fresh"}]);

    const first = await refreshVisibleQuotes(api, db, ["SZ:000400"], new Date("2026-08-27T06:58:01Z"));
    const second = await refreshVisibleQuotes(api, db, ["SZ:000400"], new Date("2026-08-27T06:58:10Z"));

    expect(first[0]).toMatchObject({stockId: "SZ:000400", price: 31.42, changePercent: -2.18});
    expect(second[0]).toMatchObject({freshness: "fresh"});
    expect(api).toHaveBeenCalledTimes(1);
    db.close();
  });
});
