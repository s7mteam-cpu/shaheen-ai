/** Smart montage = the customer's own footage + an edit plan (data). Player previews it, the worker renders it. */
import { ICONS, dimensions, type Aspect, type IconName } from "./spec";

export type Word = { t: string; s: number; e: number };          // source seconds
export type Seg = { s: number; e: number };                       // kept source range, in output order
export type TitleStyle = "kinetic" | "pill" | "lower" | "editorial" | "marker" | "typewriter";
export type Title = { text: string; at: number; dur: number; pos: "top" | "center"; style?: TitleStyle; hl?: string; sub?: string }; // output seconds (video part)
export const TITLE_STYLES: [TitleStyle, string][] = [["kinetic", "حركي كبير"], ["editorial", "مجلّة"], ["pill", "شارة ملوّنة"], ["lower", "شريط سفلي"], ["marker", "قلم تظليل"], ["typewriter", "آلة كاتبة"]];
export type Zoom = { at: number; dur: number; scale: number };    // output seconds (video part)
export type CaptionStyle = "karaoke" | "box" | "minimal" | "pop" | "highlight" | "neon" | "outline";
export const CAPTION_STYLES: [CaptionStyle, string][] = [["karaoke", "كلمة كلمة ملوّنة"], ["pop", "كلمتين كبار تنط"], ["highlight", "الكلمة بخلفية ملوّنة"], ["box", "داخل صندوق"], ["neon", "نيون مضيء"], ["outline", "إطار عريض"], ["minimal", "بسيطة"]];
export type CaptionPos = "bottom" | "middle" | "top";
export type Transition = "none" | "flash" | "zoom" | "whip" | "blur" | "slide" | "spin" | "glitch" | "shake" | "dip";
export const TRANSITIONS: [Transition, string][] = [["none", "بدون"], ["whip", "سحبة سريعة"], ["slide", "انزلاق"], ["zoom", "زووم سريع"], ["spin", "دوران"], ["glitch", "تشويش رقمي"], ["shake", "هزّة"], ["blur", "تمويه ناعم"], ["flash", "وميض أبيض"], ["dip", "تعتيم أسود"]];
export type Corner = "tl" | "tr" | "bl" | "br";
export type Emoji = { e: string; at: number; dur: number }; // output seconds (video part)

export type MontageSpec = {
  src: string;          // signed URL (refreshed on every load / render)
  srcPath: string;      // storage path in "uploads"
  srcW: number;
  srcH: number;
  aspect: Aspect;
  font: string;
  colors: { text: string; accent: string; bg: string };
  captions: { on: boolean; style: CaptionStyle; pos?: CaptionPos; x?: number | null; y?: number | null }; // x/y: free placement (centre, 0..1) dragged in the studio
  segments: Seg[];
  words: Word[];
  titles: Title[];
  zooms: Zoom[];
  intro: { on: boolean; title: string; subtitle: string };
  outro: { on: boolean; title: string; subtitle: string };
  music?: { url: string; name: string; path?: string } | null;
  // Pro touches (optional so older drafts keep working)
  transition?: Transition;                                       // at every cut / clip change
  logo?: { path: string; url: string; on: boolean; pos: Corner; box?: { x: number; y: number; w: number } | null } | null;
  emojis?: Emoji[];
  sfx?: boolean;                                                  // whoosh on titles/cuts, pop on emojis
  progress?: boolean;                                             // thin progress bar on top
  broll?: BRoll[];                                                // extra shots shown over the speech
  subs2?: { lang: string; on: boolean; lines: { s: number; e: number; t: string }[] } | null; // second-language subtitles
  face?: { t: number; x: number; y: number }[];                  // face track (source seconds, 0..1) for auto-reframe
  track?: boolean;                                                // follow the face when cropping
  grade?: Grade;                                                  // colour look
  autoBright?: number;                                            // brightness fix measured on the footage (1 = none)
  videoVolume?: number;                                           // original sound level 0..1
  vo?: { path: string; url: string; on: boolean; words: Word[]; text?: string; voice?: string } | null; // voice-over (words in output seconds of the video part)
  drift?: boolean;                                                // slow cinematic push-in on every shot
  vignette?: boolean;                                             // soft dark edges
  layout?: Layout;                                                // full screen, or graphics panel + speaker (split)
  panel?: "light" | "dark";                                       // look of the graphics panel in split layout
  board?: BoardStyle;                                             // background pattern of the panel
  graphics?: Graphic[];                                           // animated scenes synced to the speech
  quality?: "1080" | "4k";                                         // export size
  domain?: string;                                                // field from the playbook (education, restaurant…)
  illus?: string;                                                 // default illustration style for AI-drawn scenes
  borrowed?: string[];                                            // scenes the AI borrowed from other fields' packs (for the library report)
};

