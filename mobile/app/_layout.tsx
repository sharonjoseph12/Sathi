/**
 * Root layout — Inter type (like the website), auth gating, and the shared
 * website-style AppHeader above every authenticated screen.
 */

import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { AppProvider, useApp } from "../lib/store";
import { AppHeader } from "../components/AppHeader";
import { useTheme } from "../components/ui";

void SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { me, loading } = useApp();
  const t = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    const onOnboarding =
      inAuthGroup && (segments[1] as string) === "onboarding";

    if (!me && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (me && inAuthGroup && !onOnboarding) {
      // Let newly registered users finish onboarding before entering tabs.
      router.replace("/(tabs)");
    }
  }, [me, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f4f5f7" }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  const showHeader = !!me && segments[0] !== "(auth)";

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {showHeader ? (
        <SafeAreaView edges={["top"]} style={{ backgroundColor: t.card }}>
          <AppHeader />
        </SafeAreaView>
      ) : null}
      <Slot />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <AuthGate />
      </AppProvider>
    </SafeAreaProvider>
  );
}
