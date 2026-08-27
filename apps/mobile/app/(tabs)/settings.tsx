import {useFocusEffect} from "expo-router";
import {useCallback, useState} from "react";
import {StyleSheet, View} from "react-native";

import {loadPairing, savePairing, type PairingConfig} from "@/src/api/config";
import {createDatasetApi, syncDataset} from "@/src/api/sync";
import {useDatabase} from "@/src/db/DatabaseProvider";
import {StockRepository, type LocalManifest} from "@/src/db/repository";
import {PairingScreen} from "@/src/features/settings/PairingScreen";
import {SyncStatus} from "@/src/features/settings/SyncStatus";
import {colors} from "@/src/theme/tokens";

export default function SettingsRoute() {
  const db = useDatabase();
  const [baseUrl, setBaseUrl] = useState("");
  const [manifest, setManifest] = useState<LocalManifest | null>(null);
  const [syncError, setSyncError] = useState("");
  const load = useCallback(async () => {
    const [pairing, localManifest] = await Promise.all([loadPairing(db), new StockRepository(db).getManifest()]);
    setBaseUrl(pairing?.baseUrl ?? "");
    setManifest(localManifest);
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function pair(config: PairingConfig) {
    const pairing = await savePairing(db, config);
    setBaseUrl(pairing.baseUrl);
    setSyncError("");
    try {
      await syncDataset(createDatasetApi(pairing), db);
      setManifest(await new StockRepository(db).getManifest());
    } catch (reason) {
      setSyncError(reason instanceof Error ? reason.message : "数据同步失败");
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.status}>
        <SyncStatus error={syncError} version={manifest?.version ?? null} appliedAt={manifest?.appliedAt ?? null} />
      </View>
      <PairingScreen initialBaseUrl={baseUrl} onPair={pair} />
    </View>
  );
}

const styles = StyleSheet.create({root: {flex: 1, backgroundColor: colors.canvas}, status: {paddingHorizontal: 22, paddingTop: 14}});
