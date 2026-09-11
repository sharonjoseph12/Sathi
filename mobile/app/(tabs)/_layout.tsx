/**
 * Tab navigator — mirrors the website TABS (App.tsx):
 * Home, Meds, Chat, Care / Family, More, filtered by role.
 * (Patients see Care; family members see Family instead. Full Family
 * screen stays reachable via More for everyone, like #/family on web.)
 */

import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useAdaptiveProfile } from "../../lib/useAdaptiveProfile";
import { useApp } from "../../lib/store";
import { getTheme, FONT } from "../../lib/theme";

function TabIcon({ emoji }: { emoji: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
    </View>
  );
}

export default function TabLayout() {
  const profile = useAdaptiveProfile();
  const { me } = useApp();
  const theme = getTheme(profile.themeMode);
  const role = me?.role ?? "patient";

  const showHome = role === "patient";
  const showMeds = role === "patient";
  const showCare = role !== "family";
  const showFamily = role === "family";

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: theme.primary,
      tabBarInactiveTintColor: theme.mutedFg,
      tabBarStyle: {
        backgroundColor: theme.card,
        borderTopColor: theme.border,
        height: profile.isElder ? 80 : 64,
        paddingBottom: profile.isElder ? 12 : 8,
        paddingTop: 8,
      },
      tabBarLabelStyle: {
        fontSize: profile.isElder ? 13 : 11,
        fontWeight: "700",
        fontFamily: FONT.bold,
      },
    }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Home", href: showHome ? undefined : null, tabBarIcon: () => <TabIcon emoji="🏠" /> }}
      />
      <Tabs.Screen
        name="medicines"
        options={{ title: "Meds", href: showMeds ? undefined : null, tabBarIcon: () => <TabIcon emoji="💊" /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: "Chat", tabBarIcon: () => <TabIcon emoji="💬" /> }}
      />
      <Tabs.Screen
        name="care"
        options={{ title: "Care", href: showCare ? undefined : null, tabBarIcon: () => <TabIcon emoji="👥" /> }}
      />
      <Tabs.Screen
        name="family"
        options={{ title: "Family", href: showFamily ? undefined : null, tabBarIcon: () => <TabIcon emoji="👪" /> }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: () => <TabIcon emoji="☰" /> }}
      />
    </Tabs>
  );
}
