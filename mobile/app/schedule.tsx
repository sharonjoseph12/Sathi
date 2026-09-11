/**
 * Schedule screen — mirrors frontend Schedule tab.
 * Today's doses + upcoming follow-ups, anchored to daily routine.
 */

import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Btn, Card, Badge, Empty, PageHeader } from "../components/ui";

type Dose = { name: string; time: string; status: string };
type Fu = { title: string; date_time: string };

function doseBadge(status: string): string {
  if (status === "pending") return "NORMAL";
  if (status === "taken") return "taken";
  return "MONITOR";
}

export default function ScheduleScreen() {
  const { me, pid } = useApp();
  const t = useTheme();
  const [doses, setDoses] = useState<Dose[]>([]);
  const [fus, setFus] = useState<Fu[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  let anchors: Record<string, string> = {};
  try {
    anchors = JSON.parse(me?.anchor_times || "{}");
  } catch {
    anchors = {};
  }

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setDoses(await api.dosesToday(pid));
    } catch {
      /* offline */
    }
    try {
      setFus(await api.followups(pid));
    } catch {
      /* offline */
    }
  }, [pid]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Schedule" sub="Anchored to your daily routine" />

        <Card style={styles.card}>
          <Text style={[styles.anchors, { color: t.ink }]}>
            🌅 Morning {anchors.morning || "—"} · 🌞 Afternoon {anchors.afternoon || "—"} · 🌆 Evening{" "}
            {anchors.evening || "—"} · 🌙 Night {anchors.night || "—"}
          </Text>
          <Btn kind="ghost" onPress={() => router.push("/settings" as never)} style={styles.linkBtn}>
            Edit in Settings →
          </Btn>
        </Card>

        {doses.length === 0 ? (
          <Empty title="No doses today" text="Nothing scheduled for today." />
        ) : (
          <View style={styles.list}>
            {doses.map((d, i) => (
              <Card key={i} style={styles.row}>
                <View style={styles.rowInner}>
                  <Text style={[styles.rowTxt, { color: t.ink }]} numberOfLines={2}>
                    💊 {d.name} <Text style={{ color: t.mutedFg }}>· {d.time}</Text>
                  </Text>
                  <Badge level={doseBadge(d.status)} />
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.fuSection}>
          {fus.map((f, i) => (
            <Card key={i}>
              <Text style={[styles.rowTxt, { color: t.ink }]}>📅 {f.title}</Text>
              <Text style={[styles.fuDate, { color: t.mutedFg }]}>{f.date_time}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: { marginBottom: 12 },
  anchors: { fontSize: 14 },
  linkBtn: { marginTop: 8, alignSelf: "flex-start" },
  list: { gap: 8 },
  row: { paddingVertical: 12 },
  rowInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTxt: { fontSize: 14, fontWeight: "600", flex: 1 },
  fuSection: { marginTop: 12, gap: 8 },
  fuDate: { fontSize: 12, marginTop: 2 },
});
