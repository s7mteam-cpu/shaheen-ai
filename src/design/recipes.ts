// 200 real post / carousel designs: where the picture sits, where the text sits and how it is set. Colours, font and decoration come from the style.
// Generated from structural dimensions (not colours), so two designs differ in layout, not only in skin.
export type RPhoto = "none" | "top" | "bot" | "left" | "right" | "full" | "circle" | "arch" | "card" | "strip" | "band" | "inset" | "corner" | "tilt" | "diag" | "hero" | "frame" | "split" | "pill" | "wave";
export type RTitle = "plain" | "huge" | "boxed" | "under" | "bar" | "stack" | "mark" | "quote" | "idx";
export type RItems = "list" | "grid" | "chips" | "num" | "steps" | "cards" | "check";
/** designs with the picture on one side and the text beside it */
export const isSide = (ph: RPhoto) => ph === "left" || ph === "right" || ph === "strip" || ph === "split" || ph === "pill";
export type Recipe = {
  id: string; name: string;
  ph: RPhoto; al: "s" | "c" | "e"; po: "t" | "m" | "b";
  tt: RTitle; it: RItems; pn: "none" | "card" | "bar" | "glass" | "brutal"; ct: "pill" | "bar" | "arrow";
  dv: "none" | "corner" | "ring" | "dots" | "line"; ts: number;
  /** quiet designs (no picture area): fit the middle and last slides of a carousel */
  calm: boolean;
};

const PH: RPhoto[] = ["none", "top", "bot", "left", "right", "full", "circle", "arch", "card", "strip", "band"];
const PH2: RPhoto[] = [...PH, "inset", "corner", "tilt", "diag", "hero", "frame", "split", "pill", "wave"];
const PHN: Record<RPhoto, string> = { none: "نص خالص", top: "صورة علوية", bot: "صورة سفلية", left: "نصف يسار", right: "نصف يمين", full: "صورة كاملة", circle: "دائرة", arch: "قوس", card: "بطاقة صورة", strip: "شريط جانبي", band: "حزام وسط", inset: "صورة مدوّرة بالوسط", corner: "صورة بالزاوية", tilt: "صورة مائلة", diag: "قص مائل", hero: "صورة وبطاقة فوقها", frame: "صورة كاملة وبطاقة", split: "نصف مائل", pill: "كبسولة جانبية", wave: "موجة" };
const TT: RTitle[] = ["plain", "huge", "boxed", "under", "bar", "stack"];
const TT2: RTitle[] = [...TT, "mark", "quote", "idx"];
const TTNEW: RTitle[] = ["mark", "quote", "idx"];
const TTN: Record<RTitle, string> = { plain: "عنوان هادئ", huge: "عنوان ضخم", boxed: "عنوان بصندوق", under: "عنوان بخط", bar: "عنوان بعمود", stack: "عنوان مرتّب", mark: "عنوان بلوحة", quote: "عنوان باقتباس", idx: "رقم كبير" };
const IT: RItems[] = ["list", "grid", "chips", "num"];
const IT2: RItems[] = [...IT, "steps", "cards", "check"];
const AL = ["s", "c", "e"] as const;
const PO = ["t", "m", "b"] as const;
const PN = ["none", "card", "bar", "brutal"] as const;
const CT = ["pill", "bar", "arrow"] as const;
const DV = ["none", "corner", "ring", "dots", "line"] as const;
const TS = [1, 1.12, 0.92, 1.25, 1];

