export type PlanItem = { week: number; day: "السبت" | "الاثنين" | "الأربعاء"; date: string; format: "post" | "reel" | "carousel"; pillar: string; topic: string; hook: string; goal: string; prompt: string; caption: string };
export type Analysis = { positioning: string; audience: string; voice: string; strengths: string[]; gaps: string[]; opportunities: string[]; differentiators: string[]; competitors: string };
export type Plan = { month: string; items: PlanItem[] };

export const FORMAT_LABEL: Record<string, string> = { post: "بوست", reel: "ريلز", carousel: "كاروسيل" };
export const FORMAT_TOOL: Record<string, string> = { post: "post", carousel: "carousel", reel: "motion-video" };
export const DAYS: PlanItem["day"][] = ["السبت", "الاثنين", "الأربعاء"];
/** the three weekly slots rotate so each week has one post, one reel and one carousel, in a different order each week */
export const ROTATION: PlanItem["format"][][] = [["post", "reel", "carousel"], ["reel", "carousel", "post"], ["carousel", "post", "reel"], ["post", "carousel", "reel"]];

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const arr = (v: unknown, n: number, m: number) => (Array.isArray(v) ? v.map((x) => str(x, m)).filter(Boolean).slice(0, n) : []);

export function normaliseAnalysis(r: unknown): Analysis | null {
  const o = (r ?? {}) as Record<string, unknown>;
  const a: Analysis = { positioning: str(o.positioning, 500), audience: str(o.audience, 400), voice: str(o.voice, 300), strengths: arr(o.strengths, 4, 160), gaps: arr(o.gaps, 4, 160), opportunities: arr(o.opportunities, 4, 160), differentiators: arr(o.differentiators, 4, 160), competitors: str(o.competitors, 400) };
  return a.positioning ? a : null;
}
export function normaliseWeek(raw: unknown, week: number, dates: string[]): PlanItem[] {
  const list = Array.isArray((raw as { items?: unknown })?.items) ? ((raw as { items: unknown[] }).items) : [];
  return DAYS.map((day, i) => {
    const o = (list[i] ?? {}) as Record<string, unknown>;
    return { week, day, date: dates[i], format: ROTATION[week - 1][i], pillar: str(o.pillar, 40), topic: str(o.topic, 160), hook: str(o.hook, 200), goal: str(o.goal, 120), prompt: str(o.prompt, 1100), caption: str(o.caption, 900) };
  }).filter((x) => x.topic && x.prompt);
}
/** Saturdays, Mondays and Wednesdays of 4 weeks, starting from the first Saturday on or after `from`. */
export function planDates(from = new Date()) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  const fmt = (x: Date) => `${x.getUTCDate()}/${x.getUTCMonth() + 1}`;
  return [0, 1, 2, 3].map((w) => [0, 2, 4].map((k) => { const x = new Date(d); x.setUTCDate(d.getUTCDate() + w * 7 + k); return fmt(x); }));
}
