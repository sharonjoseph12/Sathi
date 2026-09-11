/**
 * Discharge plans — mirrors frontend Plans.
 * Versioned list, newest active first.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Card, Badge, Empty, PageHeader } from "../components/ui";

type Plan = { id: number; hospital: string; version: number; is_active: boolean; data: string };

function pretty(d: string): string {
  try {
    const j = JSON.parse(d) as { notes?: string; medicines?: { name: string }[] };
    return [j.notes, (j.medicines || []).map((m) => m.name).join(", ")]
      .filter(Boolean)
      .join(" · ");
  } catch {
    return d.slice(0, 200);
  }
}

export default function PlansScreen() {
  const t = useTheme();
  const { pid } = useApp();
  const [list, setList] = useState<Plan[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setList(await api.plans(pid));
    } catch { /* offline */ }
  }, [pid]);

  useEffect(() => { if (pid) load(); }, [pid, load]);

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
        <PageHeader title="Discharge plans" sub="Versioned, newest active first" />

        {list.map((p) => (
          <Card key={p.id} accent={p.is_active ? "#10B981" : undefined} style={styles.card}>
            <View style={styles.header}>
              <Text style={[styles.title, styles.flex, { color: t.ink }]}>
                v{p.version} · {p.hospital || "Hospital"}
              </Text>
              {p.is_active && <Badge level="taken" />}
            </View>
            <Text style={[styles.body, { color: t.mutedFg }]}>{pretty(p.data)}</Text>
          </Card>
        ))}

        {list.length === 0 && (
          <Empty text="No plans yet — your caregiver can create one." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: { marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  flex: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700" },
  body: { fontSize: 13, marginTop: 6 },
});
