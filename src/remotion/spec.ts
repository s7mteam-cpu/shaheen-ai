/** Motion-graphics video = plain data. The Player draws it live, the worker renders it to MP4. */
export const ICONS = ["check", "x", "leaf", "bread", "bowl", "heart", "star", "bolt", "clock", "phone", "chat", "gift", "cart", "tag", "chart", "shield", "sparkle", "pin", "users", "drop"] as const;
export type IconName = (typeof ICONS)[number];

export type Scene =
  | { type: "intro"; icon?: IconName; kicker?: string; title: string; subtitle?: string }
  | { type: "statement"; text: string }
  | { type: "myth"; myth: string; fact: string }
  | { type: "points"; title: string; items: { icon: IconName; label: string }[] }
  | { type: "stat"; value: number; suffix?: string; label: string }
  | { type: "cta"; title: string; subtitle?: string; button?: string };

export type Colors = { bg: string; bg2: string; text: string; accent: string; accent2: string };
export type Aspect = "9:16" | "1:1" | "16:9";

export type MotionSpec = {
  aspect: Aspect;
  seconds: number;
  font: string;
  colors: Colors;
  brand?: string;
  scenes: Scene[];
  music?: { url: string; name: string } | null;
  voice?: { url: string; text: string } | null;
  logo?: { path: string; url: string; on: boolean; box: { x: number; y: number; w: number } } | null;
};

export const FPS = 30;
export const FONTS = [
  { id: "Cairo", label: "كايرو" },
  { id: "Tajawal", label: "تجوال" },
  { id: "Almarai", label: "المراعي" },
  { id: "Changa", label: "تشانغا" },
  { id: "Amiri", label: "أميري" },
];
export const COLOR_LABELS: Record<keyof Colors, string> = {
  bg: "الخلفية", bg2: "الخلفية 2", text: "النص", accent: "اللون المميز", accent2: "لون إضافي",
};

export function dimensions(a: Aspect) {
  return a === "16:9" ? { width: 1920, height: 1080 } : a === "1:1" ? { width: 1080, height: 1080 } : { width: 1080, height: 1920 };
}

const weight: Record<Scene["type"], number> = { intro: 1, statement: 1, myth: 1.5, points: 1.4, stat: 1, cta: 1 };

/** Frame ranges for each scene, filling the chosen length exactly. */
export function timeline(spec: MotionSpec) {
  const total = Math.round(spec.seconds * FPS);
  const sum = spec.scenes.reduce((s, x) => s + weight[x.type], 0) || 1;
  let from = 0;
  return spec.scenes.map((scene, i) => {
    const len = i === spec.scenes.length - 1 ? total - from : Math.round((weight[scene.type] / sum) * total);
    const r = { scene, from, len };
    from += len;
    return r;
  });
}

/** Every editable text with a friendly label, in order of appearance. */
export function textFields(spec: MotionSpec) {
  const out: { key: string; label: string; value: string }[] = [];
  if (spec.brand !== undefined) out.push({ key: "brand", label: "اسم النشاط", value: spec.brand });
  spec.scenes.forEach((s, i) => {
    const add = (f: string, label: string, value?: string) => value !== undefined && out.push({ key: `${i}.${f}`, label, value });
    switch (s.type) {
      case "intro": add("kicker", "عنوان صغير", s.kicker); add("title", "العنوان", s.title); add("subtitle", "سطر تحت العنوان", s.subtitle); break;
      case "statement": add("text", "جملة", s.text); break;
      case "myth": add("myth", "الخرافة", s.myth); add("fact", "الحقيقة", s.fact); break;
      case "points": add("title", "عنوان النقاط", s.title); s.items.forEach((it, j) => add(`items.${j}.label`, `نقطة ${j + 1}`, it.label)); break;
      case "stat": add("label", "وصف الرقم", s.label); break;
      case "cta": add("title", "الدعوة", s.title); add("subtitle", "تواصل", s.subtitle); add("button", "نص الزر", s.button); break;
    }
  });
  return out;
}

export function setText(spec: MotionSpec, key: string, value: string): MotionSpec {
  if (key === "brand") return { ...spec, brand: value };
  const [i, ...path] = key.split(".");
  const scenes = spec.scenes.map((s, idx) => {
    if (idx !== Number(i)) return s;
    const copy = structuredClone(s) as Record<string, unknown>;
    let node = copy as Record<string, unknown>;
    for (const p of path.slice(0, -1)) node = node[p] as Record<string, unknown>;
    node[path[path.length - 1]] = value;
    return copy as Scene;
  });
  return { ...spec, scenes };
}

