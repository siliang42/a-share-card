import {createContext, type PropsWithChildren, useContext, useEffect, useState} from "react";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";

import {openDatabase, type SqlDatabase} from "./repository";
import {colors} from "@/src/theme/tokens";

const DatabaseContext = createContext<SqlDatabase | null>(null);

export function DatabaseProvider({children}: PropsWithChildren) {
  const [database, setDatabase] = useState<SqlDatabase | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    openDatabase().then((db) => {
      if (active) setDatabase(db);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "本地数据库初始化失败");
    });
    return () => { active = false; };
  }, []);
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;
  if (!database) return <View style={styles.center}><ActivityIndicator color={colors.inkBlue} /><Text style={styles.loading}>正在载入离线资料</Text></View>;
  return <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): SqlDatabase {
  const database = useContext(DatabaseContext);
  if (!database) throw new Error("DatabaseProvider is missing");
  return database;
}

const styles = StyleSheet.create({
  center: {flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.canvas},
  loading: {fontSize: 12, color: colors.muted},
  error: {padding: 24, textAlign: "center", fontSize: 13, lineHeight: 20, color: colors.rise},
});