/** Split = animated graphics on top (or the side) and the speaker below — the "explainer reel" look. */
export type Layout = "full" | "split" | "circle" | "corner" | "card" | "dynamic" | "board"; // board = no footage (animated lesson)
export const LAYOUTS: [Layout, string][] = [["full", "ملء الشاشة"], ["split", "مقسومة: رسوم فوق وأنت تحت"], ["dynamic", "ذكي: تصغر لدائرة لما يطلع مشهد"], ["circle", "أنت داخل دائرة"], ["corner", "أنت بمربع صغير بالزاوية"], ["card", "أنت ببطاقة بحواف ناعمة"]];
export type GraphicKind = "headline" | "timer" | "counter" | "steps" | "compare" | "icon" | "flow" | "checklist" | "bars" | "donut" | "line" | "quote" | "arrow"
  | "definition" | "quiz" | "truefalse" | "timeline" | "cycle" | "mindmap" | "proscons" | "equation" | "fraction" | "vocab" | "pyramid" | "table" | "fillblank"
  | "scene" | "cube" | "globe" | "text3d" | "plot" | "geometry" | "burst" | "confetti" | "dotgrid" | "sketchbars"
  | "price" | "offer" | "menu" | "rating" | "testimonial" | "contact" | "specs" | "appointment" | "beforeafter" | "countdown" | "delivery" | "hours"
  | "dish" | "shine" | "mist" | "ecg" | "flight" | "scales" | "shutter" | "giftbox" | "house" | "ring";
