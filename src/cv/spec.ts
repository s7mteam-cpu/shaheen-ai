// CV (السيرة الذاتية): the data model, templates and the 50 ready styles. Rendered by CV.tsx (screen + PDF) and cvdocx.ts (Word).
export type CVLang = "ar" | "en";
export type CVTemplate = "side" | "classic" | "exec" | "modern" | "timeline" | "minimal" | "chips" | "split";
export type CVImg = { path: string; bucket: "uploads"; url?: string };
export type SecKey = "summary" | "experience" | "education" | "skills" | "languages" | "courses" | "extra";
export const SEC_KEYS: SecKey[] = ["summary", "experience", "education", "skills", "languages", "courses", "extra"];

export type CVSpec = {
  lang: CVLang;
  template: CVTemplate;
  font: string;
  accent: string;
  /** page tint + header tone, used by some styles */
  tone: "light" | "warm" | "dark";
  photo: CVImg | null;
  showPhoto: boolean;
  person: { name: string; title: string; email: string; phone: string; city: string; linkedin: string; website: string };
  details: { label: string; value: string }[];
  summary: string;
  experience: { role: string; company: string; place: string; from: string; to: string; bullets: string[] }[];
  education: { degree: string; school: string; place: string; from: string; to: string; note: string }[];
  skills: string[];
  languages: { name: string; level: string }[];
  courses: { name: string; org: string; year: string }[];
  extra: { title: string; items: string[] }[];
  titles: Partial<Record<SecKey, string>>;
  hidden: SecKey[];
};

export const CV_TEMPLATES: { id: CVTemplate; label: string; hint: string }[] = [
  { id: "side", label: "شريط جانبي", hint: "عمود ملوّن جانبي فيه التواصل والمهارات" },
  { id: "classic", label: "كلاسيكي", hint: "ترويسة بالوسط وأقسام بخطوط رفيعة" },
  { id: "exec", label: "تنفيذي", hint: "ترويسة عريضة داكنة للمناصب العليا" },
  { id: "modern", label: "عصري", hint: "اسم كبير وعناوين أقسام بشريط لون" },
  { id: "timeline", label: "خط زمني", hint: "الخبرات على خط زمني بنقاط" },
  { id: "minimal", label: "هادئ", hint: "مساحات واسعة وخطوط شعرية" },
  { id: "chips", label: "بطاقات", hint: "بطاقة ترويسة ومهارات على شكل شارات" },
  { id: "split", label: "نصفين", hint: "ترويسة بنصفين وعمودان متوازنان" },
];

export const CV_FONTS = [["Cairo", "Cairo"], ["Tajawal", "Tajawal"], ["Almarai", "Almarai"], ["Amiri", "Amiri"], ["Changa", "Changa"]] as const;
export const CV_FONT_IDS: string[] = CV_FONTS.map((f) => f[0]);

export const TITLES: Record<CVLang, Record<SecKey, string>> = {
  ar: { summary: "نبذة مهنية", experience: "الخبرات العملية", education: "التعليم", skills: "المهارات", languages: "اللغات", courses: "الدورات والشهادات", extra: "إضافات" },
  en: { summary: "Profile", experience: "Experience", education: "Education", skills: "Skills", languages: "Languages", courses: "Courses & Certificates", extra: "Additional" },
};

const hex = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const str = (v: unknown, n = 200) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const arr = <T,>(v: unknown, n: number): T[] => (Array.isArray(v) ? (v.slice(0, n) as T[]) : []);
type R = Record<string, unknown>;
const obj = (v: unknown): R => (v && typeof v === "object" ? (v as R) : {});

export function blankCV(lang: CVLang = "ar"): CVSpec {
  return normaliseCV({ lang });
}

