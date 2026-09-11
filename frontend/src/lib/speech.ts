// Shared speech utilities — extracted so screens don't cross-import from each other.
// Used by tools.tsx (Dev 4) and tabs.tsx (Dev 2).

/**
 * One-shot Web Speech recognition: listens for a single utterance,
 * calls `cb` with the transcript, then stops.
 */
export function listenOnce(cb: (text: string) => void, setListening: (b: boolean) => void) {
  const SR = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
    || (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition;
  if (!SR) return;
  const rec = new SR();
  rec.lang = navigator.language || "en-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  setListening(true);
  rec.onresult = (e: SpeechRecognitionEvent) => {
    const text = e.results[0]?.[0]?.transcript || "";
    cb(text);
    setListening(false);
  };
  rec.onerror = () => setListening(false);
  rec.onend = () => setListening(false);
  rec.start();
}
