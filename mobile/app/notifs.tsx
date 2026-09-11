/**
 * Notifications — mirrors frontend Notifications.
 * Lists api.notifs + mark read.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { useTheme, Card, Badge, Empty, PageHeader } from "../components/ui";

type Notif = { id: number; title: string; body: string; kind: string; read: boolean };

export default function NotifsScreen() {
  const t = useTheme();
  const [list, setList] = useState<Notif[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setList(await api.notifs());
    } catch { /* offline */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markRead = async (id: number) => {
    try {
      await api.readNotif(id);
      await load();
    } catch { /* offline */ }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Notifications" />

        {list.map((n) => (
          <Card key={n.id} accent={n.read ? undefined : "#7C3AED"} style={styles.card}>
            <View style={styles.header}>
              <Text style={[styles.title, styles.flex, { color: t.ink }]}>{n.title}</Text>
              <Badge level={n.kind} />
            </View>
            <Text style={[styles.body, { color: t.mutedFg }]}>{n.body}</Text>
            {!n.read && (
              <Pressable onPress={() => markRead(n.id)} style={styles.markBtn}>
                <Text style={[styles.markText, { color: t.primary }]}>Mark read</Text>
              </Pressable>
            )}
          </Card>
        ))}

        {list.length === 0 && <Empty text="No notifications." />}
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
  body: { fontSize: 13, marginTop: 4 },
  markBtn: { marginTop: 6 },
  markText: { fontSize: 12, fontWeight: "700" },
});