export function normaliseCV(raw: unknown): CVSpec {
  const r = obj(raw);
  const p = obj(r.person);
  const lang: CVLang = r.lang === "en" ? "en" : "ar";
  const tpl = CV_TEMPLATES.some((t) => t.id === r.template) ? (r.template as CVTemplate) : "side";
  return {
    lang,
    template: tpl,
    font: CV_FONT_IDS.includes(String(r.font)) ? String(r.font) : "Cairo",
    accent: hex(r.accent, "#0B2A4A"),
    tone: r.tone === "warm" || r.tone === "dark" ? r.tone : "light",
    photo: r.photo && typeof obj(r.photo).path === "string" ? { path: String(obj(r.photo).path), bucket: "uploads", url: typeof obj(r.photo).url === "string" ? String(obj(r.photo).url) : undefined } : null,
    showPhoto: r.showPhoto !== false,
    person: { name: str(p.name, 80), title: str(p.title, 100), email: str(p.email, 100), phone: str(p.phone, 40), city: str(p.city, 80), linkedin: str(p.linkedin, 120), website: str(p.website, 120) },
    details: arr<R>(r.details, 8).map((d) => ({ label: str(obj(d).label, 40), value: str(obj(d).value, 80) })).filter((d) => d.label || d.value),
    summary: str(r.summary, 900),
    experience: arr<R>(r.experience, 12).map((e) => ({ role: str(obj(e).role, 100), company: str(obj(e).company, 100), place: str(obj(e).place, 80), from: str(obj(e).from, 30), to: str(obj(e).to, 30), bullets: arr<unknown>(obj(e).bullets, 8).map((b) => str(b, 300)).filter(Boolean) })),
    education: arr<R>(r.education, 6).map((e) => ({ degree: str(obj(e).degree, 120), school: str(obj(e).school, 120), place: str(obj(e).place, 80), from: str(obj(e).from, 30), to: str(obj(e).to, 30), note: str(obj(e).note, 200) })),
    skills: arr<unknown>(r.skills, 24).map((s) => str(s, 50)).filter(Boolean),
    languages: arr<R>(r.languages, 6).map((l) => ({ name: str(obj(l).name, 40), level: str(obj(l).level, 40) })).filter((l) => l.name),
    courses: arr<R>(r.courses, 10).map((c) => ({ name: str(obj(c).name, 120), org: str(obj(c).org, 100), year: str(obj(c).year, 20) })).filter((c) => c.name),
    extra: arr<R>(r.extra, 4).map((x) => ({ title: str(obj(x).title, 60), items: arr<unknown>(obj(x).items, 8).map((i) => str(i, 200)).filter(Boolean) })).filter((x) => x.title || x.items.length),
    titles: Object.fromEntries(SEC_KEYS.filter((k) => typeof obj(r.titles)[k] === "string").map((k) => [k, str(obj(r.titles)[k], 40)])),
    hidden: arr<string>(r.hidden, 7).filter((k): k is SecKey => (SEC_KEYS as string[]).includes(k)),
  };
}

export const secTitle = (s: CVSpec, k: SecKey) => s.titles[k] || TITLES[s.lang][k];

