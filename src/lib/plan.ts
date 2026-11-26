import { ANIM_IDS } from "@/lib/animStyles";
export type PlanItem = { week: number; day: "السبت" | "الاثنين" | "الأربعاء"; date: string; time?: string; format: PlanFormat; job?: string; pillar: string; topic: string; hook: string; goal: string; prompt: string; caption: string };
export type Analysis = { positioning: string; audience: string; voice: string; strengths: string[]; gaps: string[]; opportunities: string[]; differentiators: string[]; competitors: string };
export type Plan = { month: string; start?: string; scope?: "week" | "month"; items: PlanItem[] };
export type Slot = { day: PlanItem["day"]; date: string; format: PlanItem["format"] };
export type PlanColors = { bg: string; ink: string; accent: string; soft: string };
/** The customer's choices for everything the plan prepares (the same for the manual buttons and the weekly automatic run). */
export type InstaRead = { voice: string; topics: string[]; formats: string[]; strong: string[]; gaps: string[]; ideas: string[]; best: string; at?: string };
export type PlanPrefs = {
  mine?: import("@/lib/mine").Mine; // «تعليماتي»: his own instructions, skills switched off, skills of his own
  insta?: InstaRead;                // what Shaheen read from the customer's own Instagram text/screenshots (the «حلّل حسابي» card)
  carouselBg?: "shapes" | "ai";
  postColors?: PlanColors | null;   // null/undefined = the brand's own colours
  dialect?: string;                 // language/dialect of posts' text and of the reel's voice
  voiceover?: boolean;              // reels come with a voice-over (default yes)
  voice?: string;                   // a registered voice id ("" = automatic)
  vgender?: "m" | "f" | "";
  vage?: "young" | "adult" | "senior" | "";
  tone?: string;
  formats?: PlanFormat[];           // which kinds of posts the plan is made of (empty/undefined = post, carousel and reel as before)
};
export type PlanFormat = "post" | "carousel" | "ad" | "reel" | "anim" | "site" | "fpost" | "fcarousel" | "fad" | "creative" | "fsite" | "scenes" | "image";
export const PLAN_FORMATS: PlanFormat[] = ["post", "carousel", "ad", "reel", "anim", "site", "fpost", "fcarousel", "fad", "creative", "fsite", "scenes", "image"];
/** the tool each kind is made with (its switch in the admin decides whether the customer may pick it) */
export const FORMAT_TOOL_ID: Record<PlanFormat, string> = { post: "post", carousel: "carousel", ad: "ad-design", reel: "motion-video", anim: "anim-video", site: "site-video", fpost: "free-post", fcarousel: "free-carousel", fad: "free-ad", creative: "free-motion", fsite: "site-free", scenes: "real-scenes", image: "image" };
/** the customer's choice, cleaned: known kinds only, in a fixed order; nothing valid = the default three */
/** kinds that first read the customer's website (his own link, from the identity) */
export const SITE_FORMATS: PlanFormat[] = ["site", "fsite"];
export const cleanFormats = (v: unknown, off: PlanFormat[] = []): PlanFormat[] => {
  const a = Array.isArray(v) ? v : [];
  const out = PLAN_FORMATS.filter((f) => a.includes(f) && !off.includes(f));
  return out.length ? out : ["post", "carousel", "reel"];
};
const HEX = /^#[0-9a-f]{6}$/i;
export const cleanColors = (c: unknown): PlanColors | null => {
  const o = (c ?? {}) as Record<string, unknown>;
  return ["bg", "ink", "accent", "soft"].every((k) => typeof o[k] === "string" && HEX.test(o[k] as string)) ? { bg: o.bg as string, ink: o.ink as string, accent: o.accent as string, soft: o.soft as string } : null;
};
/** The request that prepares one slot with the normal tools. */
export function itemRequest(x: PlanItem, prefs: PlanPrefs | null | undefined, slides: number): { url: string; body: Record<string, unknown> } {
  const dialect = prefs?.dialect || "kuwaiti";
  if (x.format === "image") {
    return { url: "/api/jobs", body: { tool: "image", input: { prompt: x.prompt.slice(0, 1500), aspect: "4:5", count: 1 } } };
  }
  if (x.format === "site") { // the website is read first (by the page), then siteJob is added
    return { url: "/api/lesson", body: { siteStyle: "auto", readShots: false, shots: [], topic: x.prompt, caption: x.caption, seconds: 30, aspect: "9:16", dialect, voiceover: prefs?.voiceover !== false, music: true, ...(prefs?.voice ? { voice: prefs.voice } : {}) } };
  }
  if (x.format === "fsite") {
    return { url: "/api/free-motion", body: { useLogo: true, useStyle: true, idea: x.prompt, seconds: 30, aspect: "9:16", dialect, voiceover: prefs?.voiceover !== false, music: true, useIdentity: false, ...(prefs?.voice ? { voice: prefs.voice } : {}) } };
  }
  if (x.format === "anim") {
    const style = ANIM_IDS[(x.week * 7 + x.day.length + x.topic.length) % ANIM_IDS.length];
    return { url: "/api/free-motion", body: { idea: x.prompt, aspect: "9:16", seconds: 30, dialect, voiceover: prefs?.voiceover !== false, animTool: true, anim: style, ...(prefs?.voice ? { voice: prefs.voice } : {}) } };
  }
  if (x.format === "fpost" || x.format === "fcarousel" || x.format === "fad") {
    return { url: "/api/free-post", body: { tool: FORMAT_TOOL[x.format], idea: x.prompt, aspect: "4:5", slides } };
  }
  if (x.format === "creative") {
    return { url: "/api/free-motion", body: { idea: x.prompt, aspect: "9:16", seconds: 30, dialect, voiceover: prefs?.voiceover !== false, ...(prefs?.voice ? { voice: prefs.voice } : {}) } };
  }
  if (x.format === "scenes") {
    const dialect2 = prefs?.dialect || "kuwaiti";
    return { url: "/api/lesson", body: { tool: "real-scenes", source: "stock", topic: x.prompt, seconds: 30, aspect: "9:16", dialect: dialect2, voiceover: prefs?.voiceover !== false, music: true, photos: [], ...(prefs?.voice ? { voice: prefs.voice } : {}) } };
  }
  if (x.format === "reel") {
    const voiceover = prefs?.voiceover !== false;
    return { url: "/api/lesson", body: { mode: "motion", topic: x.prompt, caption: x.caption, seconds: 30, aspect: "9:16", dialect, voiceover, drawings: true, drawLevel: "few", ...(prefs?.voice ? { voice: prefs.voice } : {}), ...(prefs?.vgender ? { vgender: prefs.vgender } : {}), ...(prefs?.vage ? { vage: prefs.vage } : {}), ...(prefs?.tone ? { tone: prefs.tone } : {}) } };
  }
  const colors = cleanColors(prefs?.postColors);
  return { url: "/api/design/start", body: { tool: FORMAT_TOOL[x.format], info: x.prompt, count: x.format === "carousel" ? slides : 1, bgMode: x.format === "carousel" ? (prefs?.carouselBg ?? "shapes") : undefined, aspect: "4:5", dialect, photos: [], useBrand: true, aiImages: x.format === "carousel" && prefs?.carouselBg === "ai", ...(colors ? { colors } : {}) } };
}
/** best posting times in the Gulf */
export const TIMES = ["12:30 ظهراً", "4:30 عصراً", "11:00 مساءً"] as const;
const DEFAULT_TIME: Record<string, string> = { post: TIMES[0], carousel: TIMES[1], reel: TIMES[2], ad: TIMES[0], anim: TIMES[2], site: TIMES[2], fsite: TIMES[2], image: TIMES[0], fpost: TIMES[0], fcarousel: TIMES[1], fad: TIMES[0], creative: TIMES[2], scenes: TIMES[2] };

