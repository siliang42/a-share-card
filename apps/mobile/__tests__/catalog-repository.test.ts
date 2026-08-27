import {FavoritesRepository} from "@/src/features/favorites/favoritesRepository";
import {StockRepository} from "@/src/db/repository";
import {runMigrations} from "@/src/db/migrations";

import {NodeTestDatabase} from "./support/database";

describe("offline catalog repositories", () => {
  it("builds market and sector decks from synchronized rows", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    await db.execAsync(`
      INSERT INTO stocks (id, symbol, name, board) VALUES
        ('SH:600519', '600519', '贵州茅台', 'sh_main'),
        ('SZ:000400', '000400', '许继电气', 'sz_main');
      INSERT INTO sectors (id, taxonomy, name) VALUES
        ('shenwan:801120', 'shenwan', '食品饮料'),
        ('concept:bk0456', 'concept', '智能电网');
      INSERT INTO stock_sectors (stock_id, sector_id) VALUES
        ('SH:600519', 'shenwan:801120'),
        ('SZ:000400', 'concept:bk0456');
    `);

    const catalog = await new StockRepository(db).getCatalog();

    expect(catalog.markets).toEqual(expect.arrayContaining([
      expect.objectContaining({id: "market:sh_main", name: "沪市主板", stockCount: 1}),
      expect.objectContaining({id: "market:sz_main", name: "深市主板", stockCount: 1}),
    ]));
    expect(catalog.sectors).toEqual(expect.arrayContaining([
      expect.objectContaining({id: "sector:concept:bk0456", name: "智能电网", taxonomy: "concept"}),
    ]));
    db.close();
  });

  it("persists favorites and notes independently from reference data", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const favorites = new FavoritesRepository(db);

    await favorites.setFavorite("SZ:000400", true);
    await favorites.saveNote("SZ:000400", "重点记忆：特高压与继保");

    expect(await favorites.isFavorite("SZ:000400")).toBe(true);
    expect(await favorites.getNote("SZ:000400")).toBe("重点记忆：特高压与继保");
    await favorites.setFavorite("SZ:000400", false);
    expect(await favorites.isFavorite("SZ:000400")).toBe(false);
    db.close();
  });
});
