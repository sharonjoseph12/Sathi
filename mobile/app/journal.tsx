/**
 * Journal — ported from frontend/src/screens/well.tsx (Journal).
 * Mood faces 1-5, energy stepper 1-5, note input, entry list.
 */

import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { useTheme, Btn, Card, Empty, Input, PageHeader } from "../components/ui";

const FACES = ["😞", "🙁", "😐", "🙂", "😄"];

type Entry = { id: number; mood: number; energy: number; text: string };

export default function JournalScreen() {
  const t = useTheme();
  const [list, setList] = useState<Entry[]>([]);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const s = StyleSheet.create({
    container: { padding: 20, paddingBottom: 32, gap: 12 },
    col: { gap: 10 },
    label: { fontSize: 12, fontWeight: "700", color: t.ink },
    facesRow: { flexDirection: "row", gap: 8 },
    faceBtn: { borderRadius: 12, padding: 8 },
    face: { fontSize: 28 },
    stepperRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    stepBtn: {
      borderRadius: 999, backgroundColor: t.secondary,
      width: 44, height: 44, alignItems: "center", justifyContent: "center",
    },
    stepText: { fontSize: 20, fontWeight: "700", color: t.primary },
    energyVal: { fontSize: 15, fontWeight: "700", color: t.ink },
    entry: { borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, padding: 12 },
    entryText: { fontSize: 14, color: t.ink },
    entrySub: { fontSize: 12, color: t.mutedFg, marginTop: 2 },
  });

  const load = useCallback(async () => {
    try {
      setList(await api.journal());
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.addJournal({ mood, energy, text });
      setText("");
      await load();
    } catch {
      /* offline */
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={s.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        <PageHeader title="Journal" sub="Mood · energy · notes" />

        <Card>
          <View style={s.col}>
            <Text style={s.label}>Mood</Text>
            <View style={s.facesRow}>
              {FACES.map((f, i) => (
                <Pressable
                  key={i}
                  style={[s.faceBtn, { backgroundColor: mood === i + 1 ? t.secondary : "transparent" }]}
                  onPress={() => setMood(i + 1)}
                >
                  <Text style={s.face}>{f}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.label}>Energy: {energy}/5</Text>
            <View style={s.stepperRow}>
              <Pressable style={s.stepBtn} onPress={() => setEnergy((e) => Math.max(1, e - 1))}>
                <Text style={s.stepText}>−</Text>
              </Pressable>
              <Text style={s.energyVal}>{energy} / 5</Text>
              <Pressable style={s.stepBtn} onPress={() => setEnergy((e) => Math.min(5, e + 1))}>
                <Text style={s.stepText}>+</Text>
              </Pressable>
            </View>
            <Input
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              placeholder="How was today?"
              value={text}
              onChangeText={setText}
            />
            <Btn onPress={save} disabled={busy}>
              {busy ? "Saving…" : "Save entry"}
            </Btn>
          </View>
        </Card>

        {list.map((j) => (
          <View key={j.id} style={s.entry}>
            <Text style={s.entryText}>
              {FACES[j.mood - 1] ?? "😐"} {j.text || "(no note)"}
            </Text>
            <Text style={s.entrySub}>energy {j.energy}/5</Text>
          </View>
        ))}
        {list.length === 0 && <Empty text="No entries yet." />}
      </ScrollView>
    </SafeAreaView>
  );
}
