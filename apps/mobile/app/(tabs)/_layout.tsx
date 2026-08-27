import {Tabs} from "expo-router";
import {BookOpen, Bookmark, Settings, Store} from "lucide-react-native";

import {colors} from "@/src/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.inkBlue,
      tabBarInactiveTintColor: colors.faint,
      tabBarLabelStyle: {fontSize: 10, fontWeight: "600"},
      tabBarStyle: {height: 66, paddingTop: 6, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: colors.surface},
    }}>
      <Tabs.Screen name="index" options={{title: "今日", tabBarIcon: ({color, size}) => <BookOpen color={color} size={size} />}} />
      <Tabs.Screen name="markets" options={{title: "市场", tabBarIcon: ({color, size}) => <Store color={color} size={size} />}} />
      <Tabs.Screen name="favorites" options={{title: "收藏", tabBarIcon: ({color, size}) => <Bookmark color={color} size={size} />}} />
      <Tabs.Screen name="settings" options={{title: "设置", tabBarIcon: ({color, size}) => <Settings color={color} size={size} />}} />
    </Tabs>
  );
}
