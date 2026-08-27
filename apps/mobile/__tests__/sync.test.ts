import type {DatasetManifest} from "@gushi/contracts";

import {syncDataset, type DatasetApi} from "@/src/api/sync";
import {runMigrations} from "@/src/db/migrations";
import {StockRepository} from "@/src/db/repository";
import {NodeTestDatabase} from "./support/database";
import {datasetFixture} from "./support/dataset";

describe("dataset synchronization", () => {
  it("keeps the previous dataset when checksum validation fails", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const repository = new StockRepository(db);
    const first = datasetFixture("v1");
    await repository.saveManifest(first.manifest);
    const next = datasetFixture("v2");
    const badManifest: DatasetManifest = {...next.manifest, sha256: "0".repeat(64)};
    const api: DatasetApi = {
      getManifest: async () => badManifest,
      downloadDataset: async () => next.payload,
    };

    await expect(syncDataset(api, db)).rejects.toThrow("数据校验失败");

    expect(await repository.getManifest()).toMatchObject({version: "v1"});
    db.close();
  });

  it("does not download an unchanged dataset", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const repository = new StockRepository(db);
    const fixture = datasetFixture("v1");
    await repository.saveManifest(fixture.manifest);
    const downloadDataset = jest.fn(async () => fixture.payload);
    const api: DatasetApi = {getManifest: async () => fixture.manifest, downloadDataset};

    await expect(syncDataset(api, db)).resolves.toEqual({kind: "up-to-date", version: "v1"});
    expect(downloadDataset).not.toHaveBeenCalled();
    db.close();
  });

  it("publishes a new manifest only after a complete transaction", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const fixture = datasetFixture("v2");
    const api: DatasetApi = {
      getManifest: async () => fixture.manifest,
      downloadDataset: async () => fixture.payload,
    };

    await expect(syncDataset(api, db)).resolves.toEqual({
      kind: "updated",
      previousVersion: null,
      version: "v2",
      stockCount: 1,
    });
    expect(await new StockRepository(db).getManifest()).toMatchObject({version: "v2"});
    db.close();
  });
});