export type Graphic = {
  kind: GraphicKind;
  at: number; dur: number;                 // output seconds (video part)
  text?: string;                           // main line / label
  hl?: string;                             // word(s) of text in the accent colour
  sub?: string;                            // small badge under the text
  value?: number;                          // timer seconds / counter target
  suffix?: string;                         // counter suffix (٪, ألف, +…)
  icon?: IconName;                         // icon / emoji graphic
  emoji?: string;
  items?: { label: string; icon?: IconName; value?: number }[]; // steps, flow, checklist, bars
  values?: number[];                       // line chart
  fx?: "marker" | "circle" | "underline" | "typewriter"; // headline effect on the hl word
  prompt?: string;                         // scene: what to draw (English)
  img?: string;                            // scene: storage path in "results"
  url?: string;                            // scene: signed URL (filled on load / render)
  style?: string;                          // scene: illustration style
  shape?: "triangle" | "square" | "circle" | "hexagon"; // geometry
  bad?: string; good?: string;             // compare
};
export const GRAPHIC_KINDS: [GraphicKind, string][] = [
  ["headline", "عنوان متحرك كبير"], ["timer", "ساعة / مؤقّت"], ["counter", "رقم يعدّ"], ["steps", "خطوات مرقّمة"],
  ["compare", "خطأ ✗ / صح ✓"], ["icon", "أيقونة مع جملة"], ["flow", "سلسلة أيقونات بأسهم"], ["checklist", "قائمة صح"],
  ["bars", "رسم بياني أعمدة"], ["donut", "دائرة نسبة"], ["line", "خط صاعد"], ["quote", "اقتباس"], ["arrow", "سهم يأشّر"],
  ["definition", "تعريف مصطلح"], ["quiz", "سؤال اختيارات"], ["truefalse", "صح أو خطأ"], ["timeline", "خط زمني"], ["cycle", "دورة متكررة"],
  ["mindmap", "خريطة ذهنية"], ["proscons", "مزايا وعيوب"], ["equation", "معادلة / حساب"], ["fraction", "كسر بالدائرة"], ["vocab", "كلمة ومعناها"],
  ["pyramid", "هرم"], ["table", "جدول"], ["fillblank", "املأ الفراغ"],
  ["scene", "مشهد مرسوم بالذكاء الاصطناعي"], ["cube", "مكعب ثلاثي الأبعاد"], ["globe", "كرة أرضية تدور"], ["text3d", "نص ثلاثي الأبعاد"],
  ["plot", "رسم دالة رياضية"], ["geometry", "شكل هندسي"], ["burst", "ختم وانفجار «تم»"], ["confetti", "احتفال كونفيتي"], ["dotgrid", "شبكة نقاط متحركة"], ["sketchbars", "رسم بياني مرسوم باليد"],
  ["price", "سعر قبل وبعد"], ["offer", "شارة خصم"], ["menu", "منيو بالأسعار"], ["rating", "تقييم بالنجوم"], ["testimonial", "رأي عميل"], ["contact", "بطاقة تواصل"],
  ["specs", "مواصفات بأيقونات"], ["appointment", "حجز موعد"], ["beforeafter", "قبل وبعد"], ["countdown", "العرض ينتهي بعد"], ["delivery", "توصيل"], ["hours", "ساعات العمل"],
  ["dish", "طبق ساخن بالبخار"], ["shine", "لمعة وبريق"], ["mist", "عطر ورذاذ"], ["ecg", "نبض القلب"], ["flight", "رحلة طيران"], ["scales", "ميزان العدالة"],
  ["shutter", "فلاش الكاميرا"], ["giftbox", "هدية تنفتح"], ["house", "بيت ينرسم ومفتاح"], ["ring", "حلقة تقدّم"],
];
/** Board backgrounds — each lesson can look different. */
export type BoardStyle = "soft" | "paper" | "grid" | "dots" | "notebook" | "chalk" | "blueprint" | "night" | "pastel" | "sunrise" | "sketch";
export const BOARD_STYLES: [BoardStyle, string][] = [["soft", "ناعم"], ["paper", "ورق"], ["grid", "مربعات"], ["dots", "نقاط"], ["notebook", "دفتر مسطّر"], ["chalk", "سبورة طباشير"], ["blueprint", "مخطط أزرق"], ["night", "ليلي"], ["pastel", "باستيل للأطفال"], ["sunrise", "شروق دافئ"], ["sketch", "مرسوم باليد"]];
export const DARK_BOARDS: BoardStyle[] = ["chalk", "blueprint", "night"];
export { ICONS };

