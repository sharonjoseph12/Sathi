/**
 * useAdaptiveProfile — STUB (Dev 1 owns the real implementation)
 *
 * Contract agreed on Day 0. Dev 1 replaces this file at the midpoint
 * checkpoint. Every consumer (Dev 2, Dev 3, Dev 4) imports from here
 * and gets the real logic automatically on swap-in — zero changes needed
 * in their own files.
 *
 * Until then, this stub derives a sensible profile from the existing
 * `me.role` so screens work end-to-end during parallel development.
 */
import { useApp } from "./store";

export type AgeBand = "elder" | "adult" | "young_adult" | "guardian";
export type Role = "patient" | "caregiver" | "guardian";
export type DigitalLiteracy = "low" | "medium" | "high";
export type UrgencyLevel = "normal" | "monitor" | "escalate";
export type AccessibilityFlag =
  | "large_text"
  | "high_contrast"
  | "voice_primary"
  | "reduced_motion";

export type AdaptiveProfile = {
  ageBand: AgeBand;
  role: Role;
  digitalLiteracy: DigitalLiteracy;
  urgencyLevel: UrgencyLevel;
  accessibilityFlags: AccessibilityFlag[];
  /** True when ageBand === 'elder' AND digitalLiteracy === 'low' — the most
   * constrained render variant (5-nav cap, ≥20px text, no graphs). */
  isElderMode: boolean;
  /** True for caregiver or guardian roles — shows attention-only views. */
  isCareMode: boolean;
};

/** Stub default — replaced by Dev 1's real hook at midpoint checkpoint. */
const STUB_DEFAULT: AdaptiveProfile = {
  ageBand: "adult",
  role: "patient",
  digitalLiteracy: "medium",
  urgencyLevel: "normal",
  accessibilityFlags: [],
  isElderMode: false,
  isCareMode: false,
};

export function useAdaptiveProfile(): AdaptiveProfile {
  // STUB: derive a basic profile from the existing auth context.
  // Dev 1 replaces this body with real profile-store logic.
  const { me } = useApp();
  if (!me) return STUB_DEFAULT;

  const role: Role =
    me.role === "caregiver" || me.role === "family"
      ? "caregiver"
      : me.role === "guardian"
      ? "guardian"
      : "patient";

  // STUB: no real ageBand/digitalLiteracy data yet — default to adult/medium.
  // Override via ?stub_elder=1 in the URL for development testing.
  const forceElder =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("stub_elder") === "1";

  const ageBand: AgeBand = forceElder ? "elder" : "adult";
  const digitalLiteracy: DigitalLiteracy = forceElder ? "low" : "medium";
  const accessibilityFlags: AccessibilityFlag[] = forceElder
    ? ["large_text", "high_contrast"]
    : [];

  return {
    ageBand,
    role,
    digitalLiteracy,
    urgencyLevel: "normal",
    accessibilityFlags,
    isElderMode: ageBand === "elder" && digitalLiteracy === "low",
    isCareMode: role === "caregiver" || role === "guardian",
  };
}
