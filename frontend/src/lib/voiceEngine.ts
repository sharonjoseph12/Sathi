/**
 * voiceEngine.ts — Voice-First Command Engine for Sathi
 * 
 * Understands natural voice instructions:
 * 1. Taking/snoozing medications ("Take aspirin", "Mark warfarin taken", "Take all medicines")
 * 2. Calling caregivers/doctors ("Call caregiver", "Call doctor", "Call Dr Sharma")
 * 3. Navigation ("Go to medicines", "Open visits", "Go home", "Emergency SOS")
 * 4. Mode switching ("Switch to elder mode", "Standard mode", "Caregiver mode")
 * 5. Symptom logging & triage ("I have a headache", "My chest hurts")
 * 6. Health questions & nurse advice with spoken TTS output.
 */

import { api, type Med, localSafety } from "./api";
import { go } from "./store";
import { speakSmart } from "./voice";
import { toast } from "sonner";
import type { AdaptiveProfileRaw } from "./useAdaptiveProfile";

export type VoiceContext = {
  pid: number;
  meds?: Med[];
  onMedUpdated?: () => void;
  adaptiveRaw?: AdaptiveProfileRaw;
  setAdaptiveProfile?: (raw: AdaptiveProfileRaw) => void;
};

export type VoiceExecutionResult = {
  handled: boolean;
  category: "medication" | "call" | "navigation" | "persona" | "symptom" | "qa";
  message: string;
  speakText: string;
};

