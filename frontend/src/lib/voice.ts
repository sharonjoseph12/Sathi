import { api } from "./api";

/** Server-first voice helpers. Groq Whisper for input, Edge neural voices for
 * output, always degrading gracefully to on-device Web Speech APIs. */

export async function transcribeBlob(blob: Blob): Promise<{ text: string; language: string } | null> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(blob);
  });
  try {
    const r = await api.transcribe(dataUrl);
    return r.text ? { text: r.text, language: r.language || "" } : null;
  } catch {
    return null;
  }
}

export async function speakSmart(text: string, lang = "en-IN"): Promise<void> {
  try {
    const r = await api.speak(text, lang);
    if (r.audio) {
      await new Promise<void>((resolve) => {
        const a = new Audio(r.audio);
        a.onended = () => resolve();
        a.onerror = () => resolve();
        a.play().catch(() => resolve());
      });
      return;
    }
  } catch {
    /* fall through to device voice */
  }
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* voice optional */
  }
}

/** Short WebAudio chime for dose/alert feedback. No-op on failure. */
export function playChime(type: "start" | "success" | "alert" | "neutral" = "neutral"): void {
  try {
    const AC = (window as unknown as { AudioContext?: new () => AudioContext; webkitAudioContext?: new () => AudioContext }).AudioContext
      || (window as unknown as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const freqs: Record<string, number[]> = {
      start: [523.25, 659.25],
      success: [523.25, 659.25, 783.99],
      alert: [440, 349.23],
      neutral: [587.33],
    };
    const notes = freqs[type] || freqs.neutral;
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t0 = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.3);
    });
    setTimeout(() => { void ctx.close().catch(() => {}); }, notes.length * 130 + 400);
  } catch {
    /* audio optional */
  }
}
