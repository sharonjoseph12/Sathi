/**
 * Follow-ups screen — mirrors frontend Followups tab.
 * List appointments, add form, mark done.
 */

import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Btn, Card, Badge, Empty, Input, PageHeader } from "../components/ui";

type Fu = {
  id: number;
  title: string;
  doctor: string;
  date_time: string;
  location: string;
  completed: boolean;
};

const EMPTY_FORM = { title: "", doctor: "", date_time: "", location: "" };

export default function FollowupsScreen() {
  const { pid } = useApp();
  const t = useTheme();
  const [list, setList] = useState<Fu[]>([]);
  const [f, setF] = useState(EMPTY_FORM);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!pid) return;
    try {
      setList(await api.followups(pid));
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

  const add = async () => {
    if (!f.title.trim() || !pid || saving) return;
    setSaving(true);
    try {
      await api.addFu(pid, f);
      setF(EMPTY_FORM);
      await load();
    } catch {
      /* offline: keep form */
    } finally {
      setSaving(false);
    }
  };

  const markDone = async (id: number) => {
    if (!pid) return;
    try {
      await api.doneFu(pid, id);
      await load();
    } catch {
      /* offline */
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Follow-ups" />

        {list.length === 0 ? (
          <Empty text="No appointments yet." />
        ) : (
          <View style={styles.list}>
            {list.map((a) => (
              <Card key={a.id}>
                <View style={styles.row}>
                  <View style={styles.rowTxtWrap}>
                    <Text style={[styles.title, { color: t.ink }]}>{a.title}</Text>
                    <Text style={[styles.sub, { color: t.mutedFg }]}>
                      {a.doctor} · {a.date_time} · {a.location}
                    </Text>
                  </View>
                  {a.completed ? <Badge level="taken" /> : <Btn kind="ghost" onPress={() => markDone(a.id)}>Done</Btn>}
                </View>
              </Card>
            ))}
          </View>
        )}

        <Card style={styles.formCard}>
          <Text style={[styles.h3, { color: t.ink }]}>Book appointment</Text>
          <View style={styles.form}>
            <Input placeholder="Title" value={f.title} onChangeText={(v) => setF({ ...f, title: v })} />
            <Input placeholder="Doctor" value={f.doctor} onChangeText={(v) => setF({ ...f, doctor: v })} />
            <Input placeholder="Date & time" value={f.date_time} onChangeText={(v) => setF({ ...f, date_time: v })} />
            <Input placeholder="Location" value={f.location} onChangeText={(v) => setF({ ...f, location: v })} />
            <Btn onPress={add} disabled={saving || !f.title.trim()}>
              {saving ? "Adding…" : "Add"}
            </Btn>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  list: { gap: 8, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowTxtWrap: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 },
  formCard: { marginTop: 4 },
  h3: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  form: { gap: 8 },
});
