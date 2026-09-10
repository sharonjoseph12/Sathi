// Client OCR: tesseract.js (lazy) + rule-based structuring (VAni medicalParser essentials).
export type OcrMed = {
  name: string; dose: string; frequency: string; time: string;
  instructions: string; confidence: number;
};

export async function ocrImage(blob: Blob, onProgress?: (p: number) => void): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(blob, {}, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
      },
    } as never);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}

const DOSE_RE = /(\d+(?:\.\d+)?\s?(?:mg|mcg|µg|g|ml|units?|iu))\s*(tablets?|capsules?|tabs?|caps?|syrup|drops|injections?|sachets?)?/i;
const FREQ_CODES = ["OD", "BD", "BID", "TDS", "TID", "QID", "HS", "SOS", "PRN", "QD", "QOD", "1-0-1", "1-1-1", "1-0-0"];
const TIMING_WORDS: [RegExp, string][] = [
  [/after\s*(food|meal|lunch|dinner|breakfast)/i, "after meals"],
  [/before\s*(food|meal)/i, "before meals"],
  [/\b(bedtime|night|hs)\b/i, "at bedtime"],
  [/\bmorning\b/i, "in the morning"],
  [/\bempty stomach\b/i, "on empty stomach"],
];

export function parseRxText(raw: string): OcrMed[] {
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 2);
  const out: OcrMed[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dm = line.match(DOSE_RE);
    if (!dm) continue;
    let name = line.slice(0, dm.index).replace(/^[•\-\*\d.)\s]+/, "").trim();
    if (name.length < 2 || /\d/.test(name[0]) && name.length < 3) continue;
    name = name.replace(/\s+/g, " ").slice(0, 60);
    const dose = `${dm[1].replace(/\s+/g, "")}${dm[2] ? ` ${dm[2].toLowerCase()}` : ""}`;
    const ctx = `${line} ${lines[i + 1] || ""}`;
    const codes = FREQ_CODES.filter((c) => new RegExp(`\\b${c.replace(/-/g, "\\-")}\\b`, "i").test(ctx));
    const timing = TIMING_WORDS.find(([re]) => re.test(ctx))?.[1] || "";
    const three = /three|thrice|tds|tid|1-1-1/i.test(ctx);
    const two = /twice|\bbd\b|\bbid\b|1-0-1/i.test(ctx);
    const frequency = codes[0] || (three ? "Three times daily" : two ? "Twice daily" : /once|od|daily/i.test(ctx) ? "Once daily" : "");
    out.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      dose, frequency,
      time: /morning/i.test(ctx) ? "08:00 AM" : /night|bedtime/i.test(ctx) ? "10:00 PM" : "08:00 AM",
      instructions: [codes.join(" "), timing].filter(Boolean).join(" · "),
      confidence: frequency ? 88 : 65,
    });
  }
  return out.slice(0, 12);
}
