import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Volume2, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAdaptiveProfile } from "../lib/useAdaptiveProfile";
import { transcribeBlob } from "../lib/voice";
import { cn } from "../lib/utils";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";

export interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
  className?: string;
  prominent?: boolean;
  elderVariant?: boolean;
  label?: string;
}

export function VoiceInputButton({
  onTranscript,
  onStateChange,
  className,
  prominent,
  elderVariant,
  label = "Tap to speak",
}: VoiceInputButtonProps) {
  const { isElder, prefersVoice, prefersReducedMotion } = useAdaptiveProfile();
  const isProminent = elderVariant ?? prominent ?? (isElder || prefersVoice);

  const [state, setState] = useState<VoiceState>("idle");
  const [partialText, setPartialText] = useState("");
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Audio recording fallbacks
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const updateState = (newState: VoiceState) => {
    setState(newState);
    onStateChange?.(newState);
  };

  // Pre-permission check
  const handleMicClick = async () => {
    if (state === "listening") {
      stopListening();
      return;
    }
    if (state === "processing" || state === "speaking") return;

    // Check if permission already granted or if we should show explainer
    const permissionAsked = localStorage.getItem("@sathi_mic_permission_asked");
    if (!permissionAsked) {
      setShowPermissionModal(true);
      return;
    }

    startListening();
  };

  const grantPermissionAndStart = async () => {
    localStorage.setItem("@sathi_mic_permission_asked", "true");
    setShowPermissionModal(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately after permission check
      stream.getTracks().forEach((track) => track.stop());
      setPermissionDenied(false);
      startListening();
    } catch {
      setPermissionDenied(true);
      toast.error("Microphone access was denied. You can still type below.");
    }
  };

  const startListening = () => {
    setPartialText("");
    updateState("listening");

    // Attempt 1: Web Speech API (Native Chromium)
    const W = window as unknown as {
      SpeechRecognition?: new () => any;
      webkitSpeechRecognition?: new () => any;
    };
    const SpeechRec = W.SpeechRecognition || W.webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = navigator.language || "en-IN";
        rec.continuous = false;
        rec.interimResults = true;

        rec.onresult = (e: any) => {
          let interim = "";
          let final = "";
          for (let i = e.resultIndex; i < e.results.length; ++i) {
            if (e.results[i].isFinal) {
              final += e.results[i][0].transcript;
            } else {
              interim += e.results[i][0].transcript;
            }
          }
          const text = final || interim;
          setPartialText(text);

          if (final) {
            updateState("processing");
            onTranscript(final);
            setTimeout(() => updateState("idle"), 600);
          }
        };

        rec.onerror = (e: any) => {
          console.warn("Web Speech API error, falling back to backend Whisper", e);
          stopListening();
          fallbackToMediaRecorder();
        };

        rec.onend = () => {
          if (state === "listening") {
            updateState("idle");
          }
        };

        recognitionRef.current = rec;
        rec.start();
        return;
      } catch (err) {
        console.warn("Failed to start SpeechRecognition:", err);
      }
    }

    // Attempt 2: Fallback to MediaRecorder + backend Whisper
    fallbackToMediaRecorder();
  };

  const fallbackToMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) {
          updateState("idle");
          return;
        }

        updateState("processing");
        try {
          const res = await transcribeBlob(blob);
          if (res?.text) {
            onTranscript(res.text);
          } else {
            toast.error("Couldn't hear that — try typing instead.");
          }
        } catch {
          toast.error("Voice processing timed out. Please type your message.");
        } finally {
          updateState("idle");
        }
      };

      mediaRecorderRef.current = mr;
      mr.start();
    } catch {
      setPermissionDenied(true);
      updateState("idle");
      toast.error("Microphone access is needed for voice input.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    updateState("processing");
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <div className={cn("relative flex flex-col items-center select-none", className)}>
      {/* Real-time partial transcript announce */}
      <div
        aria-live="polite"
        className={cn(
          "w-full text-center transition-all duration-200 overflow-hidden",
          state === "listening" ? "max-h-20 mb-2 py-1" : "max-h-0 py-0"
        )}
      >
        <p className="inline-block rounded-xl border border-primary/20 bg-primary-soft/80 px-4 py-1.5 text-sm font-medium text-primary shadow-elev-1">
          {partialText || "Listening to your voice..."}
        </p>
      </div>

      {/* Permission Explainer Modal */}
      <AnimatePresence>
        {showPermissionModal && (
          <div className="fixed inset-0 z-dialog flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPermissionModal(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-dialog w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-elev-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mic-modal-title"
            >
              <div className="flex items-center gap-3 mb-3 text-primary">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft">
                  <Mic className="h-6 w-6" />
                </span>
                <h3 id="mic-modal-title" className="text-lg font-bold text-ink">
                  Microphone Access
                </h3>
              </div>
              <p className="text-sm text-ink-muted leading-relaxed mb-6">
                Sathi needs your microphone to understand your spoken questions, symptoms, and medicine confirmations. Voice is completely private and optional.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPermissionModal(false)}
                  className="flex-1 min-h-[44px] rounded-xl border border-border bg-surface-sunken text-sm font-semibold text-ink hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={grantPermissionAndStart}
                  className="flex-1 min-h-[44px] rounded-xl bg-primary text-sm font-semibold text-white shadow-elev-1 hover:brightness-105"
                >
                  Allow & Speak
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inline Non-Blocking Microphone Warning if Denied */}
      {permissionDenied && (
        <div
          role="alert"
          className="mb-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-bg px-3.5 py-2 text-xs font-semibold text-warning"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Microphone access was blocked in browser settings. You can still type below.</span>
          <button
            type="button"
            onClick={() => setPermissionDenied(false)}
            aria-label="Dismiss warning"
            className="ml-auto text-ink-muted hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Button Render Variants */}
      {isProminent ? (
        /* Prominent full-width button (Elder / Voice-Primary persona) */
        <button
          type="button"
          onClick={handleMicClick}
          disabled={state === "processing"}
          aria-label={
            state === "listening"
              ? "Listening — tap to finish speaking"
              : state === "processing"
              ? "Processing voice input"
              : state === "speaking"
              ? "Assistant is speaking"
              : label
          }
          className={cn(
            "relative flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-lg font-bold transition-all duration-200 shadow-elev-2",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]",
            state === "listening"
              ? "bg-danger text-white ring-4 ring-danger/30 animate-pulse"
              : state === "processing"
              ? "bg-primary-soft text-primary border border-primary/30 cursor-wait"
              : state === "speaking"
              ? "bg-ai text-white"
              : "bg-primary text-white hover:brightness-105"
          )}
        >
          {state === "listening" && (
            <>
              <span className="relative flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-white" />
              </span>
              <span>Listening… (Tap to finish)</span>
            </>
          )}

          {state === "processing" && (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Thinking…</span>
            </>
          )}

          {state === "speaking" && (
            <>
              <Volume2 className="h-6 w-6 animate-bounce text-white" />
              <span>Sathi Speaking…</span>
            </>
          )}

          {state === "idle" && (
            <>
              <Mic className="h-6 w-6" />
              <span>{label}</span>
            </>
          )}
        </button>
      ) : (
        /* Floating / Icon Button Variant (Standard persona) */
        <button
          type="button"
          onClick={handleMicClick}
          disabled={state === "processing"}
          aria-label={
            state === "listening"
              ? "Listening — tap to finish"
              : state === "processing"
              ? "Processing audio"
              : state === "speaking"
              ? "Speaking"
              : label
          }
          className={cn(
            "relative grid h-12 w-12 place-items-center rounded-2xl border transition-all duration-200 shadow-elev-3",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary active:scale-95",
            state === "listening"
              ? "border-danger bg-danger text-white ring-4 ring-danger/20"
              : state === "processing"
              ? "border-border bg-surface-sunken text-ink-muted cursor-wait"
              : state === "speaking"
              ? "border-ai bg-ai text-white"
              : "border-border bg-surface text-primary hover:bg-primary-soft"
          )}
        >
          {state === "listening" && (
            <motion.div
              initial={prefersReducedMotion ? false : { scale: 0.8 }}
              animate={prefersReducedMotion ? false : { scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Mic className="h-6 w-6 text-white" />
            </motion.div>
          )}

          {state === "processing" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          {state === "speaking" && <Volume2 className="h-5 w-5 text-white animate-pulse" />}
          {state === "idle" && <Mic className="h-6 w-6" />}
        </button>
      )}
    </div>
  );
}
