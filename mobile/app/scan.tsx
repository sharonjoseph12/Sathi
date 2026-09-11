/**
 * Scan prescription screen — ported from frontend/src/screens/tools.tsx (Scan).
 * Server AI Vision only (no local Tesseract): pick image -> api.ocr -> review -> import.
 */

import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { api } from "../lib/api";
import { useApp } from "../lib/store";
import { useTheme, Btn, Card, Empty, Input, PageHeader, Badge, Seg } from "../components/ui";

type Candidate = {
  name: string;
  dose: string;
  frequency: string;
  time: string;
  instructions: string;
  confidence: number;
};

type StrKey = "name" | "dose" | "frequency" | "time" | "instructions";

export default function ScanScreen() {
  const { pid } = useApp();
  const t = useTheme();
  const router = useRouter();
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [imgB64, setImgB64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"auto" | "donut" | "vision">("auto");
  const [found, setFound] = useState<Candidate[]>([]);
  const [msg, setMsg] = useState("");
  const [mName, setMName] = useState("");
  const [mDose, setMDose] = useState("");
  const [mTime, setMTime] = useState("08:00 AM");
  const [mOk, setMOk] = useState("");

  const s = StyleSheet.create({
    container: { padding: 20, paddingBottom: 32, gap: 12 },
    row: { flexDirection: "row", gap: 8 },
    pickBtn: {
      flex: 1, borderRadius: 12, borderWidth: 1, borderColor: t.border,
      backgroundColor: t.secondary, paddingVertical: 12, alignItems: "center",
    },
    pickBtnText: { fontSize: 13, fontWeight: "700", color: t.primary },
    previewBox: {
      borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: t.border,
      backgroundColor: t.muted, padding: 16, alignItems: "center", minHeight: 140,
      justifyContent: "center",
    },
    preview: { width: "100%", height: 220, borderRadius: 12 },
    placeholder: { fontSize: 13, color: t.mutedFg, textAlign: "center" },
    msg: {
      borderRadius: 12, backgroundColor: t.muted, padding: 10,
      fontSize: 12, fontWeight: "600", color: t.ink,
    },
    warn: { fontSize: 10, color: t.mutedFg },
    candHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    candLabel: { fontSize: 11, fontWeight: "700", color: t.mutedFg },
    fieldGap: { gap: 8 },
    remove: { fontSize: 12, fontWeight: "700", color: t.danger },
    cardTitle: { fontSize: 15, fontWeight: "700", color: t.ink, marginBottom: 8 },
    ok: { fontSize: 12, fontWeight: "600", color: t.success },
  });

  const applyAsset = (uri: string, b64?: string) => {
    setImgUri(uri);
    setFound([]);
    setMsg("");
    setImgB64(b64 ? `data:image/jpeg;base64,${b64}` : null);
  };

  const pickLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setMsg("Photo library permission denied.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!res.canceled && res.assets[0]) {
      applyAsset(res.assets[0].uri, res.assets[0].base64 ?? undefined);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setMsg("Camera permission denied.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!res.canceled && res.assets[0]) {
      applyAsset(res.assets[0].uri, res.assets[0].base64 ?? undefined);
    }
  };

  const runAI = async () => {
    if (!imgB64) return;
    setBusy(true);
    try {
      const r = await api.ocr(imgB64, mode);
      if (r.medicines && r.medicines.length > 0) {
        setFound(
          r.medicines.map((m) => ({
            name: m.name || "",
            dose: m.dose || "",
            frequency: m.frequency || "",
            time: m.time || "08:00 AM",
            instructions: m.instructions || "",
            confidence: 90,
          }))
        );
      }
      setMsg(r.message || "Done");
    } catch {
      setMsg("AI OCR failed — check connection or add manually below.");
    }
    setBusy(false);
  };

  const edit = (i: number, k: StrKey, v: string) =>
    setFound((f) => f.map((m, j) => (j === i ? { ...m, [k]: v } : m)));

  const remove = (i: number) => setFound((f) => f.filter((_, j) => j !== i));

  const importAll = async () => {
    if (!pid || found.length === 0) return;
    setBusy(true);
    try {
      for (const m of found) {
        await api.addMed(pid, {
          name: m.name,
          dose: m.dose,
          frequency: m.frequency,
          time: m.time,
          instructions: m.instructions,
          expand: !!m.frequency,
        });
      }
      setMsg(`Imported ${found.length} medicine(s). Verify each against your discharge paper.`);
      setFound([]);
    } catch {
      setMsg("Import failed — try again while online.");
    }
    setBusy(false);
  };

  const manualAdd = async () => {
    if (!mName.trim() || !pid) return;
    try {
      await api.addMed(pid, { name: mName, dose: mDose, time: mTime });
      setMOk(`Saved ${mName}. Confirm dose with your discharge paper.`);
      setMName("");
      setMDose("");
      setMTime("08:00 AM");
    } catch {
      setMOk("Save failed — try again while online.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={s.container}>
        <PageHeader title="Scan prescription" sub="Donut on-device or AI Vision → review → import" />

        <Card>
          <Seg opts={["auto", "donut", "vision"] as const} val={mode} set={setMode} />
          <Text style={s.warn}>
            {mode === "donut"
              ? "🏠 Donut reads the photo on this server (no API key, GPU if available)."
              : mode === "vision"
                ? "☁️ Gemini/Groq vision extracts medicines directly."
                : "✨ Auto: cloud vision first, Donut fallback."}
          </Text>
          <View style={{ height: 12 }} />
          <View style={s.row}>
            <Pressable style={s.pickBtn} onPress={pickLibrary}>
              <Text style={s.pickBtnText}>🖼 Choose photo</Text>
            </Pressable>
            <Pressable style={s.pickBtn} onPress={takePhoto}>
              <Text style={s.pickBtnText}>📷 Take photo</Text>
            </Pressable>
          </View>
          <View style={{ height: 12 }} />
          <View style={s.previewBox}>
            {imgUri ? (
              <Image source={{ uri: imgUri }} style={s.preview} resizeMode="contain" />
            ) : (
              <Text style={s.placeholder}>📷 Snap or upload your prescription</Text>
            )}
          </View>
          <View style={{ height: 12 }} />
          <Btn onPress={runAI} disabled={busy || !imgB64}>
            {busy ? "Reading…" : mode === "donut" ? "🔍 Extract with Donut" : "🔍 Extract with AI"}
          </Btn>
          {msg ? (
            <>
              <View style={{ height: 8 }} />
              <Text style={s.msg}>{msg}</Text>
            </>
          ) : null}
          <View style={{ height: 8 }} />
          <Text style={s.warn}>⚠ AI-generated — always verify doses against your discharge paper.</Text>
        </Card>

        {found.map((m, i) => (
          <Card key={i} accent={m.confidence >= 80 ? "#10B981" : "#F59E0B"}>
            <View style={s.candHead}>
              <Text style={s.candLabel}>Candidate {i + 1}</Text>
              <View style={s.row}>
                <Badge level={m.confidence >= 80 ? "taken" : "MONITOR"} />
                <Pressable onPress={() => remove(i)}>
                  <Text style={s.remove}>  ✕</Text>
                </Pressable>
              </View>
            </View>
            <View style={s.fieldGap}>
              <Input label="Name" value={m.name} onChangeText={(v) => edit(i, "name", v)} />
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Input label="Dose" value={m.dose} onChangeText={(v) => edit(i, "dose", v)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Time" value={m.time} onChangeText={(v) => edit(i, "time", v)} />
                </View>
              </View>
              <Input label="Frequency" value={m.frequency} onChangeText={(v) => edit(i, "frequency", v)} />
              <Input
                label="Instructions"
                value={m.instructions}
                onChangeText={(v) => edit(i, "instructions", v)}
              />
            </View>
          </Card>
        ))}

        {found.length > 0 && (
          <Btn kind="success" onPress={importAll} disabled={busy}>
            Save {found.length} to schedule
          </Btn>
        )}

        {found.length === 0 && !imgUri && <Empty text="No candidates yet — pick a photo to begin." />}

        <Card>
          <Text style={s.cardTitle}>Or add manually</Text>
          <View style={s.fieldGap}>
            <Input placeholder="Medicine name" value={mName} onChangeText={setMName} />
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Input placeholder="Dose" value={mDose} onChangeText={setMDose} />
              </View>
              <View style={{ flex: 1 }}>
                <Input placeholder="Time" value={mTime} onChangeText={setMTime} />
              </View>
            </View>
            <Btn onPress={manualAdd} disabled={!mName.trim()}>
              Save to schedule
            </Btn>
            {mOk ? <Text style={s.ok}>{mOk}</Text> : null}
            <Btn kind="ghost" onPress={() => router.push("/(tabs)/medicines")}>
              View schedule
            </Btn>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
