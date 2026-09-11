/**
 * Reminders — mirrors frontend Reminders.
 * List + add (message/when) + delete.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Card, Btn, Empty, Input, PageHeader } from "../components/ui";

type Reminder = {
  id: number; message: string; scheduled_for: string; channel: string; status: string;
};

export default function RemindersScreen() {
  const t = useTheme();
  const { pid } = useApp();
  const [list, setList] = useState<Reminder[]>([]);
  const [msg, setMsg] = useState("");
  const [when, setWhen] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setList(await api.reminders(pid));
    } catch { /* offline */ }
  }, [pid]);

  useEffect(() => { if (pid) load(); }, [pid, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const add = async () => {
    if (!msg.trim() || !pid) return;
    try {
      await api.addReminder(pid, { message: msg, scheduled_for: when });
      setMsg("");
      setWhen("");
      await load();
    } catch { /* offline */ }
  };

  const del = async (id: number) => {
    if (!pid) return;
    try {
      await api.delReminder(pid, id);
      await load();
    } catch { /* offline */ }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Reminders" sub="Custom nudges beyond the med schedule" />

        {list.map((r) => (
          <Card key={r.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={[styles.title, { color: t.ink }]}>{r.message}</Text>
                <Text style={[styles.sub, { color: t.mutedFg }]}>
                  {r.scheduled_for} · {r.channel} · {r.status}
                </Text>
              </View>
              <Pressable onPress={() => del(r.id)}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        ))}

        {list.length === 0 && <Empty text="No custom reminders." />}

        <Card style={styles.card}>
          <View style={styles.form}>
            <Input
              placeholder="e.g. Evening walk at 6pm"
              value={msg}
              onChangeText={setMsg}
            />
            <Input
              placeholder="When (e.g. 06:00 PM daily)"
              value={when}
              onChangeText={setWhen}
            />
            <Btn onPress={add}>Add reminder</Btn>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: { marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  flex: { flex: 1 },
  title: { fontSize: 14, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },
  delete: { fontSize: 12, fontWeight: "700", color: "#EF4444" },
  form: { gap: 8 },
});
