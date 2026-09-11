/**
 * Help & support — mirrors frontend Help.
 * Tips + api.support form.
 */

import { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../lib/api";
import { useTheme, Card, Btn, Input, PageHeader } from "../components/ui";

export default function HelpScreen() {
  const t = useTheme();
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  const send = async () => {
    if (!msg.trim()) return;
    try {
      await api.support("help", msg);
      setOk("Thanks — we got it.");
      setMsg("");
    } catch (e) {
      setOk(e instanceof Error ? e.message : "failed");
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="Help & support" />

        <Card style={styles.card}>
          <Text style={[styles.h3, { color: t.ink }]}>You can say:</Text>
          <Text style={[styles.body, { color: t.mutedFg }]}>
            &ldquo;What medicines do I need?&rdquo; · &ldquo;I have a headache&rdquo; · &ldquo;When is my
            appointment?&rdquo; · &ldquo;Open my schedule&rdquo;
          </Text>
        </Card>

        <Card style={styles.card}>
          <View style={styles.form}>
            <Input
              placeholder="Report a problem or ask for help…"
              value={msg}
              onChangeText={setMsg}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Btn onPress={send}>Send</Btn>
            {ok ? <Text style={[styles.msg, { color: t.mutedFg }]}>{ok}</Text> : null}
          </View>
        </Card>

        <Text style={[styles.disclaimer, { color: t.mutedFg }]}>
          Sathi supports recovery — it does not diagnose, prescribe, or replace emergency
          services (112).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  card: { marginBottom: 12 },
  h3: { fontSize: 14, fontWeight: "700" },
  body: { fontSize: 13, marginTop: 4 },
  form: { gap: 8 },
  msg: { fontSize: 12 },
  disclaimer: { fontSize: 11, textAlign: "center", marginTop: 4 },
});