/** Clean up graphics coming from the AI or the editor. */
export function cleanGraphics(arr: unknown, len: number): Graphic[] {
  const kinds = GRAPHIC_KINDS.map((k) => k[0]);
  const icon = (v: unknown) => (ICONS as readonly string[]).includes(String(v)) ? (v as IconName) : undefined;
  const str = (v: unknown, n: number) => (v === undefined || v === null || v === "" ? undefined : String(v).slice(0, n));
  const c = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  return (Array.isArray(arr) ? arr : []).slice(0, 24).map((x: Record<string, unknown>) => {
    const kind = kinds.includes(x?.kind as GraphicKind) ? (x.kind as GraphicKind) : "headline";
    const items = Array.isArray(x?.items) ? (x.items as unknown[]).slice(0, kind === "flow" ? 3 : kind === "mindmap" || kind === "table" || kind === "proscons" || kind === "menu" || kind === "specs" || kind === "hours" ? 6 : kind === "bars" || kind === "timeline" || kind === "cycle" || kind === "pyramid" ? 5 : 4).map((i) => typeof i === "string" ? { label: i.slice(0, 40) } : { label: String((i as { label?: unknown })?.label ?? "").slice(0, 40), icon: icon((i as { icon?: unknown })?.icon), value: Number.isFinite(Number((i as { value?: unknown })?.value)) ? Number((i as { value?: unknown }).value) : undefined }).filter((i) => i.label || i.icon).map((i) => { if (i.icon === undefined) delete i.icon; if (i.value === undefined) delete i.value; return i; }) : undefined;
    const g: Graphic = {
      kind, at: +c(Number(x?.at) || 0, 0, Math.max(0, len - 0.5)).toFixed(2), dur: +c(Number(x?.dur) || 2.5, 1, 8).toFixed(2),
      text: str(x?.text, 70), hl: str(x?.hl, 30), sub: str(x?.sub, 40),
      value: Number.isFinite(Number(x?.value)) && x?.value !== undefined && x?.value !== null && x?.value !== "" ? c(Number(x.value), 0, 1e9) : undefined,
      suffix: str(x?.suffix, 12), icon: icon(x?.icon), emoji: str(x?.emoji, 4), items,
      bad: str(x?.bad, 50), good: str(x?.good, 50),
      values: Array.isArray(x?.values) ? (x.values as unknown[]).slice(0, 12).map(Number).filter(Number.isFinite) : undefined,
      fx: (["marker", "circle", "underline", "typewriter"] as const).find((f) => f === x?.fx),
      prompt: str(x?.prompt, 400), img: typeof x?.img === "string" && /^[\w-]+\/[\w./-]+$/.test(x.img as string) ? (x.img as string) : undefined,
      url: typeof x?.url === "string" ? (x.url as string) : undefined, style: str(x?.style, 20),
      shape: (["triangle", "square", "circle", "hexagon"] as const).find((v) => v === x?.shape),
    };
    for (const k of Object.keys(g) as (keyof Graphic)[]) if (g[k] === undefined) delete g[k];
    return g;
  }).filter((g) => g.kind === "scene" ? !!(g.img || g.prompt) : ["confetti", "dotgrid", "globe", "cube", "plot", "geometry", "countdown", "delivery", "dish", "shine", "mist", "ecg", "flight", "scales", "shutter", "giftbox", "house", "ring"].includes(g.kind) || g.text || g.items?.length || g.values?.length || g.bad || g.good || g.icon || g.emoji || g.value !== undefined).sort((a, b) => a.at - b.at);
}
export type Grade = "none" | "natural" | "vivid" | "warm" | "cinematic" | "pop" | "reels" | "luxury" | "cool" | "sunset" | "bw";
export const GRADES: [Grade, string][] = [["none", "بدون"], ["natural", "طبيعي"], ["vivid", "زاهي"], ["pop", "زاهي جداً"], ["reels", "ريلز قوي"], ["warm", "دافئ"], ["sunset", "غروب ذهبي"], ["cool", "بارد أزرق"], ["luxury", "فخم هادي"], ["cinematic", "سينمائي"], ["bw", "أبيض وأسود"]];

/** CSS filter for a look (+ the measured brightness fix). */
export function gradeFilter(m: MontageSpec) {
  const b = m.autoBright ?? 1;
  switch (m.grade ?? "none") {
    case "natural": return `brightness(${b * 1.02}) contrast(1.06) saturate(1.12)`;
    case "vivid": return `brightness(${b * 1.03}) contrast(1.1) saturate(1.35)`;
    case "warm": return `brightness(${b * 1.03}) contrast(1.05) saturate(1.15) sepia(0.14) hue-rotate(-6deg)`;
    case "cinematic": return `brightness(${b * 0.98}) contrast(1.16) saturate(0.88)`;
    case "pop": return `brightness(${b * 1.05}) contrast(1.14) saturate(1.6)`;
    case "reels": return `brightness(${b * 1.04}) contrast(1.22) saturate(1.28)`;
    case "luxury": return `brightness(${b * 0.97}) contrast(1.1) saturate(0.78) sepia(0.12)`;
    case "cool": return `brightness(${b * 1.02}) contrast(1.08) saturate(1.1) hue-rotate(8deg)`;
    case "sunset": return `brightness(${b * 1.04}) contrast(1.06) saturate(1.25) sepia(0.22) hue-rotate(-12deg)`;
    case "bw": return `brightness(${b * 1.03}) contrast(1.2) grayscale(1)`;
    default: return b !== 1 ? `brightness(${b})` : "none";
  }
}

