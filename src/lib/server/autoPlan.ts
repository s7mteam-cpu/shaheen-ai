import { aiJson } from "@/lib/providers/text";

export type AutoPlan = { goal: "ad" | "edu"; seconds: number; aspect: "9:16" | "1:1" | "16:9"; voiceover: boolean };

/** «تلقائي»: the customer only wrote what they want; read the kind of video, length and size from it (cheap and quick). */
export async function autoPlan(text: string): Promise<AutoPlan> {
  const fallback: AutoPlan = { goal: "ad", seconds: 30, aspect: "9:16", voiceover: false };
  const t = text.trim().slice(0, 1500);
  if (t.length < 5) return fallback;
  try {
    const r = await aiJson<{ goal?: string; seconds?: number; aspect?: string; voiceover?: boolean }>(
      'Read this video request (Arabic) and answer JSON {"goal":"ad"|"edu","seconds":15|30|60|90|120,"aspect":"9:16"|"1:1"|"16:9","voiceover":true|false}. goal "edu" = explaining/teaching/awareness, "ad" = promoting a business, offer or product. seconds: use the length they asked for, else 30 for ads and 60 for edu. aspect: 9:16 unless they ask for square (1:1) or YouTube/landscape (16:9). voiceover true only if they ask for a voice, narration or commentary (always true for edu).',
      t, 80, { provider: "claude", model: "claude-haiku-5-5" });
    const goal = r.goal === "edu" ? "edu" : "ad";
    const ok = goal === "edu" ? [30, 60, 90, 120] : [15, 30, 60];
    const near = (v: number, list: number[]) => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
    return {
      goal, seconds: near(Number(r.seconds) || (goal === "edu" ? 60 : 30), ok),
      aspect: r.aspect === "1:1" || r.aspect === "16:9" ? r.aspect : "9:16", voiceover: goal === "edu" ? true : r.voiceover === true,
    };
  } catch { return fallback; }
}
