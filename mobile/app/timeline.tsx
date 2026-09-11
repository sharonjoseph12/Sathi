/**
 * Timeline screen — mirrors frontend Timeline tab.
 * Full event list with simple text filter buttons.
 */

import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, type Event } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Card, Empty, PageHeader } from "../components/ui";

const FILTERS = ["all", "MEDICATION_TAKEN", "SYMPTOM_REPORTED", "SAFETY_ALERT", "CAREGIVER_ALERT", "FOLLOW_UP"];

export default function TimelineScreen() {
  const { pid } = useApp();
  const t = useTheme();
  const [tl, setTl] = useState<Event[]>([]);
  const [filter, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setTl(await api.timeline(pid));
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

  const rows = tl.filter((e) => filter === "all" || e.event_type === filter);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Timeline" />

        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? t.primary : t.card, borderColor: t.border },
                ]}
              >
                <Text style={[styles.chipTxt, { color: active ? "#ffffff" : t.ink }]}>
                  {f === "all" ? "All" : f.replace(/_/g, " ").toLowerCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card>
          {rows.length === 0 ? (
            <Empty text="Nothing here yet." />
          ) : (
            <View style={[styles.timeline, { borderLeftColor: t.border }]}>
              {rows.map((e, i) => (
                <View key={e.id ?? i} style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: t.primary }]} />
                  <Text style={[styles.title, { color: t.ink }]}>{e.description}</Text>
                  <Text style={[styles.sub, { color: t.mutedFg }]}>
                    {e.event_type}
                    {e.severity ? ` · ${e.severity}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  chipTxt: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  timeline: { borderLeftWidth: 2, paddingLeft: 16 },
  row: { marginBottom: 12, position: "relative" },
  dot: { position: "absolute", left: -21, top: 4, width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 14, fontWeight: "600" },
  sub: { fontSize: 12, marginTop: 2 },
});