export const RECIPES: Record<string, Recipe> = {};
export const RECIPE_IDS: string[] = [];
for (let i = 0; i < 100; i++) {
  const ph = PH[i % 11];
  const tt = TT[(i * 5 + Math.floor(i / 11)) % 6];
  const side = ph === "left" || ph === "right" || ph === "strip";
  const al = side ? (ph === "left" ? "s" : "e") : AL[(i * 7 + Math.floor(i / 3)) % 3];
  const po = ph === "full" ? (["b", "m", "t"] as const)[i % 3] : PO[(i * 2 + Math.floor(i / 5)) % 3];
  const id = `d${String(i + 1).padStart(3, "0")}`;
  RECIPES[id] = {
    id, name: `${PHN[ph]} · ${TTN[tt]}`, ph, al: al as "s" | "c" | "e", po, tt,
    it: side || ph === "circle" ? (["list", "num", "chips"] as const)[(i * 3 + 1) % 3] : IT[(i * 3 + 1) % 4], pn: ph === "full" ? (i % 2 ? "glass" : "none") : side ? (i % 3 === 0 ? "brutal" : "none") : PN[(i * 2 + Math.floor(i / 4)) % 4], ct: CT[(i * 5 + 2) % 3],
    dv: DV[(i + Math.floor(i / 7)) % 5], ts: TS[(i + Math.floor(i / 11)) % 5], calm: ph === "none" || ph === "band" || side,
  };
  RECIPE_IDS.push(id);
}
// 100 more: new picture shapes (inset, corner, tilt, diagonal, hero, frame, split, pill, wave), new title treatments and new list styles
for (let i = 0; i < 100; i++) {
  const ph = PH2[(i * 7) % 20];
  const side = isSide(ph);
  const textOnly = ph === "none" || ph === "band";
  let tt = textOnly ? (["idx", "quote", "mark", "huge", "idx", "stack"] as RTitle[])[i % 6] : TT2[(i * 4 + Math.floor(i / 9)) % 9];
  const it: RItems = textOnly ? (["steps", "cards", "check", "num", "list", "steps"] as RItems[])[(i * 5 + 1) % 6] : side ? (["steps", "check", "cards", "list", "num"] as RItems[])[(i * 3 + 1) % 5] : IT2[(i * 3 + Math.floor(i / 7)) % 7];
  if (PH.includes(ph) && TT.includes(tt) && IT.includes(it)) { tt = TTNEW[i % 3]; }
  const al = ph === "left" || ph === "split" ? "s" : ph === "right" || ph === "pill" ? "e" : ph === "strip" ? "s" : AL[(i * 5 + Math.floor(i / 4)) % 3];
  const id = `d${String(i + 101).padStart(3, "0")}`;
  RECIPES[id] = {
    id, name: `${PHN[ph]} · ${TTN[tt]}`, ph, al: al as "s" | "c" | "e", po: ph === "full" ? (["b", "m", "t"] as const)[i % 3] : PO[(i * 2 + Math.floor(i / 5)) % 3], tt, it,
    pn: ph === "full" ? (i % 2 ? "glass" : "none") : ph === "hero" || ph === "frame" ? "card" : side ? (i % 3 === 0 ? "brutal" : "none") : PN[(i * 3 + Math.floor(i / 4)) % 4], ct: CT[(i * 4 + 1) % 3],
    dv: DV[(i * 3 + Math.floor(i / 6)) % 5], ts: TS[(i + Math.floor(i / 9)) % 5], calm: textOnly || side || ph === "inset",
  };
  RECIPE_IDS.push(id);
}
export const isRecipe = (id: unknown): id is string => typeof id === "string" && id in RECIPES;

