/**
 * useAdaptiveProfile — typed stub (Dev 1 replaces at mid-point checkpoint).
 *
 * Returns an AdaptiveProfile derived from the existing `me` context.
 * Every screen branches render *variants* off this hook — never a separate codepath.
 */
import { useApp } from "./store";

export type AgeBand = "elder" | "adult" | "young_adult" | "guardian";
export type Role = "patient" | "caregiver" | "guardian";
export type DigitalLiteracy = "low" | "medium" | "high";
export type UrgencyLevel = "normal" | "monitor" | "escalate";
export type AccessibilityFlag = "large_text" | "high_contrast" | "voice_primary" | "reduced_motion";

export interface AdaptiveProfile {
  ageBand: AgeBand;
  role: Role;
  digitalLiteracy: DigitalLiteracy;
  urgencyLevel: UrgencyLevel;
  accessibilityFlags: AccessibilityFlag[];
}

/** Derive a stub profile from the existing user record. */
export function useAdaptiveProfile(): AdaptiveProfile {
  const { me } = useApp();

  // Stub logic: derive from existing patient age if available, else default to adult/medium.
  // Dev 1 will replace with real onboarding-captured values.
  const age = (() => {
    try {
      const patients = me?.patients ?? [];
      // We don't have age on Me directly — default heuristic until Dev 1 wires it.
      if (patients.length > 0) return 0; // unknown
    } catch { /* noop */ }
    return 0;
  })();

  const ageBand: AgeBand = age >= 60 ? "elder" : age >= 30 ? "adult" : age > 0 ? "young_adult" : "adult";
  const role: Role = (me?.role as Role) ?? "patient";
  const digitalLiteracy: DigitalLiteracy = ageBand === "elder" ? "low" : "medium";
  const urgencyLevel: UrgencyLevel = "normal";

  const accessibilityFlags: AccessibilityFlag[] = [];
  if (ageBand === "elder") {
    accessibilityFlags.push("large_text", "high_contrast", "voice_primary");
  }
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    accessibilityFlags.push("reduced_motion");
  }

  return { ageBand, role, digitalLiteracy, urgencyLevel, accessibilityFlags };
}

// ── Convenience helpers ──────────────────────────────────────────────
export const isElder = (p: AdaptiveProfile) => p.ageBand === "elder";
export const isLowLiteracy = (p: AdaptiveProfile) => p.digitalLiteracy === "low";
export const isCaregiver = (p: AdaptiveProfile) => p.role === "caregiver";
export const wantsLargeText = (p: AdaptiveProfile) => p.accessibilityFlags.includes("large_text");
export const wantsHighContrast = (p: AdaptiveProfile) => p.accessibilityFlags.includes("high_contrast");
export const wantsVoicePrimary = (p: AdaptiveProfile) => p.accessibilityFlags.includes("voice_primary");
export const wantsReducedMotion = (p: AdaptiveProfile) => p.accessibilityFlags.includes("reduced_motion");
