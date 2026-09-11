import { useState, useEffect } from "react";
import { Mic, X, Phone, Pill, Navigation, UserCircle2, AlertOctagon } from "lucide-react";
import { VoiceInputButton } from "./VoiceInputButton";
import { processVoiceCommand } from "../lib/voiceEngine";
import { useApp } from "../lib/store";
import { api, type Med } from "../lib/api";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";

export function GlobalVoiceOverlay() {
  const { pid, adaptiveRaw, setAdaptiveProfile } = useApp();
  const profile = useAdaptiveProfile();
  const isElder = profile.isElder;

  const [isOpen, setIsOpen] = useState(false);
  const [meds, setMeds] = useState<Med[]>([]);
  const [lastResult, setLastResult] = useState<string>("");

  useEffect(() => {
    if (pid && isOpen) {
      api.meds(pid).then(setMeds).catch(() => {});
    }
  }, [pid, isOpen]);

  const handleTranscript = async (transcript: string) => {
    if (!transcript.trim()) return;
    setLastResult(`"${transcript}"`);
    const res = await processVoiceCommand(transcript, {
      pid,
      meds,
      adaptiveRaw,
      setAdaptiveProfile,
    });
    if (res.handled) {
      setTimeout(() => setIsOpen(false), 1800);
    }
  };

  return (
    <>
      {/* Header Mic Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Voice First Command Assistant — Tap to speak"
        className="flex min-h-[40px] items-center gap-1 rounded-xl border border-primary/40 bg-primary-soft px-2.5 py-1 text-xs font-bold text-primary shadow-elev-1 hover:bg-primary hover:text-white transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Mic className="h-4 w-4" />
        <span className="hidden sm:inline">Voice</span>
      </button>

      {/* Voice Assistant Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Voice Command Assistant"
          className="fixed inset-0 z-modal flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div
            className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-elev-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-white shadow-sm">
                  <Mic className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-ink">Voice Assistant</h2>
                  <p className="text-xs text-ink-muted">Speak any command naturally</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close voice assistant"
                className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted hover:text-ink hover:bg-surface-sunken"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Central Voice Button */}
            <div className="grid place-items-center py-4 text-center">
              <VoiceInputButton
                prominent
                elderVariant={isElder}
                onTranscript={handleTranscript}
                label="Tap & speak your command"
              />
              {lastResult && (
                <p className="mt-3 text-sm font-semibold text-primary bg-primary-soft/50 px-3 py-1.5 rounded-xl border border-primary/20 animate-in fade-in">
                  Heard: {lastResult}
                </p>
              )}
            </div>

            {/* Example Command Pills */}
            <div className="mt-4 border-t border-border pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
                Try saying:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { icon: Pill, text: "Take aspirin" },
                  { icon: Phone, text: "Call doctor" },
                  { icon: Phone, text: "Call caregiver" },
                  { icon: Navigation, text: "Go to medicines" },
                  { icon: UserCircle2, text: "Elder mode" },
                  { icon: AlertOctagon, text: "Emergency SOS" },
                ].map((chip) => (
                  <button
                    key={chip.text}
                    type="button"
                    onClick={() => handleTranscript(chip.text)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-sunken px-2.5 py-1 text-xs font-medium text-ink hover:border-primary/40 hover:bg-primary-soft transition-all"
                  >
                    <chip.icon className="h-3 w-3 text-primary" />
                    <span>"{chip.text}"</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
