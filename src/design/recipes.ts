// 100 real post / carousel designs: where the picture sits, where the text sits and how it is set. Colours, font and decoration come from the style.
// Generated from structural dimensions (not colours), so two designs differ in layout, not only in skin.
export type RPhoto = "none" | "top" | "bot" | "left" | "right" | "full" | "circle" | "arch" | "card" | "strip" | "band";
export type RTitle = "plain" | "huge" | "boxed" | "under" | "bar" | "stack";
export type RItems = "list" | "grid" | "chips" | "num";
export type Recipe = {
  id: string; name: string;
  ph: RPhoto; al: "s" | "c" | "e"; po: "t" | "m" | "b";
  tt: RTitle; it: RItems; pn: "none" | "card" | "bar" | "glass" | "brutal"; ct: "pill" | "bar" | "arrow";
  dv: "none" | "corner" | "ring" | "dots" | "line"; ts: number;
  /** quiet designs (no picture area): fit the middle and last slides of a carousel */
  calm: boolean;
};

const PH: RPhoto[] = ["none", "top", "bot", "left", "right", "full", "circle", "arch", "card", "strip", "band"];
const PHN: Record<RPhoto, string> = { none: "نص خالص", top: "صورة علوية", bot: "صورة سفلية", left: "نصف يسار", right: "نصف يمين", full: "صورة كاملة", circle: "دائرة", arch: "قوس", card: "بطاقة صورة", strip: "شريط جانبي", band: "حزام وسط" };
const TT: RTitle[] = ["plain", "huge", "boxed", "under", "bar", "stack"];
const TTN: Record<RTitle, string> = { plain: "عنوان هادئ", huge: "عنوان ضخم", boxed: "عنوان بصندوق", under: "عنوان بخط", bar: "عنوان بعمود", stack: "عنوان مرتّب" };
const IT: RItems[] = ["list", "grid", "chips", "num"];
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
  const tsz = (r.tt === "huge" ? 142 : 104) * k * r.ts * Math.max(0.5, Math.min(1, Math.sqrt(16 / Math.max(1, plain(all).length))));
  h += lines(all, tsz, inner) * tsz * 1.16 + (r.tt === "boxed" ? 52 * k : r.tt === "under" ? 30 * k : 0);
  if (s.kicker) h += 62 * k;
  if (s.body) h += lines(s.body, 34 * k, inner) * 34 * k * 1.6 + 26 * k;
  const n = Math.min((s.items ?? []).length, r.it === "chips" ? 6 : 4);
  if (n) h += (r.it === "grid" ? Math.ceil(n / 2) * 168 * k : r.it === "chips" ? Math.ceil(n / 2) * 78 * k : n * (r.it === "num" ? 96 : 80) * k) + 26 * k;
  if (s.meta?.length) h += Math.ceil(s.meta.length / 2) * 54 * k + 26 * k;
  if (s.price) h += 120 * k;
  if (s.date) h += 190 * k;
  if (s.stat) h += 130 * k;
  if (s.person) h += 110 * k;
  if (s.cta && r.ct !== "bar") h += 110 * k;
  if (hasBrand) h += 84 * k;
  return (h + (s.badge ? 60 * k : 0) + 26 * k * 3) * (r.ph === "left" || r.ph === "right" || r.ph === "strip" ? 1.18 : 1);
}
/** true when the design can show this slide's text without crowding (otherwise the style falls back to a roomier design) */
export function rcpHolds(s: EstSlide, r: Recipe, W: number, H: number, k: number, hasBrand: boolean): boolean {
  const reg = rcpRegion(r.ph, W, H);
  return rcpNeed(s, r, reg.w, k, hasBrand) <= (reg.h - RCP_PAD * k * 1.3) / 0.78;
}

const PHD: Record<RPhoto, string> = { none: "بدون منطقة صورة، النص يملأ التصميم", top: "صورة بالثلث العلوي والنص تحتها", bot: "النص فوق والصورة بالثلث السفلي", left: "صورة بنصف التصميم يسار والنص يمين", right: "صورة بنصف التصميم يمين والنص يسار", full: "صورة تملأ التصميم والنص فوقها", circle: "صورة دائرية بالأعلى والنص تحتها", arch: "صورة بشكل قوس بالأعلى والنص تحتها", card: "صورة ببطاقة مدوّرة بالأعلى والنص تحتها", strip: "شريط صورة رفيع جانبي والنص بالباقي", band: "العنوان بالأعلى وحزام صورة بالوسط والتفاصيل تحت" };
const TTD: Record<RTitle, string> = { plain: "هادئ", huge: "ضخم", boxed: "داخل صندوق ملوّن", under: "بخط تحته", bar: "بعمود ملوّن جانبي", stack: "السطر المميّز ضخم ملوّن" };
const ITD: Record<RItems, string> = { list: "قائمة بأيقونات", grid: "مربعات", chips: "حبّات (chips)", num: "قائمة مرقّمة" };
const ALD = { s: "يمين", c: "وسط", e: "يسار" } as const;
const PND = { none: "", card: "، النص ببطاقة", bar: "، العنوان الصغير بشريط", glass: "، النص بزجاج شفاف", brutal: "، النص ببطاقة بإطار سميك وظل صلب (نيو-بروتاليزم)" } as const;
/** the 100 designs as text for the designer AI: grouped by where the picture sits */
export function designCatalog(): string {
  return PH.map((ph) => `# ${PHD[ph]}:\n` + RECIPE_IDS.filter((x) => RECIPES[x].ph === ph).map((x) => { const r = RECIPES[x]; return `${x} (محاذاة ${ALD[r.al]}، عنوان ${TTD[r.tt]}، ${ITD[r.it]}${PND[r.pn]})`; }).join("، ")).join("\n");
}
