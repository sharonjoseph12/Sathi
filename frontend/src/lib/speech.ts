// Shared speech utilities — extracted so screens don't cross-import from each other.
// Used by tools.tsx (Dev 4) and tabs.tsx (Dev 2).

/**
 * One-shot Web Speech recognition: listens for a single utterance,
 * calls `cb` with the transcript, then stops.
 */
export function listenOnce(cb: (text: string) => void, setListening: (b: boolean) => void) {
  const W = window as unknown as {
    SpeechRecognition?: new () => any;
    webkitSpeechRecognition?: new () => any;
  };
  const SR = W.webkitSpeechRecognition || W.SpeechRecognition;
  if (!SR) return;
  const rec = new SR();
  rec.lang = navigator.language || "en-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  setListening(true);
  rec.onresult = (e: any) => {
    const text = e.results?.[0]?.[0]?.transcript || "";
    cb(text);
    setListening(false);
  };
  rec.onerror = () => setListening(false);
  rec.onend = () => setListening(false);
  rec.start();
}

/**
 * Browser TTS one-shot: speaks `text` using Web Speech API synthesis.
 */
export function speak(text: string, lang = "en-IN") {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* voice optional */
  }
}
