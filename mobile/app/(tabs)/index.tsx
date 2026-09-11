/**
 * Home (Today) screen — mirrors frontend "what matters right now".
 * Shows: greeting, adherence ring, due doses, recent symptoms.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Med } from "../../lib/api";
import { useApp } from "../../lib/store";
import { useAdaptiveProfile } from "../../lib/useAdaptiveProfile";
import { Card, Btn, Ring, Badge, SectionLabel, Avatar, useTheme } from "../../components/ui";
import { FONT } from "../../lib/theme";
import * as Haptics from "expo-haptics";

type Stats = {
  adherence: number; taken_today: number; total: number; streak: number;
  xp: number; next_followup: string | null; week: { date: string; pct: number }[];
};

type DoseRow = { medication_id: number; name: string; time: string; status: string };

export default function HomeScreen() {
  const { me, pid } = useApp();
  const t = useTheme();
  const profile = useAdaptiveProfile();
  const [stats, setStats] = useState<Stats | null>(null);
  const [doses, setDoses] = useState<DoseRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      const [s, d] = await Promise.all([api.stats(pid), api.dosesToday(pid)]);
      setStats(s);
      setDoses(d);
    } catch { /* offline */ }
  }, [pid]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const takeDose = async (mid: number) => {
    if (!pid) return;
    try {
      await api.logDose(pid, mid, { status: "taken" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load();
    } catch { /* offline */ }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = me?.name.split(" ")[0] || "there";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        {/* Hero — mirrors website Home section: avatar + greeting + doses, ring + adherence */}
        <Card style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={me?.name || "Patient"} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: profile.isElder ? 14 : 11, fontWeight: "700", fontFamily: FONT.bold, textTransform: "uppercase", letterSpacing: 0.8, color: t.mutedFg }}>
                Today&apos;s recovery
              </Text>
              <Text style={{ fontSize: profile.isElder ? 24 : 18, fontWeight: "700", fontFamily: FONT.bold, color: t.ink, letterSpacing: -0.4 }} numberOfLines={1}>
                {greeting}, {firstName}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 12, fontWeight: "600", fontFamily: FONT.semi, color: t.ink }}>
                {stats ? `${stats.taken_today}/${stats.total} doses` : "—"}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: FONT.regular, color: t.mutedFg }}>
                {stats ? `${stats.streak}-day streak` : ""}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12, backgroundColor: t.muted + "99", borderRadius: 12, padding: 12 }}>
            <Ring pct={stats?.adherence ?? 0} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: profile.isElder ? 16 : 14, fontWeight: "600", fontFamily: FONT.semi, color: t.ink }}>
                Adherence {stats?.adherence ?? 0}%
              </Text>
              <Text style={{ fontSize: profile.isElder ? 14 : 13, fontFamily: FONT.regular, color: t.mutedFg, marginTop: 2 }}>
                {stats?.next_followup ? `Next follow-up: ${stats.next_followup}` : "No follow-up scheduled"}
              </Text>
            </View>
          </View>
        </Card>

        {/* Due doses */}
        <SectionLabel>Due now</SectionLabel>
        {doses.filter((d) => d.status !== "taken").length === 0 ? (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ alignItems: "center", padding: 12 }}>
              <Text style={{ fontSize: 20 }}>✅</Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: t.ink, marginTop: 4 }}>All caught up!</Text>
              <Text style={{ fontSize: 12, color: t.mutedFg }}>No pending doses right now</Text>
            </View>
          </Card>
        ) : (
          <View style={{ gap: 8, marginBottom: 16 }}>
            {doses.filter((d) => d.status !== "taken").map((d) => (
              <Card key={d.medication_id}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: profile.isElder ? 16 : 14, fontWeight: "700", color: t.ink }}>{d.name}</Text>
                    <Text style={{ fontSize: 12, color: t.mutedFg }}>Due at {d.time}</Text>
                  </View>
                  <Badge level={d.status} />
                  <Btn onPress={() => takeDose(d.medication_id)} style={{ marginLeft: 8 }}>
                    Take
                  </Btn>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Taken doses */}
        {doses.filter((d) => d.status === "taken").length > 0 && (
          <>
            <SectionLabel>Taken</SectionLabel>
            <View style={{ gap: 8 }}>
              {doses.filter((d) => d.status === "taken").map((d) => (
                <Card key={d.medication_id} style={{ opacity: 0.7 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: t.ink }}>✓ {d.name}</Text>
                      <Text style={{ fontSize: 12, color: t.mutedFg }}>{d.time}</Text>
                    </View>
                    <Badge level="taken" />
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
