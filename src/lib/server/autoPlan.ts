import { aiJson } from "@/lib/providers/text";

export type AutoPlan = { goal: "ad" | "edu"; seconds: number; aspect: "9:16" | "1:1" | "16:9"; voiceover: boolean; gender?: "m" | "f"; age?: "young" | "adult" | "senior"; tone?: "calm" | "energetic" | "formal" | "warm" };

/** «تلقائي»: the customer only wrote what they want; read the kind of video, length and size from it (cheap and quick). */
export async function autoPlan(text: string): Promise<AutoPlan> {
  const fallback: AutoPlan = { goal: "ad", seconds: 30, aspect: "9:16", voiceover: true };
  const t = text.trim().slice(0, 1500);
  if (t.length < 5) return fallback;
  try {
    const r = await aiJson<{ goal?: string; seconds?: number; aspect?: string; voiceover?: boolean; gender?: string; age?: string; tone?: string }>(
      'Read this video request (Arabic) and answer JSON {"goal":"ad"|"edu","seconds":15|30|60|90|120,"aspect":"9:16"|"1:1"|"16:9","voiceover":true|false,"gender":"m"|"f"|"","age":"young"|"adult"|"senior"|"","tone":"calm"|"energetic"|"formal"|"warm"|""}. goal "edu" = explaining/teaching/awareness, "ad" = promoting a business, offer or product. seconds: use the length they asked for, else 30 for ads and 60 for edu. aspect: 9:16 unless they ask for square (1:1) or YouTube/landscape (16:9). voiceover true by default (a video with narration is expected); false ONLY if they say no voice / silent / music only. gender/age/tone: only if the request says so (e.g. a woman\'s voice, a young voice, an excited or calm tone), else empty strings.',
      t, 80, { provider: "claude", model: "claude-haiku-5-5" });
    const goal = r.goal === "edu" ? "edu" : "ad";
    const ok = goal === "edu" ? [30, 60, 90, 120] : [15, 30, 60];
    const near = (v: number, list: number[]) => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
    return {
      goal, seconds: near(Number(r.seconds) || (goal === "edu" ? 60 : 30), ok),
      aspect: r.aspect === "1:1" || r.aspect === "16:9" ? r.aspect : "9:16", voiceover: goal === "edu" ? true : r.voiceover !== false,
      gender: r.gender === "m" || r.gender === "f" ? r.gender : undefined, age: r.age === "young" || r.age === "adult" || r.age === "senior" ? r.age : undefined,
      tone: r.tone === "calm" || r.tone === "energetic" || r.tone === "formal" || r.tone === "warm" ? r.tone : undefined,
    };
  } catch { return fallback; }
}
