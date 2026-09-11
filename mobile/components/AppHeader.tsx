/**
 * AppHeader — mirrors the website Shell top bar (App.tsx):
 * purple "S" tile + "Sathi" left, patient pill selector (or name · role) right.
 * Rendered above all authenticated screens from app/_layout.tsx.
 */

import { View, Text, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useApp } from "../lib/store";
import { useTheme } from "./ui";
import { FONT } from "../lib/theme";

export function AppHeader() {
  const { me, pid, setPid } = useApp();
  const t = useTheme();
  if (!me) return null;

  return (
    <View
      style={{
        backgroundColor: t.card,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
        paddingHorizontal: 16,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Pressable
        accessibilityLabel="Go home"
        onPress={() => router.replace("/(tabs)")}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, flexShrink: 0 }}
      >
        <View
          style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: t.primary, alignItems: "center", justifyContent: "center",
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "800", fontFamily: FONT.extra }}>S</Text>
        </View>
        <Text style={{ fontSize: 15, fontWeight: "700", fontFamily: FONT.bold, color: t.ink, letterSpacing: -0.2 }}>
          Sathi
        </Text>
      </Pressable>

      {me.patients.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {me.patients.map((p) => {
              const active = p.id === pid;
              return (
                <Pressable
                  key={p.id}
                  accessibilityLabel={`Select patient ${p.name}`}
                  onPress={() => { setPid(p.id); void Haptics.selectionAsync(); }}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: active ? t.primary : t.secondary,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", fontFamily: FONT.bold, color: active ? "#ffffff" : t.primary }}>
                    {p.name.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: t.mutedFg, flexShrink: 1 }} numberOfLines={1}>
          {me.name} · {me.role}
        </Text>
      )}
    </View>
  );
}
