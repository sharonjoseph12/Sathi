/**
 * Jargon simplifier — ported from frontend/src/screens/tools.tsx (Simplify).
 */

import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { useTheme, Btn, Card, Input, PageHeader } from "../components/ui";

export default function SimplifyScreen() {
  const t = useTheme();
  const [text, setText] = useState("Take 1 tab PO BD PC");
  const [r, setR] = useState<{ simplified: string; expanded: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const s = StyleSheet.create({
    container: { padding: 20, paddingBottom: 32, gap: 12 },
    col: { gap: 10 },
    result: { borderRadius: 12, backgroundColor: t.muted, padding: 12 },
    simplified: { fontSize: 14, fontWeight: "600", color: t.ink },
    expanded: { fontSize: 12, color: t.mutedFg, marginTop: 6 },
    err: { fontSize: 12, fontWeight: "600", color: t.danger },
  });

  const simplify = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setErr("");
    try {
      setR(await api.simplify(text));
    } catch {
      setErr("Simplify failed — try again while online.");
    }
    setBusy(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={s.container}>
        <PageHeader title="Jargon simplifier" sub="OD · BD · TDS · PO · STAT…" />
        <Card>
          <View style={s.col}>
            <Input
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={text}
              onChangeText={setText}
              placeholder="Paste prescription text…"
            />
            <Btn onPress={simplify} disabled={busy || !text.trim()}>
              {busy ? "Simplifying…" : "Simplify"}
            </Btn>
            {err ? <Text style={s.err}>{err}</Text> : null}
            {r && (
              <View style={s.result}>
                <Text style={s.simplified}>{r.simplified}</Text>
                {r.expanded.length > 0 && (
                  <Text style={s.expanded}>Expanded: {r.expanded.join(", ")}</Text>
                )}
              </View>
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
