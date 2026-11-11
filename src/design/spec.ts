// Design studio data model: posts, carousels and ads, rendered by React (live preview) and by the worker (PNG).
// Claude writes the content and picks a layout per slide; the customer edits everything live.

export type DAspect = "4:5" | "1:1" | "9:16";
export type DKind = "post" | "carousel" | "ads";
export type DImg = { path: string; bucket: "uploads" | "results"; url: string };
export type DItem = { icon?: string; text: string };
export type DColors = { bg: string; ink: string; accent: string; soft: string };

export type LayoutId = "classic" | "bold" | "bento" | "minimal" | "split" | "photo" | "offer" | "quote" | "cover" | "point" | "cta";

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
  imagePrompt?: string;
  caption?: string;
};

export type DesignSpec = {
  kind: DKind;
  aspect: DAspect;
  font: string;
  colors: DColors;
  brand: { name?: string; handle?: string; logo?: DImg | null; showLogo: boolean; box?: { x: number; y: number; w: number } | null };
  slides: Slide[];
  caption?: string;
  deco?: Deco;
  frame?: Frame;
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
};

export const DFONTS = [
  { id: "Cairo", label: "كايرو" },
  { id: "Tajawal", label: "تجوال" },
  { id: "Almarai", label: "المراعي" },
  { id: "Changa", label: "تشانغا" },
  { id: "Amiri", label: "أميري" },
] as const;

/** Which fields each layout shows: the studio offers exactly these, and Claude is told the same. */
export const LAYOUTS: Record<LayoutId, { label: string; hint: string; uses: (keyof Slide)[] }> = {
  classic: { label: "كلاسيكي", hint: "إعلان كامل: عنوان، وصف، 3 مزايا بأيقونات، تفاصيل، سعر وزر", uses: ["kicker", "title", "highlight", "body", "items", "meta", "price", "cta", "badge", "photo"] },
  bold: { label: "جريء", hint: "فعالية أو دورة: تاريخ بارز، عنوان كبير، قائمة مرقّمة، مقدّم، سعر وزر", uses: ["kicker", "title", "highlight", "date", "items", "meta", "person", "price", "cta"] },
  bento: { label: "بينتو", hint: "مربعات عصرية متفاوتة: عنوان، صورة أو ميزة بارزة، مزايا، سعر وزر. مناسب للمنتجات والخدمات والتقنية", uses: ["kicker", "title", "highlight", "body", "items", "meta", "photo", "price", "cta", "badge"] },
  minimal: { label: "طباعي بسيط", hint: "عنوان ضخم جداً بأسلوب مجلات، خطوط فاصلة، بدون زحمة. مناسب للإعلانات الفاخرة والعبارات القوية", uses: ["kicker", "badge", "title", "highlight", "body", "meta", "price", "cta"] },
  split: { label: "نص وصورة", hint: "الصورة بنص التصميم والنص بالنص الثاني، مع مزايا وسعر. مناسب للمنتجات والأزياء والعقار", uses: ["kicker", "title", "highlight", "body", "items", "photo", "price", "cta", "badge"] },
  photo: { label: "صورة كبيرة", hint: "منتج أو مكان أو طبق: صورة كبيرة فوق، نص وسعر تحت", uses: ["kicker", "title", "highlight", "body", "photo", "price", "cta", "badge"] },
  offer: { label: "عرض وخصم", hint: "رقم ضخم (خصم أو سعر)، عنوان، مدة العرض وزر", uses: ["badge", "stat", "title", "highlight", "body", "meta", "cta", "photo"] },
  quote: { label: "اقتباس ونصيحة", hint: "جملة أو نصيحة كبيرة مع صاحبها", uses: ["kicker", "body", "person"] },
  cover: { label: "غلاف", hint: "أول شريحة بالكاروسيل أو بوست بعنوان ضخم", uses: ["kicker", "title", "highlight", "body", "photo"] },
  point: { label: "نقطة", hint: "شريحة داخلية: رقم، أيقونة، عنوان، شرح قصير", uses: ["kicker", "title", "body", "items"] },
  cta: { label: "خاتمة", hint: "آخر شريحة: شعار، دعوة، زر، الحساب", uses: ["title", "body", "cta", "meta"] },
};
export const LAYOUT_IDS = Object.keys(LAYOUTS) as LayoutId[];

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
  const layout = (LAYOUT_IDS as string[]).includes(String(raw.layout)) ? (raw.layout as LayoutId) : fallback;
  const d = raw.date as Slide["date"], p = raw.price as Slide["price"], s = raw.stat as Slide["stat"], per = raw.person as Slide["person"];
  return {
    layout,
    kicker: opt(raw.kicker, 60),
    title: str(raw.title, 90) || " ",
    highlight: opt(raw.highlight, 60),
    body: opt(raw.body, 320),
    items: items(raw.items, 5),
    meta: items(raw.meta, 3),
    date: d && str(d.day, 6) ? { day: str(d.day, 6), month: str(d.month, 14), weekday: opt(d.weekday, 14) } : null,
    price: p && str(p.value, 12) ? { value: str(p.value, 12), old: opt(p.old, 12), currency: opt(p.currency, 10), note: opt(p.note, 60) } : null,
    stat: s && str(s.value, 8) ? { value: str(s.value, 8), label: opt(s.label, 40) } : null,
    badge: opt(raw.badge, 30),
    cta: opt(raw.cta, 30),
    person: per && str(per.name, 40) ? { name: str(per.name, 40), role: opt(per.role, 40), photo: img(per.photo) } : null,
    sticker: (() => { const k = (raw.sticker as Sticker | null)?.kind; return k && (STICKER_IDS as readonly string[]).includes(k) ? { kind: k, text: str((raw.sticker as Sticker).text, 24) } : null; })(),
    photo: img(raw.photo),
    imagePrompt: opt(raw.imagePrompt, 600),
    caption: typeof raw.caption === "string" ? raw.caption.trim().slice(0, 2200) || undefined : undefined,
  };
}

