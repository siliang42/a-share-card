import {loadPairing, savePairing, type SecretStore} from "@/src/api/config";
import {runMigrations} from "@/src/db/migrations";
import {StockRepository} from "@/src/db/repository";
import {NodeTestDatabase} from "./support/database";

describe("mobile pairing configuration", () => {
  it("stores only the base URL in SQLite and keeps the token in secure storage", async () => {
    const db = new NodeTestDatabase();
    await runMigrations(db);
    const secrets = new Map<string, string>();
    const secretStore: SecretStore = {
      setItemAsync: async (key, value) => { secrets.set(key, value); },
      getItemAsync: async (key) => secrets.get(key) ?? null,
      deleteItemAsync: async (key) => { secrets.delete(key); },
    };

    await savePairing(db, {
      baseUrl: " http://192.168.1.8:8000/ ",
      token: " local-secret-token ",
    }, secretStore);

    const repository = new StockRepository(db);
    expect(await repository.getSetting("pairing_base_url")).toBe("http://192.168.1.8:8000");
    expect(await repository.getSetting("pairing_token")).toBeNull();
    await expect(loadPairing(db, secretStore)).resolves.toEqual({
      baseUrl: "http://192.168.1.8:8000",
      token: "local-secret-token",
    });
    db.close();
  });
});
