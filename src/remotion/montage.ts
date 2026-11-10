/** Smart montage = the customer's own footage + an edit plan (data). Player previews it, the worker renders it. */
import { dimensions, type Aspect } from "./spec";

export type Word = { t: string; s: number; e: number };          // source seconds
export type Seg = { s: number; e: number };                       // kept source range, in output order
export type Title = { text: string; at: number; dur: number; pos: "top" | "center" }; // output seconds (video part)
export type Zoom = { at: number; dur: number; scale: number };    // output seconds (video part)
export type CaptionStyle = "karaoke" | "box" | "minimal";
export type CaptionPos = "bottom" | "middle" | "top";

export type MontageSpec = {
  src: string;          // signed URL (refreshed on every load / render)
  srcPath: string;      // storage path in "uploads"
  srcW: number;
  srcH: number;
  aspect: Aspect;
  font: string;
  colors: { text: string; accent: string; bg: string };
  captions: { on: boolean; style: CaptionStyle; pos?: CaptionPos };
  segments: Seg[];
  words: Word[];
  titles: Title[];
  zooms: Zoom[];
  intro: { on: boolean; title: string; subtitle: string };
  outro: { on: boolean; title: string; subtitle: string };
  music?: { url: string; name: string } | null;
};

export const MFPS = 30;
export const INTRO_S = 2;
export const OUTRO_S = 2.5;
export { dimensions };

export const videoSeconds = (m: MontageSpec) => m.segments.reduce((a, g) => a + Math.max(0, g.e - g.s), 0);
export const introFrames = (m: MontageSpec) => (m.intro.on ? Math.round(INTRO_S * MFPS) : 0);
export const outroFrames = (m: MontageSpec) => (m.outro.on ? Math.round(OUTRO_S * MFPS) : 0);
export const totalFrames = (m: MontageSpec) => Math.max(1, introFrames(m) + Math.round(videoSeconds(m) * MFPS) + outroFrames(m));

/** Source time → output time (video part), or null if that moment was cut. */
export function toOutput(segments: Seg[], t: number) {
  let off = 0;
  for (const g of segments) {
    if (t >= g.s && t <= g.e) return off + (t - g.s);
    off += g.e - g.s;
  }
  return null;
}

/** Words placed on the output timeline, grouped into short caption lines. */
export function captionLines(m: MontageSpec) {
  const placed: { t: string; s: number; e: number }[] = [];
  let off = 0;
  for (const g of m.segments) {
    for (const w of m.words) if (w.s >= g.s - 0.02 && w.e <= g.e + 0.08) placed.push({ t: w.t, s: off + (w.s - g.s), e: off + (Math.min(w.e, g.e) - g.s) });
    off += g.e - g.s;
  }
  const lines: (typeof placed)[] = [];
  let cur: typeof placed = [];
  for (const w of placed) {
    const gap = cur.length ? w.s - cur[cur.length - 1].e : 0;
    if (cur.length && (cur.length >= 4 || gap > 0.6)) { lines.push(cur); cur = []; }
    cur.push(w);
    if (/[.!؟?]$/.test(w.t)) { lines.push(cur); cur = []; }
  }
  if (cur.length) lines.push(cur);
  return lines;
}

/** Every editable text with a friendly label. */
export function montageTexts(m: MontageSpec) {
  const out: { key: string; label: string; value: string }[] = [];
  if (m.intro.on) { out.push({ key: "intro.title", label: "عنوان البداية", value: m.intro.title }); out.push({ key: "intro.subtitle", label: "سطر تحت عنوان البداية", value: m.intro.subtitle }); }
  m.titles.forEach((t, i) => out.push({ key: `titles.${i}`, label: `عنوان متحرك ${i + 1}`, value: t.text }));
  if (m.outro.on) { out.push({ key: "outro.title", label: "عنوان النهاية", value: m.outro.title }); out.push({ key: "outro.subtitle", label: "تواصل / حساب", value: m.outro.subtitle }); }
  return out;
}

export function setMontageText(m: MontageSpec, key: string, value: string): MontageSpec {
  if (key.startsWith("titles.")) { const i = Number(key.split(".")[1]); return { ...m, titles: m.titles.map((t, j) => (j === i ? { ...t, text: value } : t)) }; }
  const [part, field] = key.split(".") as ["intro" | "outro", "title" | "subtitle"];
  return { ...m, [part]: { ...m[part], [field]: value } };
}