// ---------- 50 ready styles: template + colour + font + page tone ----------
export type CVStyle = { id: string; name: string; template: CVTemplate; accent: string; font: string; tone: "light" | "warm" | "dark" };
const C = { navy: "#0B2A4A", gold: "#9A7B2F", emerald: "#0E5A44", wine: "#6B1F34", char: "#23262B", teal: "#0F6F73", plum: "#4B2E83", clay: "#9C4A2B", olive: "#4F5B2E", steel: "#3F5B78", rose: "#9E3A5B", royal: "#1F3C88", sand: "#8C6D46", ink: "#111827", forest: "#1F4D3A", copper: "#B0652E" };
const R: [CVTemplate, keyof typeof C, string, "light" | "warm" | "dark", string][] = [
  ["side", "navy", "Cairo", "light", "كحلي ملكي"], ["side", "emerald", "Almarai", "light", "زمردي هادي"], ["side", "wine", "Tajawal", "warm", "عنابي راقٍ"], ["side", "char", "Cairo", "light", "فحمي عصري"], ["side", "teal", "Almarai", "light", "تركوازي نظيف"], ["side", "plum", "Tajawal", "light", "بنفسجي أنيق"], ["side", "gold", "Amiri", "warm", "ذهبي كلاسيكي"],
  ["classic", "navy", "Amiri", "light", "كلاسيكي كحلي"], ["classic", "ink", "Cairo", "light", "كلاسيكي أسود"], ["classic", "wine", "Amiri", "warm", "كلاسيكي عنابي"], ["classic", "forest", "Tajawal", "light", "كلاسيكي أخضر"], ["classic", "gold", "Amiri", "warm", "كلاسيكي ذهبي"], ["classic", "steel", "Almarai", "light", "كلاسيكي رصاصي"],
  ["exec", "navy", "Cairo", "light", "تنفيذي كحلي"], ["exec", "char", "Tajawal", "light", "تنفيذي فحمي"], ["exec", "emerald", "Almarai", "light", "تنفيذي زمردي"], ["exec", "wine", "Cairo", "warm", "تنفيذي عنابي"], ["exec", "ink", "Amiri", "warm", "تنفيذي أسود وذهب"], ["exec", "royal", "Tajawal", "light", "تنفيذي أزرق ملكي"],
  ["modern", "royal", "Cairo", "light", "عصري أزرق"], ["modern", "clay", "Tajawal", "warm", "عصري طيني"], ["modern", "teal", "Almarai", "light", "عصري تركوازي"], ["modern", "rose", "Cairo", "light", "عصري وردي"], ["modern", "copper", "Changa", "warm", "عصري نحاسي"], ["modern", "ink", "Cairo", "light", "عصري أسود"],
  ["timeline", "teal", "Cairo", "light", "خط زمني تركوازي"], ["timeline", "navy", "Almarai", "light", "خط زمني كحلي"], ["timeline", "plum", "Tajawal", "light", "خط زمني بنفسجي"], ["timeline", "clay", "Cairo", "warm", "خط زمني طيني"], ["timeline", "forest", "Almarai", "light", "خط زمني أخضر"], ["timeline", "wine", "Tajawal", "warm", "خط زمني عنابي"],
  ["minimal", "ink", "Cairo", "light", "هادئ أسود"], ["minimal", "sand", "Almarai", "warm", "هادئ رملي"], ["minimal", "navy", "Tajawal", "light", "هادئ كحلي"], ["minimal", "olive", "Cairo", "warm", "هادئ زيتوني"], ["minimal", "steel", "Almarai", "light", "هادئ رصاصي"], ["minimal", "wine", "Amiri", "warm", "هادئ عنابي"],
  ["chips", "plum", "Cairo", "light", "بطاقات بنفسجي"], ["chips", "teal", "Tajawal", "light", "بطاقات تركوازي"], ["chips", "clay", "Almarai", "warm", "بطاقات طيني"], ["chips", "royal", "Cairo", "light", "بطاقات أزرق"], ["chips", "rose", "Tajawal", "warm", "بطاقات وردي"], ["chips", "emerald", "Almarai", "light", "بطاقات زمردي"],
  ["split", "navy", "Cairo", "light", "نصفين كحلي"], ["split", "wine", "Tajawal", "warm", "نصفين عنابي"], ["split", "char", "Almarai", "light", "نصفين فحمي"], ["split", "forest", "Cairo", "light", "نصفين أخضر"], ["split", "gold", "Amiri", "warm", "نصفين ذهبي"], ["split", "teal", "Tajawal", "light", "نصفين تركوازي"],
  ["side", "copper", "Changa", "warm", "جانبي نحاسي"]
];
export const CV_STYLES: CVStyle[] = R.map(([template, c, font, tone, name], i) => ({ id: `c${i + 1}`, name, template, accent: C[c], font, tone }));
export const applyCVStyle = (s: CVSpec, st: CVStyle): CVSpec => ({ ...s, template: st.template, accent: st.accent, font: st.font, tone: st.tone });
export const CV_ACCENTS = Object.values(C);
