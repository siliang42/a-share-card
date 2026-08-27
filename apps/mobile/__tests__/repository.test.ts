import {applyDataset} from "@/src/api/sync";
import {runMigrations} from "@/src/db/migrations";
import {StockRepository} from "@/src/db/repository";
import {NodeTestDatabase} from "./support/database";
import {datasetFixture} from "./support/dataset";

describe("mobile repository", () => {
  it("retains learning progress while replacing reference rows", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const repository = new StockRepository(db);
    await repository.saveProgress({
      stockId: "SZ:000400",
      direction: "name_to_profile",
      stateJson: "{\"state\":\"learning\"}",
      dueAt: "2026-08-28T00:00:00Z",
    });
    const {manifest, payload} = datasetFixture();

    await applyDataset(db, manifest, payload);

    expect(await repository.getManifest()).toMatchObject({version: "v2", stockCount: 1});
    expect(await repository.getProgress("SZ:000400", "name_to_profile")).toMatchObject({
      stockId: "SZ:000400",
      direction: "name_to_profile",
    });
    expect(await repository.getStock("SZ:000400")).toMatchObject({name: "许继电气"});
    db.close();
  });

  it("stores non-secret settings in SQLite", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const repository = new StockRepository(db);

    await repository.setSetting("pairing_base_url", "http://192.168.1.8:8000");

    expect(await repository.getSetting("pairing_base_url")).toBe("http://192.168.1.8:8000");
    db.close();
  });
});