export const FORMAT_LABEL: Record<string, string> = { post: "بوست", reel: "ريلز موشن", carousel: "كاروسيل", ad: "إعلان", anim: "ريلز أنيميشن", site: "ريلز فيديو من موقعي", fpost: "بوست مبتكر", fcarousel: "كاروسيل مبتكر", fad: "إعلان مبتكر", creative: "ريلز موشن مبتكر", fsite: "ريلز فيديو مبتكر من موقعي", scenes: "مشاهد واقعية", image: "صورة بالذكاء" };
export const FORMAT_TOOL: Record<string, string> = { post: "post", carousel: "carousel", ad: "ad-design", reel: "motion-video", anim: "anim-video", site: "site-video", fpost: "free-post", fcarousel: "free-carousel", fad: "free-ad", creative: "free-motion", fsite: "site-free", scenes: "real-scenes", image: "image" };
export const DAYS: PlanItem["day"][] = ["السبت", "الاثنين", "الأربعاء"];
/** Monday is always the reel; Saturday and Wednesday swap between a carousel and a post every week */
export const ROTATION: PlanItem["format"][][] = [["carousel", "reel", "post"], ["post", "reel", "carousel"], ["carousel", "reel", "post"], ["post", "reel", "carousel"]];

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const arr = (v: unknown, n: number, m: number) => (Array.isArray(v) ? v.map((x) => str(x, m)).filter(Boolean).slice(0, n) : []);