/** Narration script built from the scenes (starting point for the voice-over). */
export function narration(spec: MotionSpec) {
  return spec.scenes.map((s) => {
    switch (s.type) {
      case "intro": return [s.title, s.subtitle].filter(Boolean).join(". ");
      case "statement": return s.text;
      case "myth": return `${s.myth}؟ خرافة. والحقيقة: ${s.fact}`;
      case "points": return `${s.title}: ${s.items.map((x) => x.label).join("، ")}`;
      case "stat": return `${s.value}${s.suffix ?? ""} ${s.label}`;
      case "cta": return [s.title, s.subtitle].filter(Boolean).join(". ");
    }
  }).join(".\n");
}

/** Sanitises whatever the AI returned into a valid spec. */
export function normalise(raw: Partial<MotionSpec>, base: Pick<MotionSpec, "aspect" | "seconds">): MotionSpec {
  const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
  const c = (raw.colors ?? {}) as Partial<Colors>;
  const icon = (v: unknown): IconName => (ICONS as readonly string[]).includes(String(v)) ? (v as IconName) : "sparkle";
  const scenes = (Array.isArray(raw.scenes) ? raw.scenes : []).slice(0, 8).flatMap((s): Scene[] => {
    const t = (v: unknown, max = 90) => String(v ?? "").slice(0, max);
    switch (s?.type) {
      case "intro": return [{ type: "intro", icon: icon(s.icon), kicker: s.kicker ? t(s.kicker, 40) : undefined, title: t(s.title), subtitle: s.subtitle ? t(s.subtitle) : undefined }];
      case "statement": return [{ type: "statement", text: t(s.text, 120) }];
      case "myth": return [{ type: "myth", myth: t(s.myth), fact: t(s.fact, 110) }];
      case "points": return [{ type: "points", title: t(s.title), items: (s.items ?? []).slice(0, 4).map((x) => ({ icon: icon(x.icon), label: t(x.label, 24) })) }];
      case "stat": return [{ type: "stat", value: Math.max(0, Math.round(Number(s.value) || 0)), suffix: s.suffix ? t(s.suffix, 6) : undefined, label: t(s.label) }];
      case "cta": return [{ type: "cta", title: t(s.title), subtitle: s.subtitle ? t(s.subtitle, 50) : undefined, button: s.button ? t(s.button, 24) : undefined }];
      default: return [];
    }
  });
  return {
    aspect: base.aspect,
    seconds: base.seconds,
    font: FONTS.some((f) => f.id === raw.font) ? raw.font! : "Cairo",
    brand: raw.brand ? String(raw.brand).slice(0, 40) : undefined,
    colors: { bg: hex(c.bg, "#0B2A4A"), bg2: hex(c.bg2, "#061A30"), text: hex(c.text, "#FFFFFF"), accent: hex(c.accent, "#C9A45C"), accent2: hex(c.accent2, "#E07A5F") },
    scenes: scenes.length ? scenes : SAMPLE.scenes,
    music: null,
    voice: null,
  };
}

export const SAMPLE: MotionSpec = {
  aspect: "9:16",
  seconds: 30,
  font: "Cairo",
  brand: "د. وسمية الحمد",
  colors: { bg: "#2A1810", bg2: "#140B07", text: "#F6E7D2", accent: "#D4A373", accent2: "#E07A5F" },
  scenes: [
    { type: "intro", icon: "leaf", kicker: "التغذية العلاجية", title: "خرافة وحقيقة", subtitle: "عن الكربوهيدرات" },
    { type: "myth", myth: "قطع الكربوهيدرات تماماً هو الحل الوحيد لإنقاص الوزن", fact: "الكربوهيدرات المعقدة عنصر أساسي لإنتاج الطاقة وصحة الدماغ" },
    { type: "points", title: "اختر الكربوهيدرات الصح", items: [{ icon: "bowl", label: "الشوفان" }, { icon: "bread", label: "الخبز الأسمر" }, { icon: "leaf", label: "البقوليات" }] },
    { type: "stat", value: 45, suffix: "%", label: "من طاقتك اليومية من الكربوهيدرات" },
    { type: "cta", title: "احجز استشارتك الحين", subtitle: "@dr.wasmiyah", button: "احجز موعد" },
  ],
  music: null,
  voice: null,
};