export async function processVoiceCommand(
  rawTranscript: string,
  ctx: VoiceContext
): Promise<VoiceExecutionResult> {
  const text = rawTranscript.trim();
  const lower = text.toLowerCase();

  // ── 1. EMERGENCY CALL COMMANDS ────────────────────────────────────
  if (
    lower.includes("call caregiver") ||
    lower.includes("call my caregiver") ||
    lower.includes("call daughter") ||
    lower.includes("call son") ||
    lower.includes("call family")
  ) {
    const phone = localStorage.getItem("@sathi_caregiver_phone") || "+91 98765 43210";
    const msg = `Calling your caregiver at ${phone} now...`;
    toast.info(msg);
    void speakSmart("Calling your caregiver now.");
    window.location.href = `tel:${phone.replace(/\s+/g, "")}`;
    return {
      handled: true,
      category: "call",
      message: msg,
      speakText: "Calling your caregiver now.",
    };
  }

  if (
    lower.includes("call doctor") ||
    lower.includes("call dr sharma") ||
    lower.includes("call cardiologist") ||
    lower.includes("call hospital")
  ) {
    const phone = "+91 98200 12345";
    const msg = "Calling Dr. Rajesh Sharma (Chief Cardiologist)...";
    toast.info(msg);
    void speakSmart("Calling Dr. Sharma now.");
    window.location.href = `tel:${phone.replace(/\s+/g, "")}`;
    return {
      handled: true,
      category: "call",
      message: msg,
      speakText: "Calling Dr. Sharma now.",
    };
  }

  if (
    lower === "emergency" ||
    lower === "sos" ||
    lower.includes("emergency sos") ||
    lower.includes("call ambulance") ||
    lower.includes("call 112") ||
    lower.includes("call 108")
  ) {
    go("#/sos");
    if (ctx.pid) {
      void api.sosAlert(ctx.pid, "Voice command SOS triggered");
    }
    const msg = "Emergency SOS initiated. Alerting care team.";
    toast.error(msg);
    void speakSmart("Emergency SOS initiated. Opening emergency help now.");
    return {
      handled: true,
      category: "call",
      message: msg,
      speakText: "Emergency SOS initiated.",
    };
  }

  // ── 2. MEDICATION COMMANDS ───────────────────────────────────────
  // Intent: "take all" / "take all medicines"
  if (lower.includes("take all") || lower.includes("all medicines taken")) {
    if (ctx.meds && ctx.meds.length > 0 && ctx.pid) {
      for (const m of ctx.meds) {
        try {
          await api.confirm(ctx.pid, m.id);
        } catch { /* offline */ }
      }
      ctx.onMedUpdated?.();
      const msg = "All medicines marked as taken for today!";
      toast.success(msg);
      void speakSmart("All medicines marked as taken for today! Excellent job staying on track.");
      return {
        handled: true,
        category: "medication",
        message: msg,
        speakText: msg,
      };
    }
  }

  // Intent: "take [medication]" or "mark [medication] as taken"
  if (lower.startsWith("take ") || lower.includes("mark ") || lower.includes("taken")) {
    if (ctx.meds && ctx.meds.length > 0 && ctx.pid) {
      // Find matching medicine
      const match = ctx.meds.find((m) => {
        const nameParts = m.name.toLowerCase().split(/\s+/);
        return nameParts.some((part) => part.length >= 3 && lower.includes(part));
      });

      if (match) {
        try {
          await api.confirm(ctx.pid, match.id);
        } catch { /* offline */ }
        ctx.onMedUpdated?.();
        const msg = `${match.name} marked as taken!`;
        toast.success(msg);
        void speakSmart(`${match.name} marked as taken. Great job!`);
        return {
          handled: true,
          category: "medication",
          message: msg,
          speakText: msg,
        };
      }
    }
  }

  // Intent: "what medicines do i have" / "what is my schedule"
  if (
    lower.includes("what medicines") ||
    lower.includes("which medicines") ||
    lower.includes("what pills") ||
    lower.includes("do i have medicines")
  ) {
    if (ctx.meds && ctx.meds.length > 0) {
      const medList = ctx.meds.map((m) => `${m.name} at ${m.time}`).join(", ");
      const speakText = `You have ${ctx.meds.length} active medicines: ${medList}.`;
      toast.info(speakText);
      void speakSmart(speakText);
      return {
        handled: true,
        category: "medication",
        message: speakText,
        speakText,
      };
    } else {
      const msg = "You currently have no active medicines listed.";
      toast.info(msg);
      void speakSmart(msg);
      return {
        handled: true,
        category: "medication",
        message: msg,
        speakText: msg,
      };
    }
  }

  // ── 3. NAVIGATION COMMANDS ───────────────────────────────────────
  if (lower.includes("go to medicines") || lower.includes("open medicines") || lower.includes("show meds")) {
    go("#/meds");
    const msg = "Opening medicines list.";
    void speakSmart(msg);
    return { handled: true, category: "navigation", message: msg, speakText: msg };
  }

  if (lower.includes("go home") || lower.includes("open home") || lower.includes("show today")) {
    go("#/home");
    const msg = "Opening today's recovery overview.";
    void speakSmart(msg);
    return { handled: true, category: "navigation", message: msg, speakText: msg };
  }

  if (lower.includes("doctor") || lower.includes("visits") || lower.includes("appointments") || lower.includes("follow up")) {
    go("#/followups");
    const msg = "Opening doctor visits and appointments.";
    void speakSmart(msg);
    return { handled: true, category: "navigation", message: msg, speakText: msg };
  }

  if (lower.includes("ask sathi") || lower.includes("chat") || lower.includes("assistant")) {
    go("#/chat");
    const msg = "Opening Ask Sathi assistant.";
    void speakSmart(msg);
    return { handled: true, category: "navigation", message: msg, speakText: msg };
  }

  if (lower.includes("scan") || lower.includes("camera") || lower.includes("prescription")) {
    go("#/scan");
    const msg = "Opening prescription scanner.";
    void speakSmart(msg);
    return { handled: true, category: "navigation", message: msg, speakText: msg };
  }

  // ── 4. PERSONA & ACCESSIBILITY SWITCHING ──────────────────────────
  if (lower.includes("elder mode") || lower.includes("senior mode")) {
    if (ctx.adaptiveRaw && ctx.setAdaptiveProfile) {
      ctx.setAdaptiveProfile({
        ...ctx.adaptiveRaw,
        ageBand: "elder",
        roleOverride: "patient",
      });
      const msg = "Switched to Elder Mode with larger text and high contrast.";
      toast.success(msg);
      void speakSmart(msg);
      return { handled: true, category: "persona", message: msg, speakText: msg };
    }
  }

  if (lower.includes("standard mode") || lower.includes("regular mode")) {
    if (ctx.adaptiveRaw && ctx.setAdaptiveProfile) {
      ctx.setAdaptiveProfile({
        ...ctx.adaptiveRaw,
        ageBand: "adult",
        roleOverride: "patient",
      });
      const msg = "Switched to Standard Mode.";
      toast.success(msg);
      void speakSmart(msg);
      return { handled: true, category: "persona", message: msg, speakText: msg };
    }
  }

  if (lower.includes("caregiver mode") || lower.includes("switch to caregiver")) {
    if (ctx.adaptiveRaw && ctx.setAdaptiveProfile) {
      ctx.setAdaptiveProfile({
        ...ctx.adaptiveRaw,
        ageBand: "adult",
        roleOverride: "caregiver",
      });
      const msg = "Switched to Caregiver Mode.";
      toast.success(msg);
      void speakSmart(msg);
      return { handled: true, category: "persona", message: msg, speakText: msg };
    }
  }

  // ── 5. SYMPTOM REPORTING & SAFETY TRIAGE ─────────────────────────
  const safety = localSafety(lower);
  const isSymptom =
    safety !== "NORMAL" ||
    /(headache|pain|ache|dizzy|nausea|vomit|cough|fever|bleed|fell|tired|swelling|breathe)/i.test(lower);

  if (isSymptom && ctx.pid) {
    let speakResponse = "I have logged that symptom for your care team.";
    try {
      const res = await api.symptom(ctx.pid, text);
      if (res.safety_status === "ESCALATE" || safety === "ESCALATE") {
        speakResponse = "This sounds serious. Please call your doctor or tap Emergency SOS immediately.";
        toast.error("Urgent symptom flagged! Please seek medical assistance.");
      } else if (res.ai_followup) {
        speakResponse = res.ai_followup;
        toast.info(res.ai_followup);
      } else {
        toast.success(`Symptom recorded: "${text}"`);
      }
    } catch {
      toast.info(`Symptom recorded offline: "${text}"`);
    }

    void speakSmart(speakResponse);
    return {
      handled: true,
      category: "symptom",
      message: text,
      speakText: speakResponse,
    };
  }

  // ── 6. GENERAL RECOVERY Q&A (AI ASSISTANT) ────────────────────────
  if (ctx.pid) {
    try {
      const aiRes = await api.aiChat(ctx.pid, text);
      const answer = aiRes.message || "I'm here to help with your recovery.";
      toast.info(answer);
      void speakSmart(answer);
      return {
        handled: true,
        category: "qa",
        message: answer,
        speakText: answer,
      };
    } catch {
      const fallback = `I heard: "${text}". Ask Sathi is ready to help.`;
      toast.info(fallback);
      void speakSmart(fallback);
      return {
        handled: true,
        category: "qa",
        message: fallback,
        speakText: fallback,
      };
    }
  }

  return {
    handled: false,
    category: "qa",
    message: text,
    speakText: `I heard: ${text}`,
  };
}