export function normaliseAnalysis(r: unknown): Analysis | null {
  const o = (r ?? {}) as Record<string, unknown>;
  const a: Analysis = { positioning: str(o.positioning, 500), audience: str(o.audience, 400), voice: str(o.voice, 300), strengths: arr(o.strengths, 4, 160), gaps: arr(o.gaps, 4, 160), opportunities: arr(o.opportunities, 4, 160), differentiators: arr(o.differentiators, 4, 160), competitors: str(o.competitors, 400) };
  return a.positioning ? a : null;
}
export function normaliseWeek(raw: unknown, week: number, slots: Slot[]): PlanItem[] {
  const list = Array.isArray((raw as { items?: unknown })?.items) ? ((raw as { items: unknown[] }).items) : [];
  return slots.map((sl, i) => {
    const o = (list[i] ?? {}) as Record<string, unknown>;
    const t = str(o.time, 30);
    const time = TIMES.find((x) => t && (x === t || t.includes(x.slice(0, 4)) || (t.includes("ظهر") && x.includes("ظهر")) || (t.includes("عصر") && x.includes("عصر")) || (t.includes("مساء") && x.includes("مساء")) || (t.includes("11") && x.startsWith("11")))) ?? DEFAULT_TIME[sl.format];
    return { week, day: sl.day, date: sl.date, time, format: sl.format, pillar: str(o.pillar, 40), job: undefined, topic: str(o.topic, 160), hook: str(o.hook, 200), goal: str(o.goal, 120), prompt: str(o.prompt, 1100), caption: str(o.caption, 900) };
  }).filter((x) => x.topic && x.prompt);
}
/** ISO date (yyyy-mm-dd) of the first Saturday of the plan. */
export const planStartISO = (from = new Date()) => { const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())); d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7)); return d.toISOString().slice(0, 10); };
/** Which plan week (0-3) a given day falls in; <0 not started yet, >3 finished. */
export const planWeekOf = (start: string, now = new Date()) => Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.parse(start)) / (7 * 864e5));
/** Saturdays, Mondays and Wednesdays of 4 weeks, starting from the first Saturday on or after `from`. */
export function planDates(from = new Date()) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  const fmt = (x: Date) => `${x.getUTCDate()}/${x.getUTCMonth() + 1}`;
  return [0, 1, 2, 3].map((w) => [0, 2, 4].map((k) => { const x = new Date(d); x.setUTCDate(d.getUTCDate() + w * 7 + k); return fmt(x); }));
}

const DAY_BY_DOW: Record<number, PlanItem["day"]> = { 6: "السبت", 1: "الاثنين", 3: "الأربعاء" };
/** The posting slots of a plan. «month»: 4 weeks (Sat, Mon, Wed) from the first Saturday. «week»: the next three Sat/Mon/Wed days from today (today included). Monday is always the reel. */
export function planSlots(scope: "week" | "month", from = new Date(), formats?: PlanFormat[]): { weeks: Slot[][]; start: string } {
  const fmt = (x: Date) => `${x.getUTCDate()}/${x.getUTCMonth() + 1}`;
  /** the customer chose his own kinds: they take the slots in turn (a single kind fills all of them) */
  const own = formats && formats.length && !(formats.length === 3 && ["post", "carousel", "reel"].every((f) => formats.includes(f as PlanFormat))) ? formats : null;
  const pick = (k: number, fallback: PlanItem["format"]) => (own ? own[k % own.length] : fallback);
  if (scope === "month") {
    const dates = planDates(from);
    return { start: planStartISO(from), weeks: dates.map((d, w) => DAYS.map((day, i) => ({ day, date: d[i], format: pick(w * 3 + i, ROTATION[w][i]) }))) };
  }
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const slots: Slot[] = [];
  for (let k = 0; slots.length < 3 && k < 14; k++, d.setUTCDate(d.getUTCDate() + 1)) {
    const day = DAY_BY_DOW[d.getUTCDay()];
    if (day) slots.push({ day, date: fmt(d), format: pick(slots.length, day === "الاثنين" ? "reel" : day === "السبت" ? "carousel" : "post") });
  }
  return { start: planStartISO(from), weeks: [slots] };
}