/** minimal slide shape the estimator needs (kept apart from spec.ts so there is no import cycle) */
type EstSlide = { title: string; highlight?: string; kicker?: string; body?: string; items?: unknown[]; meta?: unknown[]; price?: unknown; date?: unknown; stat?: unknown; person?: unknown; cta?: string; badge?: string };
const plain = (t: string) => t.replace(/\{\{#[0-9a-fA-F]{6}\|([^{}]*)\}\}/g, "$1");

export const RCP_PAD = 80;
/** where each picture / text area sits, as fractions of the frame (the renderer uses the text part's width and height) */
export function rcpRegion(ph: RPhoto, W: number, H: number): { w: number; h: number } {
  switch (ph) {
    case "top": return { w: W, h: H * 0.58 };
    case "bot": return { w: W, h: H * 0.58 };
    case "left": case "right": return { w: W * 0.58, h: H };
    case "split": return { w: W * 0.54, h: H };
    case "pill": return { w: W * 0.62, h: H };
    case "inset": return { w: W, h: H * 0.7 };
    case "corner": return { w: W, h: H * 0.68 };
    case "tilt": return { w: W, h: H * 0.54 };
    case "diag": return { w: W, h: H * 0.6 };
    case "wave": return { w: W, h: H * 0.58 };
    case "hero": return { w: W * 0.9, h: H * 0.5 };
    case "frame": return { w: W * 0.9, h: H * 0.44 };
    case "strip": return { w: W * 0.78, h: H };
    case "circle": { const d = Math.min(W * 0.5, H * 0.36); return { w: W, h: H - (H * 0.08 + d) }; }
    case "arch": return { w: W, h: H - (H * 0.07 + H * 0.38) };
    case "card": return { w: W, h: H - (H * 0.065 + H * 0.34) };
    case "band": return { w: W, h: H };
    default: return { w: W, h: H };
  }
}
/** rough height the text needs (design pixels): used to shrink a little instead of overflowing, and to skip a design that cannot hold the text */
export function rcpNeed(s: EstSlide, r: Recipe, w: number, k: number, hasBrand: boolean): number {
  const lines = (txt: string, size: number, width: number) => Math.max(1, Math.ceil((plain(txt).length * size * 0.5) / width));
  const inner = w - RCP_PAD * 2 * k;
  let h = 0;
  const all = `${s.title} ${s.highlight ?? ""}`.trim();
  const tsz = (r.tt === "huge" ? 142 : 104) * k * r.ts * (isSide(r.ph) ? 0.78 : 1) * Math.max(0.5, Math.min(1, Math.sqrt(16 / Math.max(1, plain(all).length))));
  h += lines(all, tsz, inner) * tsz * 1.16 + (r.tt === "boxed" ? 52 * k : r.tt === "under" ? 30 * k : r.tt === "mark" ? 70 * k : r.tt === "quote" ? 130 * k : r.tt === "idx" ? 190 * k : 0);
  if (s.kicker) h += 62 * k;
  if (s.body) h += lines(s.body, 34 * k, inner) * 34 * k * 1.6 + 26 * k;
  const n = Math.min((s.items ?? []).length, r.it === "chips" ? 6 : 4);
  if (n) h += (r.it === "grid" ? Math.ceil(n / 2) * 168 * k : r.it === "chips" ? Math.ceil(n / 2) * 78 * k : n * (r.it === "num" ? 96 : r.it === "steps" ? 112 : r.it === "cards" ? 126 : r.it === "check" ? 76 : 80) * k) + 26 * k;
  if (s.meta?.length) h += Math.ceil(s.meta.length / 2) * 54 * k + 26 * k;
  if (s.price) h += 120 * k;
  if (s.date) h += 190 * k;
  if (s.stat) h += 130 * k;
  if (s.person) h += 110 * k;
  if (s.cta && r.ct !== "bar") h += 110 * k;
  if (hasBrand) h += 84 * k;
  return (h + (s.badge ? 60 * k : 0) + 26 * k * 3) * (isSide(r.ph) ? 1.18 : 1);
}
/** true when the design can show this slide's text without crowding (otherwise the style falls back to a roomier design) */
export function rcpHolds(s: EstSlide, r: Recipe, W: number, H: number, k: number, hasBrand: boolean): boolean {
  const reg = rcpRegion(r.ph, W, H);
  return rcpNeed(s, r, reg.w, k, hasBrand) <= (reg.h - RCP_PAD * k * 1.3) / 0.78;
}

const PHD: Record<RPhoto, string> = { none: "بدون منطقة صورة، النص يملأ التصميم", top: "صورة بالثلث العلوي والنص تحتها", bot: "النص فوق والصورة بالثلث السفلي", left: "صورة بنصف التصميم يسار والنص يمين", right: "صورة بنصف التصميم يمين والنص يسار", full: "صورة تملأ التصميم والنص فوقها", circle: "صورة دائرية بالأعلى والنص تحتها", arch: "صورة بشكل قوس بالأعلى والنص تحتها", card: "صورة ببطاقة مدوّرة بالأعلى والنص تحتها", strip: "شريط صورة رفيع جانبي والنص بالباقي", band: "العنوان بالأعلى وحزام صورة بالوسط والتفاصيل تحت", inset: "العنوان بالأعلى وصورة مدوّرة بالوسط والتفاصيل تحت", corner: "صورة بزاوية علوية والنص بجانبها وتحتها", tilt: "صورة مائلة قليلاً بالأعلى والنص تحتها", diag: "صورة بقص مائل بالأعلى والنص تحتها", hero: "صورة بالأعلى وبطاقة نص تطلع فوق طرفها", frame: "صورة تملأ التصميم وبطاقة نص بالأسفل", split: "نصف صورة بحافة مائلة والنص بالباقي", pill: "كبسولة صورة طويلة جانبية والنص بجانبها", wave: "صورة بالأعلى بحافة موجة والنص تحتها" };
const TTD: Record<RTitle, string> = { plain: "هادئ", huge: "ضخم", boxed: "داخل صندوق ملوّن", under: "بخط تحته", bar: "بعمود ملوّن جانبي", stack: "السطر المميّز ضخم ملوّن", mark: "داخل لوحة بحد ملوّن", quote: "بعلامة اقتباس كبيرة", idx: "برقم الشريحة الكبير (للكاروسيل)" };
const ITD: Record<RItems, string> = { list: "قائمة بأيقونات", grid: "مربعات", chips: "حبّات (chips)", num: "قائمة مرقّمة", steps: "خطوات بخط يربطها", cards: "بطاقات عريضة", check: "علامات صح كبيرة" };
const ALD = { s: "يمين", c: "وسط", e: "يسار" } as const;
const PND = { none: "", card: "، النص ببطاقة", bar: "، العنوان الصغير بشريط", glass: "، النص بزجاج شفاف", brutal: "، النص ببطاقة بإطار سميك وظل صلب (نيو-بروتاليزم)" } as const;
/** the 200 designs as text for the designer AI: grouped by where the picture sits */
export function designCatalog(): string {
  return PH2.map((ph) => `# ${PHD[ph]}:\n` + RECIPE_IDS.filter((x) => RECIPES[x].ph === ph).map((x) => { const r = RECIPES[x]; return `${x} (محاذاة ${ALD[r.al]}، عنوان ${TTD[r.tt]}، ${ITD[r.it]}${PND[r.pn]})`; }).join("، ")).join("\n");
}
