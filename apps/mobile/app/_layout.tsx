import {Stack} from "expo-router";
import {StatusBar} from "expo-status-bar";

import {DatabaseProvider} from "@/src/db/DatabaseProvider";
import {colors} from "@/src/theme/tokens";

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{contentStyle: {backgroundColor: colors.canvas}, headerShadowVisible: false, headerTintColor: colors.inkBlue}}>
        <Stack.Screen name="(tabs)" options={{headerShown: false}} />
        <Stack.Screen name="deck/[deckId]" options={{title: "股票列表", headerBackTitle: "市场"}} />
        <Stack.Screen name="stock/[stockId]" options={{title: "股票资料", headerBackTitle: "列表"}} />
        <Stack.Screen name="study/[deckId]" options={{title: "卡片学习", headerShown: false}} />
      </Stack>
    </DatabaseProvider>
  );
}
