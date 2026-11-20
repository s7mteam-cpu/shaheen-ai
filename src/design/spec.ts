// Design studio data model: posts, carousels and ads, rendered by React (live preview) and by the worker (PNG).
// Claude writes the content and picks a layout per slide; the customer edits everything live.
import { FONT_LIBRARY, LIB_FONT_IDS } from "../lib/fonts";

export type DAspect = "4:5" | "1:1" | "9:16" | "card" | "inv";
export type DKind = "post" | "carousel" | "ads" | "bcard" | "invite";
export type DImg = { path: string; bucket: "uploads" | "results"; url: string };
export type DItem = { icon?: string; text: string };
export type DColors = { bg: string; ink: string; accent: string; soft: string };

export type LayoutId = "classic" | "bold" | "bento" | "minimal" | "split" | "photo" | "offer" | "quote" | "cover" | "point" | "cta"
  | "cardA" | "cardB" | "cardC" | "cardD" | "cardE" | "cardF" | "cardG" | "cardH" | "cardBack" | "cardBackB"
  | "invA" | "invB" | "invC" | "invD" | "invE" | "invF" | "invG" | "invH" | "invBack";

export type Slide = {
  layout: LayoutId;
  kicker?: string;
  title: string;
  highlight?: string;
  body?: string;
  items?: DItem[];
  meta?: DItem[];
  date?: { day: string; month: string; weekday?: string } | null;
  price?: { value: string; old?: string; currency?: string; note?: string } | null;
  stat?: { value: string; label?: string } | null;
  badge?: string;
  cta?: string;
  person?: { name: string; role?: string; photo?: DImg | null } | null;
  sticker?: Sticker | null;
  photo?: DImg | null;
  /** AI-made background (carousel «خلفيات بالذكاء الاصطناعي»): full-bleed behind the slide, softened with the brand colour so text stays readable. */
  bg?: DImg | null;
  imagePrompt?: string;
  caption?: string;
  /** moved / resized elements by id (offsets in design pixels) and elements the customer removed from this slide */
  pos?: Record<string, { x: number; y: number; s?: number }>;
  hide?: string[];
  /** whole-element text colour chosen by the customer (element id → #hex) */
  col?: Record<string, string>;
  /** a highlighted box (certificate / guarantee line) with its own background and frame */
  note?: { text: string; at: "bl" | "br" | "bc"; look: "royal" | "soft" | "solid" } | null;
};