/** Smoothed face centre at a source time (falls back to the middle). */
export function faceAt(m: MontageSpec, t: number) {
  const f = m.face ?? [];
  if (!m.track || !f.length) return { x: 0.5, y: 0.4 };
  const near = f.filter((p) => Math.abs(p.t - t) <= 1.2);
  if (!near.length) {
    const prev = [...f].reverse().find((p) => p.t <= t) ?? f[0];
    return { x: prev.x, y: prev.y };
  }
  let wx = 0, wy = 0, w = 0;
  for (const p of near) { const k = 1.3 - Math.abs(p.t - t); wx += p.x * k; wy += p.y * k; w += k; }
  return { x: wx / w, y: wy / w };
}
export type BRoll = { path: string; url: string; at: number; dur: number }; // image, output seconds (video part)
export const SUB_LANGS = [{ id: "en", label: "English" }, { id: "fr", label: "Français" }, { id: "ur", label: "اردو" }, { id: "hi", label: "हिन्दी" }, { id: "tl", label: "Filipino" }];

export const EMOJIS = ["🔥", "💡", "✅", "❤️", "👏", "😍", "🤲", "⭐", "💰", "🎯", "⚡", "👇", "📌", "🙏", "😂", "😮"];

/** Output times (video part) where one kept segment ends and the next begins. */
export function cutTimes(m: MontageSpec) {
  const out: number[] = []; let off = 0;
  m.segments.forEach((g, i) => { if (i > 0) out.push(off); off += g.e - g.s; });
  return out;
}

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
  const placed: { t: string; s: number; e: number }[] = m.vo?.on ? [...m.vo.words] : [];
  let off = 0;
  if (!m.vo?.on) for (const g of m.segments) {
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
  (m.graphics ?? []).forEach((g, i) => {
    const n = `مشهد متحرك ${i + 1}`;
    if (g.text !== undefined) out.push({ key: `graphics.${i}.text`, label: n, value: g.text });
    if (g.bad !== undefined) out.push({ key: `graphics.${i}.bad`, label: `${n}: الغلط`, value: g.bad });
    if (g.good !== undefined) out.push({ key: `graphics.${i}.good`, label: `${n}: الصح`, value: g.good });
    g.items?.forEach((it, j) => out.push({ key: `graphics.${i}.items.${j}`, label: `${n}: ${j + 1}`, value: it.label }));
  });
  if (m.outro.on) { out.push({ key: "outro.title", label: "عنوان النهاية", value: m.outro.title }); out.push({ key: "outro.subtitle", label: "تواصل / حساب", value: m.outro.subtitle }); }
  return out;
}

export function setMontageText(m: MontageSpec, key: string, value: string): MontageSpec {
  if (key.startsWith("graphics.")) {
    const [, a, field, b] = key.split(".");
    const i = Number(a);
    return { ...m, graphics: (m.graphics ?? []).map((g, j) => (j !== i ? g : field === "items" ? { ...g, items: (g.items ?? []).map((it, k) => (k === Number(b) ? { ...it, label: value } : it)) } : { ...g, [field]: value })) };
  }
  if (key.startsWith("titles.")) { const i = Number(key.split(".")[1]); return { ...m, titles: m.titles.map((t, j) => (j === i ? { ...t, text: value } : t)) }; }
  const [part, field] = key.split(".") as ["intro" | "outro", "title" | "subtitle"];
  return { ...m, [part]: { ...m[part], [field]: value } };
}
