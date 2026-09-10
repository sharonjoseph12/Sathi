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