/** Per-word colour markup inside any text: {{#E8B44C|كلمة}} */
export const RICH_RE = /\{\{(#[0-9a-fA-F]{6})\|([^{}]*)\}\}/g;
export const stripRich = (t: string) => t.replace(RICH_RE, "$2");
export const NOTE_ATS = ["bl", "br", "bc"] as const;
export const NOTE_LOOKS = ["royal", "soft", "solid"] as const;
export const NOTE_LOOK_LABELS: Record<string, string> = { royal: "ملكي ذهبي", soft: "هادئ", solid: "ملوّن" };
export const NOTE_AT_LABELS: Record<string, string> = { bl: "أسفل اليسار", br: "أسفل اليمين", bc: "أسفل بالوسط" };

export type DesignSpec = {
  kind: DKind;
  aspect: DAspect;
  font: string;
  /** a decorative face for names / titles / the date (invitations); the body text keeps `font` */
  titleFont?: string;
  /** "foil" paints the accent colour as a metallic foil gradient (invitations and cards); "flat" is plain ink */
  finish?: "flat" | "foil";
  colors: DColors;
  brand: { name?: string; handle?: string; logo?: DImg | null; showLogo: boolean; box?: { x: number; y: number; w: number } | null };
  slides: Slide[];
  caption?: string;
  deco?: Deco;
  frame?: Frame;
  bigNum?: boolean;               // true = show the huge outlined slide number on "point" slides (hidden by default)
  industry?: string;
  icons?: "line" | "duo" | "emoji" | "3d";
  icon3d?: Record<string, DImg>;   // AI-made 3D icons by icon id (when icons = "3d")
};
export const DECO_IDS = ["none", "circles", "grid", "dots", "blob", "arc", "lines", "corner", "waves", "confetti", "sparkle", "leaves", "geo", "halftone"] as const;
export type Deco = (typeof DECO_IDS)[number];
export const DECO_LABELS: Record<Deco, string> = { none: "بدون", circles: "دوائر", grid: "شبكة", dots: "نقاط", blob: "شكل حر", arc: "قوس", lines: "خطوط", corner: "زاوية", waves: "أمواج", confetti: "احتفال", sparkle: "بريق", leaves: "أوراق", geo: "نقش إسلامي", halftone: "نقاط مطبعية" };
/** Border around the whole design. */
export const FRAME_IDS = ["none", "gold", "rounded", "corners", "dashed", "double"] as const;
export type Frame = (typeof FRAME_IDS)[number];
export const FRAME_LABELS: Record<Frame, string> = { none: "بدون", gold: "إطار ذهبي", rounded: "إطار ناعم", corners: "زوايا", dashed: "متقطع", double: "مزدوج" };
/** Small badge pinned on a slide corner (field-specific touches). */
export const STICKER_IDS = ["ribbon", "stamp", "burst", "stars", "tape", "tag"] as const;
export type StickerKind = (typeof STICKER_IDS)[number];
export const STICKER_LABELS: Record<StickerKind, string> = { ribbon: "شريط بالزاوية", stamp: "ختم دائري", burst: "نجمة عرض", stars: "نجوم تقييم", tape: "شريط لاصق", tag: "بطاقة سعر معلّقة" };
export type Sticker = { kind: StickerKind; text: string };

export const DSIZE: Record<DAspect, { width: number; height: number }> = {
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  inv: { width: 1080, height: 1512 }, // 5 x 7 in invitation
  card: { width: 1050, height: 600 }, // 3.5 x 2 in at 300 dpi (the common 90 x 50 mm card, print-ready)
};

export const DFONTS = [
  { id: "Cairo", label: "كايرو" },
  { id: "Tajawal", label: "تجوال" },
  { id: "Almarai", label: "المراعي" },
  { id: "Changa", label: "تشانغا" },
  { id: "Amiri", label: "أميري" },
] as const;
/** Calligraphic / decorative Arabic faces for invitations and cards (names, titles): ruqaa, ink pen, kufi, handwritten. */
export const DECOR_FONTS = [
  { id: "Aref Ruqaa", label: "رقعة" },
  { id: "Aref Ruqaa Ink", label: "رقعة بالحبر" },
  { id: "Katibeh", label: "كاتبة (خط يدوي)" },
  { id: "Reem Kufi", label: "ريم كوفي" },
  { id: "El Messiri", label: "المسيري" },
  { id: "Mirza", label: "ميرزا (مائل)" },
] as const;
export const ALL_FONT_IDS: string[] = Array.from(new Set([...DFONTS.map((f) => f.id), ...DECOR_FONTS.map((f) => f.id), ...LIB_FONT_IDS]));
/** Fonts the studio offers for a kind of design. */
/** every design kind offers the whole library (the studio's FontPicker groups it by style) */
export const fontsFor = (): readonly { id: string; label: string }[] => FONT_LIBRARY.map((f) => ({ id: f.id, label: f.label }));

/** Which fields each layout shows: the studio offers exactly these, and Claude is told the same. */
export const LAYOUTS: Record<LayoutId, { label: string; hint: string; uses: (keyof Slide)[] }> = {
  classic: { label: "كلاسيكي", hint: "إعلان كامل: عنوان، وصف، حتى 6 مزايا بأيقونات، تفاصيل، سعر وزر", uses: ["kicker", "title", "highlight", "body", "items", "meta", "price", "cta", "badge", "photo"] },
  bold: { label: "جريء", hint: "فعالية أو دورة: تاريخ بارز، عنوان كبير، قائمة مرقّمة، مقدّم، سعر وزر", uses: ["kicker", "title", "highlight", "date", "items", "meta", "person", "price", "cta"] },
  bento: { label: "بينتو", hint: "مربعات عصرية متفاوتة: عنوان، صورة أو ميزة بارزة، مزايا، سعر وزر. مناسب للمنتجات والخدمات والتقنية", uses: ["kicker", "title", "highlight", "body", "items", "meta", "photo", "price", "cta", "badge"] },
  minimal: { label: "طباعي بسيط", hint: "عنوان ضخم جداً بأسلوب مجلات، خطوط فاصلة، بدون زحمة. مناسب للإعلانات الفاخرة والعبارات القوية", uses: ["kicker", "badge", "title", "highlight", "body", "meta", "price", "cta"] },
  split: { label: "نص وصورة", hint: "الصورة بنص التصميم والنص بالنص الثاني، مع مزايا وتفاصيل (تاريخ، مكان) وسعر. مناسب للمنتجات والأزياء والعقار", uses: ["kicker", "title", "highlight", "body", "items", "meta", "photo", "price", "cta", "badge"] },
  photo: { label: "صورة كبيرة", hint: "منتج أو مكان أو طبق: صورة كبيرة فوق، نص وسعر تحت", uses: ["kicker", "title", "highlight", "body", "photo", "price", "cta", "badge"] },
  offer: { label: "عرض وخصم", hint: "رقم ضخم (خصم أو سعر)، عنوان، مدة العرض وزر", uses: ["badge", "stat", "title", "highlight", "body", "meta", "cta", "photo"] },
  quote: { label: "اقتباس ونصيحة", hint: "جملة أو نصيحة كبيرة مع صاحبها", uses: ["kicker", "body", "person"] },
  cover: { label: "غلاف", hint: "أول شريحة بالكاروسيل أو بوست بعنوان ضخم", uses: ["kicker", "title", "highlight", "body", "photo"] },
  point: { label: "نقطة", hint: "شريحة داخلية: رقم، أيقونة، عنوان، شرح قصير", uses: ["kicker", "title", "body", "items"] },
  cta: { label: "خاتمة", hint: "آخر شريحة: شعار، دعوة، زر، الحساب", uses: ["title", "body", "cta", "meta"] },
  cardA: { label: "شريط جانبي", hint: "بطاقة عمل: شريط لون جانبي، الشعار، الاسم والمسمى، وسائل التواصل بأيقونات", uses: ["kicker", "title", "highlight", "body", "meta"] },
  cardB: { label: "وسط فخم", hint: "بطاقة عمل: كل شي بالوسط، الشعار فوق، خط ذهبي، التفاصيل بصف تحت", uses: ["kicker", "title", "highlight", "body", "meta"] },
  cardC: { label: "نصفين", hint: "بطاقة عمل: نصف ملوّن فيه الشعار والنصف الثاني فيه الاسم والتفاصيل", uses: ["kicker", "title", "highlight", "body", "meta"] },
  cardD: { label: "عصري داكن", hint: "بطاقة عمل: خلفية داكنة، اسم كبير، تفاصيل بعمودين", uses: ["kicker", "title", "highlight", "body", "meta"] },
  cardE: { label: "طباعي بسيط", hint: "بطاقة عمل: خطوط فاصلة وخط واضح بدون زخرفة، للأطباء والمحامين والاستشاريين", uses: ["kicker", "title", "highlight", "body", "meta"] },
  cardF: { label: "شريط علوي", hint: "بطاقة عمل: شريط لون عريض فوق فيه الشعار، والاسم والمسمى تحته، والتواصل بعمودين", uses: ["kicker", "title", "highlight", "body", "meta"] },
  cardG: { label: "إطار وختم", hint: "بطاقة عمل: إطار رفيع، حلقة كبيرة فيها الشعار أو الحرف الأول، والنص بجانبها. فخم وهادئ", uses: ["kicker", "title", "highlight", "body", "meta"] },
  cardH: { label: "قطري", hint: "بطاقة عمل: قص قطري بلون الهوية وفيه الشعار، والنص بالجهة الثانية. حديث وجريء", uses: ["kicker", "title", "highlight", "body", "meta"] },
  cardBack: { label: "خلفية: الشعار", hint: "ظهر البطاقة: لون الهوية كامل والشعار بالوسط مع العبارة التعريفية", uses: ["title", "body"] },
  cardBackB: { label: "خلفية: تفاصيل", hint: "ظهر البطاقة: العنوان وساعات العمل وحسابات التواصل", uses: ["kicker", "title", "body", "meta"] },
  invA: { label: "كلاسيكي ذهبي", hint: "دعوة: إطار مزدوج، الأسماء بالوسط، التاريخ بثلاثة أقسام. للزفاف والخطوبة الفخمة", uses: ["kicker", "title", "highlight", "body", "date", "meta"] },
  invB: { label: "قوس ناعم", hint: "دعوة: قوس كبير بالوسط فيه الأسماء، ألوان هادئة. عصري ورومانسي", uses: ["kicker", "title", "highlight", "body", "date", "meta"] },
  invC: { label: "طباعي عصري", hint: "دعوة: أسماء ضخمة بأسلوب مجلات وخطوط رفيعة وتاريخ بارز. للأسلوب الحديث البسيط", uses: ["kicker", "title", "highlight", "body", "date", "meta"] },
  invD: { label: "ملكي داكن", hint: "دعوة: خلفية داكنة وإطار ذهبي. للحفلات الفخمة والمناسبات الرسمية", uses: ["kicker", "title", "highlight", "body", "date", "meta"] },
  invE: { label: "تاريخ بارز", hint: "دعوة: نصف علوي ملوّن فيه التاريخ ضخم، والأسماء والتفاصيل تحت. للمواليد والتخرج والأعياد", uses: ["kicker", "title", "highlight", "body", "date", "meta"] },
  invF: { label: "ورقة وبطاقة", hint: "دعوة: ورقة بيضاء مدورة فوق خلفية ناعمة، نقاط بالزوايا، الأسماء بالوسط. ناعم ونظيف", uses: ["kicker", "title", "highlight", "body", "date", "meta"] },
  invG: { label: "شريط التاريخ", hint: "دعوة: شريط عمودي بلون كامل فيه التاريخ بخط ضخم، والأسماء والتفاصيل بجانبه. عصري وواضح", uses: ["kicker", "title", "highlight", "body", "date", "meta"] },
  invH: { label: "هلال ونجوم", hint: "دعوة: خلفية داكنة وهلال ونجوم بالأعلى. للعيد ورمضان والقرقيعان والمناسبات الإسلامية، ويصلح للزفاف الليلي", uses: ["kicker", "title", "highlight", "body", "date", "meta"] },
  invBack: { label: "صفحة التفاصيل", hint: "ظهر الدعوة: عنوان، ملاحظات (الزي، الاستقبال)، الوقت والمكان والتأكيد", uses: ["kicker", "title", "body", "date", "meta"] },
};
export const CARD_LAYOUTS: LayoutId[] = ["cardA", "cardB", "cardC", "cardD", "cardE", "cardF", "cardG", "cardH", "cardBack", "cardBackB"];
export const INVITE_LAYOUTS: LayoutId[] = ["invA", "invB", "invC", "invD", "invE", "invF", "invG", "invH", "invBack"];
/** Layouts a kind of design offers (posts never get a business-card or invitation layout, and the reverse). */
export const layoutsFor = (kind: DKind): LayoutId[] => (Object.keys(LAYOUTS) as LayoutId[]).filter((id) => {
  const set = CARD_LAYOUTS.includes(id) ? "bcard" : INVITE_LAYOUTS.includes(id) ? "invite" : "post";
  return kind === "bcard" ? set === "bcard" : kind === "invite" ? set === "invite" : set === "post";
});
export const LAYOUT_IDS = layoutsFor("post");

export const ICON_IDS = [
  "check", "star", "heart", "sparkles", "zap", "clock", "calendar", "map-pin", "phone", "message", "gift", "bag", "cart", "tag",
  "percent", "trending", "chart", "shield", "award", "trophy", "users", "user", "graduation", "book", "lightbulb", "target",
  "rocket", "camera", "image", "video", "mic", "music", "coffee", "utensils", "chef", "pizza", "cake", "leaf", "sun", "moon",
  "droplet", "flame", "home", "building", "car", "plane", "truck", "scissors", "shirt", "gem", "crown", "smile", "stethoscope",
  "pill", "dumbbell", "palette", "brush", "laptop", "phone-mobile", "globe", "wifi", "baby", "paw", "flower", "wallet", "headset",
] as const;
export type IconId = (typeof ICON_IDS)[number];

export const PALETTES: { name: string; colors: DColors }[] = [
  { name: "كحلي وذهبي", colors: { bg: "#0B2A4A", ink: "#FFFFFF", accent: "#C9A45C", soft: "#12385F" } },
  { name: "رملي", colors: { bg: "#F3ECE2", ink: "#1E1B18", accent: "#B4532F", soft: "#FBF7F1" } },
  { name: "زيتوني", colors: { bg: "#F1F1EA", ink: "#1F2A1F", accent: "#4F6B3A", soft: "#FFFFFF" } },
  { name: "ليلي", colors: { bg: "#111114", ink: "#F5F2EA", accent: "#E8B44C", soft: "#1D1D22" } },
  { name: "وردي هادي", colors: { bg: "#FBEFEC", ink: "#3A1F25", accent: "#C2566B", soft: "#FFFFFF" } },
  { name: "تركوازي", colors: { bg: "#EAF4F2", ink: "#0F2D2A", accent: "#0F8B7E", soft: "#FFFFFF" } },
  { name: "أحمر جريء", colors: { bg: "#B3261E", ink: "#FFFFFF", accent: "#FFD166", soft: "#9A1F18" } },
  { name: "أبيض نظيف", colors: { bg: "#FFFFFF", ink: "#111827", accent: "#2251CC", soft: "#F3F5F9" } },
];

// ---------- helpers shared by preview, studio and server ----------
const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const opt = (v: unknown, max: number) => str(v, max) || undefined;

export function lum(h: string) {
  const n = parseInt(h.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
/** Readable text colour on top of a background. */
export const onColor = (bg: string) => (lum(bg) > 0.6 ? "#14161A" : "#FFFFFF");
/** Mix a colour with another (0..1), for quiet lines and muted text. */
export function mix(a: string, b: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/** Free logo placement (fractions of the frame), or null for the layout's own spot. */
export const box = (v: unknown) => {
  const o = v as { x?: unknown; y?: unknown; w?: unknown } | null;
  const n = (x: unknown, a: number, b: number) => (typeof x === "number" && Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : null);
  if (!o) return null;
  const x = n(o.x, 0, 1), y = n(o.y, 0, 1), w = n(o.w, 0.04, 0.8);
  return x === null || y === null || w === null ? null : { x, y, w };
};
const img = (v: unknown): DImg | null => {
  const o = v as DImg | null;
  return o && typeof o.path === "string" && (o.bucket === "uploads" || o.bucket === "results") ? { path: o.path, bucket: o.bucket, url: typeof o.url === "string" ? o.url : "" } : null;
};
const items = (v: unknown, max: number): DItem[] =>
  (Array.isArray(v) ? v : []).map((x) => ({ icon: (ICON_IDS as readonly string[]).includes(x?.icon) ? x.icon : undefined, text: str(x?.text ?? x, 90) })).filter((x) => x.text).slice(0, max);

export function normaliseSlide(raw: Partial<Slide> & Record<string, unknown>, fallback: LayoutId = "classic"): Slide {
  const layout = (Object.keys(LAYOUTS) as string[]).includes(String(raw.layout)) ? (raw.layout as LayoutId) : fallback;
  const d = raw.date as Slide["date"], p = raw.price as Slide["price"], s = raw.stat as Slide["stat"], per = raw.person as Slide["person"];
  return {
    layout,
    kicker: opt(raw.kicker, 110),
    title: str(raw.title, 150) || " ",
    highlight: opt(raw.highlight, 110),
    body: opt(raw.body, 520),
    items: items(raw.items, 6),
    meta: items(raw.meta, (CARD_LAYOUTS as string[]).includes(layout) ? 5 : 4),
    date: d && str(d.day, 6) ? { day: str(d.day, 6), month: str(d.month, 14), weekday: opt(d.weekday, 14) } : null,
    price: p && str(p.value, 12) ? { value: str(p.value, 12), old: opt(p.old, 12), currency: opt(p.currency, 10), note: opt(p.note, 60) } : null,
    stat: s && str(s.value, 8) ? { value: str(s.value, 8), label: opt(s.label, 40) } : null,
    badge: opt(raw.badge, 60),
    cta: opt(raw.cta, 60),
    person: per && str(per.name, 40) ? { name: str(per.name, 40), role: opt(per.role, 40), photo: img(per.photo) } : null,
    sticker: (() => { const k = (raw.sticker as Sticker | null)?.kind; return k && (STICKER_IDS as readonly string[]).includes(k) ? { kind: k, text: str((raw.sticker as Sticker).text, 24) } : null; })(),
    photo: img(raw.photo),
    bg: img(raw.bg),
    imagePrompt: opt(raw.imagePrompt, 600),
    caption: typeof raw.caption === "string" ? raw.caption.trim().slice(0, 2200) || undefined : undefined,
    pos: (() => {
      const o = raw.pos && typeof raw.pos === "object" ? Object.entries(raw.pos as Record<string, { x?: unknown; y?: unknown; s?: unknown }>) : [];
      const r: Record<string, { x: number; y: number; s?: number }> = {};
      for (const [k, v] of o.slice(0, 24)) {
        if (!/^[a-z0-9]{2,12}$/.test(k) || !v) continue;
        const x = Number(v.x), y = Number(v.y), sc = Number(v.s);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        r[k] = { x: Math.max(-3000, Math.min(3000, Math.round(x))), y: Math.max(-3000, Math.min(3000, Math.round(y))), ...(Number.isFinite(sc) && sc > 0 && sc !== 1 ? { s: Math.max(0.3, Math.min(3, +sc.toFixed(2))) } : {}) };
      }
      return Object.keys(r).length ? r : undefined;
    })(),
    col: (() => {
      const o = raw.col && typeof raw.col === "object" ? Object.entries(raw.col as Record<string, unknown>) : [];
      const r: Record<string, string> = {};
      for (const [k, v] of o.slice(0, 24)) if (/^[a-z0-9]{2,12}$/.test(k) && typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) r[k] = v;
      return Object.keys(r).length ? r : undefined;
    })(),
    note: (() => {
      const n = raw.note as { text?: unknown; at?: unknown; look?: unknown } | null | undefined;
      const t = n ? str(n.text, 200) : "";
      if (!n || !t) return null;
      return { text: t, at: (NOTE_ATS as readonly string[]).includes(String(n.at)) ? (n.at as "bl" | "br" | "bc") : "bl", look: (NOTE_LOOKS as readonly string[]).includes(String(n.look)) ? (n.look as "royal" | "soft" | "solid") : "royal" };
    })(),
    hide: Array.isArray(raw.hide) ? (raw.hide as unknown[]).filter((x): x is string => typeof x === "string" && /^[a-z0-9]{2,12}$/.test(x)).slice(0, 24) || undefined : undefined,
  };
}

export function normaliseDesign(raw: Partial<DesignSpec> & Record<string, unknown>, base: { kind: DKind; aspect: DAspect }): DesignSpec {
  const c = (raw.colors ?? {}) as Partial<DColors>;
  const b = (raw.brand ?? {}) as DesignSpec["brand"];
  const max = base.kind === "carousel" ? 10 : base.kind === "ads" ? 4 : base.kind === "bcard" || base.kind === "invite" ? 2 : 1;
  const slides = (Array.isArray(raw.slides) ? raw.slides : []).slice(0, max).map((s, i, all) =>
    normaliseSlide(s as Slide & Record<string, unknown>, base.kind === "invite" ? (i === 0 ? "invA" : "invBack") : base.kind === "bcard" ? (i === 0 ? "cardA" : "cardBack") : base.kind === "carousel" ? (i === 0 ? "cover" : i === all.length - 1 ? "cta" : "point") : "classic"));
  return {
    kind: base.kind,
    aspect: (Object.keys(DSIZE) as DAspect[]).includes(raw.aspect as DAspect) ? (raw.aspect as DAspect) : base.aspect,
    font: ALL_FONT_IDS.includes(String(raw.font)) ? (raw.font as string) : "Cairo",
    titleFont: ALL_FONT_IDS.includes(String(raw.titleFont)) ? (raw.titleFont as string) : undefined,
    finish: raw.finish === "foil" ? "foil" : raw.finish === "flat" ? "flat" : undefined,
    colors: { bg: hex(c.bg, "#F3ECE2"), ink: hex(c.ink, "#1E1B18"), accent: hex(c.accent, "#B4532F"), soft: hex(c.soft, "#FBF7F1") },
    brand: { name: opt(b?.name, 50), handle: opt(b?.handle, 60), logo: img(b?.logo), showLogo: b?.showLogo !== false, box: box(b?.box) },
    slides: slides.length ? slides : [normaliseSlide({ title: "عنوانك هنا" })],
    caption: typeof raw.caption === "string" ? raw.caption.trim().slice(0, 2200) || undefined : undefined,
    deco: (DECO_IDS as readonly string[]).includes(String(raw.deco)) ? (raw.deco as Deco) : "circles",
    frame: (FRAME_IDS as readonly string[]).includes(String(raw.frame)) ? (raw.frame as Frame) : "none",
    bigNum: raw.bigNum === true ? true : undefined,
    industry: typeof raw.industry === "string" ? raw.industry.slice(0, 30) : undefined,
    icons: raw.icons === "duo" || raw.icons === "emoji" || raw.icons === "3d" ? raw.icons : "line",
    icon3d: Object.fromEntries(Object.entries((raw.icon3d ?? {}) as Record<string, unknown>).filter(([k]) => (ICON_IDS as readonly string[]).includes(k)).map(([k, v]) => [k, img(v)]).filter(([, v]) => v)) as Record<string, DImg>,
  };
}

/** Image references in a spec (to sign on load / in the worker). */
export function designImages(s: DesignSpec): DImg[] {
  const out: DImg[] = Object.values(s.icon3d ?? {});
  if (s.brand.logo) out.push(s.brand.logo);
  for (const sl of s.slides) { if (sl.photo) out.push(sl.photo); if (sl.bg) out.push(sl.bg); if (sl.person?.photo) out.push(sl.person.photo); }
  return out;
}

/** Same spec with fresh URLs for every image (by path). */
export function withUrls(s: DesignSpec, urls: Record<string, string>): DesignSpec {
  const u = (i?: DImg | null) => (i ? { ...i, url: urls[`${i.bucket}:${i.path}`] ?? i.url } : i ?? null);
  const icon3d = Object.fromEntries(Object.entries(s.icon3d ?? {}).map(([k, v]) => [k, u(v)!]));
  return { ...s, icon3d, brand: { ...s.brand, logo: u(s.brand.logo) }, slides: s.slides.map((sl) => ({ ...sl, photo: u(sl.photo), bg: u(sl.bg), person: sl.person ? { ...sl.person, photo: u(sl.person.photo) } : sl.person })) };
}

export const DESIGN_TOOLS: Record<string, DKind> = { post: "post", carousel: "carousel", "ad-design": "ads", "business-cards": "bcard", invitations: "invite" };

/** Icon ids a design actually shows (for the 3D icon set). */
export function usedIcons(s: DesignSpec): string[] {
  const ids = new Set<string>();
  for (const sl of s.slides) {
    for (const it of [...(sl.items ?? []), ...(sl.meta ?? [])]) if (it.icon) ids.add(it.icon);
    if (sl.layout === "point") ids.add(sl.items?.[0]?.icon ?? "lightbulb");
  }
  return [...ids].slice(0, 9);
}