export function normaliseDesign(raw: Partial<DesignSpec> & Record<string, unknown>, base: { kind: DKind; aspect: DAspect }): DesignSpec {
  const c = (raw.colors ?? {}) as Partial<DColors>;
  const b = (raw.brand ?? {}) as DesignSpec["brand"];
  const max = base.kind === "carousel" ? 10 : base.kind === "ads" ? 4 : 1;
  const slides = (Array.isArray(raw.slides) ? raw.slides : []).slice(0, max).map((s, i, all) =>
    normaliseSlide(s as Slide & Record<string, unknown>, base.kind === "carousel" ? (i === 0 ? "cover" : i === all.length - 1 ? "cta" : "point") : "classic"));
  return {
    kind: base.kind,
    aspect: (Object.keys(DSIZE) as DAspect[]).includes(raw.aspect as DAspect) ? (raw.aspect as DAspect) : base.aspect,
    font: DFONTS.some((f) => f.id === raw.font) ? (raw.font as string) : "Cairo",
    colors: { bg: hex(c.bg, "#F3ECE2"), ink: hex(c.ink, "#1E1B18"), accent: hex(c.accent, "#B4532F"), soft: hex(c.soft, "#FBF7F1") },
    brand: { name: opt(b?.name, 50), handle: opt(b?.handle, 60), logo: img(b?.logo), showLogo: b?.showLogo !== false, box: box(b?.box) },
    slides: slides.length ? slides : [normaliseSlide({ title: "عنوانك هنا" })],
    caption: typeof raw.caption === "string" ? raw.caption.trim().slice(0, 2200) || undefined : undefined,
    deco: (DECO_IDS as readonly string[]).includes(String(raw.deco)) ? (raw.deco as Deco) : "circles",
    frame: (FRAME_IDS as readonly string[]).includes(String(raw.frame)) ? (raw.frame as Frame) : "none",
    industry: typeof raw.industry === "string" ? raw.industry.slice(0, 30) : undefined,
    icons: raw.icons === "duo" || raw.icons === "emoji" || raw.icons === "3d" ? raw.icons : "line",
    icon3d: Object.fromEntries(Object.entries((raw.icon3d ?? {}) as Record<string, unknown>).filter(([k]) => (ICON_IDS as readonly string[]).includes(k)).map(([k, v]) => [k, img(v)]).filter(([, v]) => v)) as Record<string, DImg>,
  };
}

/** Image references in a spec (to sign on load / in the worker). */
export function designImages(s: DesignSpec): DImg[] {
  const out: DImg[] = Object.values(s.icon3d ?? {});
  if (s.brand.logo) out.push(s.brand.logo);
  for (const sl of s.slides) { if (sl.photo) out.push(sl.photo); if (sl.person?.photo) out.push(sl.person.photo); }
  return out;
}

/** Same spec with fresh URLs for every image (by path). */
export function withUrls(s: DesignSpec, urls: Record<string, string>): DesignSpec {
  const u = (i?: DImg | null) => (i ? { ...i, url: urls[`${i.bucket}:${i.path}`] ?? i.url } : i ?? null);
  const icon3d = Object.fromEntries(Object.entries(s.icon3d ?? {}).map(([k, v]) => [k, u(v)!]));
  return { ...s, icon3d, brand: { ...s.brand, logo: u(s.brand.logo) }, slides: s.slides.map((sl) => ({ ...sl, photo: u(sl.photo), person: sl.person ? { ...sl.person, photo: u(sl.person.photo) } : sl.person })) };
}

export const DESIGN_TOOLS: Record<string, DKind> = { post: "post", carousel: "carousel", "ad-design": "ads" };

/** Icon ids a design actually shows (for the 3D icon set). */
export function usedIcons(s: DesignSpec): string[] {
  const ids = new Set<string>();
  for (const sl of s.slides) {
    for (const it of [...(sl.items ?? []), ...(sl.meta ?? [])]) if (it.icon) ids.add(it.icon);
    if (sl.layout === "point") ids.add(sl.items?.[0]?.icon ?? "lightbulb");
  }
  return [...ids].slice(0, 9);
}
