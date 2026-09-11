/**
 * Chat screen — ported from frontend/src/screens/tools.tsx (Chat).
 * AI companion mode (api.aiChat + expo-speech readback) and care-team mode
 * (peer id + api.chatHistory/chatSend). No SSE/recording; manual refresh instead.
 */

import { useState, useCallback, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { api } from "../../lib/api";
import { useApp } from "../../lib/store";
import { useTheme, Btn, Card, Empty, Input, PageHeader } from "../../components/ui";

type Msg = { from: "me" | "them"; text: string };

export default function ChatScreen() {
  const { me, pid } = useApp();
  const t = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [aiMode, setAiMode] = useState(true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [peer, setPeer] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [voice, setVoice] = useState(true);

  const s = StyleSheet.create({
    container: { padding: 20, paddingBottom: 32, gap: 12 },
    toggleRow: { flexDirection: "row", gap: 8 },
    toggleBtn: {
      flex: 1, borderRadius: 999, paddingVertical: 10, alignItems: "center",
    },
    toggleText: { fontSize: 12, fontWeight: "700" },
    peerRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    peerInput: { flex: 1 },
    bubbleMe: {
      alignSelf: "flex-end", backgroundColor: t.primary,
      borderRadius: 16, padding: 10, maxWidth: "85%",
    },
    bubbleThem: {
      alignSelf: "flex-start", backgroundColor: t.muted,
      borderRadius: 16, padding: 10, maxWidth: "85%",
    },
    textMe: { fontSize: 14, color: "#ffffff" },
    textThem: { fontSize: 14, color: t.ink },
    msgList: { gap: 8, marginBottom: 12 },
    sendRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    sendInput: { flex: 1 },
    voiceBtn: {
      borderRadius: 999, backgroundColor: t.secondary,
      paddingHorizontal: 12, paddingVertical: 10, alignItems: "center",
    },
    voiceText: { fontSize: 16 },
    hint: { fontSize: 11, color: t.mutedFg, marginTop: 8 },
  });

  const speak = (body: string) => {
    if (!voice) return;
    Speech.speak(body, { language: me?.language ? `${me.language}-IN` : "en-IN" });
  };

  const loadHistory = useCallback(async () => {
    if (!pid || !peer) return;
    setRefreshing(true);
    try {
      const h = await api.chatHistory(pid, Number(peer));
      setMsgs(
        h.map((m) => ({
          from: (m.senderId === me?.id ? "me" : "them") as "me" | "them",
          text: m.text,
        }))
      );
    } catch {
      /* offline */
    }
    setRefreshing(false);
  }, [pid, peer, me]);

  const sendAI = async () => {
    const body = text.trim();
    if (!body || !pid || busy) return;
    setText("");
    setBusy(true);
    setMsgs((m) => [...m, { from: "me", text: body }]);
    try {
      const r = await api.aiChat(pid, body);
      setMsgs((m) => [...m, { from: "them", text: r.message }]);
      speak(r.message);
    } catch {
      setMsgs((m) => [...m, { from: "them", text: "(offline — will reply when connected)" }]);
    }
    setBusy(false);
  };

  const sendPeer = async () => {
    const body = text.trim();
    if (!body || !pid || !peer) return;
    setText("");
    setMsgs((m) => [...m, { from: "me", text: body }]);
    try {
      await api.chatSend({ receiver_id: Number(peer), patient_id: pid, text: body });
    } catch {
      /* queued */
    }
  };

  const send = () => (aiMode ? sendAI() : sendPeer());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.container}
        refreshControl={
          !aiMode ? (
            <RefreshControl refreshing={refreshing} onRefresh={loadHistory} tintColor={t.primary} />
          ) : undefined
        }
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        <PageHeader title="Chat" sub={aiMode ? "AI companion" : "Care team"} />

        <View style={s.toggleRow}>
          <Pressable
            style={[s.toggleBtn, { backgroundColor: aiMode ? t.primary : t.secondary }]}
            onPress={() => setAiMode(true)}
          >
            <Text style={[s.toggleText, { color: aiMode ? "#ffffff" : t.primary }]}>
              🤖 AI companion
            </Text>
          </Pressable>
          <Pressable
            style={[s.toggleBtn, { backgroundColor: !aiMode ? t.primary : t.secondary }]}
            onPress={() => setAiMode(false)}
          >
            <Text style={[s.toggleText, { color: !aiMode ? "#ffffff" : t.primary }]}>
              👥 Care team
            </Text>
          </Pressable>
        </View>

        {!aiMode && (
          <View style={s.peerRow}>
            <View style={s.peerInput}>
              <Input
                placeholder="Peer user id"
                value={peer}
                onChangeText={setPeer}
                keyboardType="numeric"
              />
            </View>
            <Btn kind="ghost" onPress={loadHistory}>
              Refresh
            </Btn>
          </View>
        )}

        <Card>
          <View style={s.msgList}>
            {msgs.length === 0 && (
              <Empty
                text={
                  aiMode
                    ? "Ask anything — medicines, symptoms, appointments."
                    : "Enter a peer id and tap Refresh to load messages."
                }
              />
            )}
            {msgs.map((m, i) => (
              <View key={i} style={m.from === "me" ? s.bubbleMe : s.bubbleThem}>
                <Text style={m.from === "me" ? s.textMe : s.textThem}>{m.text}</Text>
              </View>
            ))}
          </View>
          <View style={s.sendRow}>
            {aiMode && (
              <Pressable
                style={s.voiceBtn}
                onPress={() => {
                  if (voice) Speech.stop();
                  setVoice((v) => !v);
                }}
              >
                <Text style={s.voiceText}>{voice ? "🔊" : "🔇"}</Text>
              </Pressable>
            )}
            <View style={s.sendInput}>
              <Input
                placeholder="Type a message…"
                value={text}
                onChangeText={setText}
                onSubmitEditing={send}
                returnKeyType="send"
              />
            </View>
            <Btn onPress={send} disabled={busy || !text.trim()}>
              Send
            </Btn>
          </View>
          {aiMode && <Text style={s.hint}>AI replies are read aloud — tap 🔊 to mute.</Text>}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
