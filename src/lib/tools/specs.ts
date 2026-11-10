// Form definition + cost units for every tool.
// Shared by the browser (to draw the form and show the cost) and the server (to validate and charge).

export type Option = { value: string; label: string };
export type Field =
  | { type: "text"; name: string; label: string; placeholder?: string; required?: boolean; max?: number; rows?: number }
  | { type: "line"; name: string; label: string; placeholder?: string; required?: boolean; max?: number }
  | { type: "files"; name: string; label: string; accept: "image" | "video" | "audio"; min?: number; max: number; hint?: string }
  | { type: "choice"; name: string; label: string; options: Option[]; default: string }
  | { type: "count"; name: string; label: string; min: number; max: number; default: number }
  | { type: "toggle"; name: string; label: string; default: boolean; hint?: string }
  | { type: "voice"; name: string; label: string }
  | { type: "consent"; name: string; label: string; showIf?: { field: string; truthy: true } };

export type Values = Record<string, unknown>;
export type ToolSpec = { fields: Field[]; units: (v: Values) => number; inspire?: boolean };

// Standard social-media sizes (Instagram / TikTok / Snapchat / X / YouTube).
const aspect: Field = {
  type: "choice", name: "aspect", label: "المقاس", default: "4:5",
  options: [
    { value: "4:5", label: "بوست طولي 4:5 (1080×1350)" },
    { value: "1:1", label: "بوست مربع 1:1 (1080×1080)" },
    { value: "9:16", label: "ستوري 9:16 (1080×1920)" },
    { value: "16:9", label: "عريض 16:9 (1920×1080)" },
  ],
};
const carouselAspect: Field = {
  type: "choice", name: "aspect", label: "المقاس", default: "4:5",
  options: [{ value: "4:5", label: "طولي 4:5 (1080×1350)" }, { value: "1:1", label: "مربع 1:1 (1080×1080)" }],
};
const videoAspect: Field = {
  type: "choice", name: "aspect", label: "المقاس", default: "9:16",
  options: [
    { value: "9:16", label: "ريلز / تيك توك 9:16 (1080×1920)" },
    { value: "1:1", label: "مربع 1:1 (1080×1080)" },
    { value: "16:9", label: "يوتيوب عريض 16:9 (1920×1080)" },
  ],
};
const dialects: Option[] = [
  { value: "kuwaiti", label: "كويتي" }, { value: "saudi", label: "سعودي" }, { value: "emirati", label: "إماراتي" },
  { value: "qatari", label: "قطري" }, { value: "bahraini", label: "بحريني" }, { value: "omani", label: "عماني" },
  { value: "egyptian", label: "مصري" }, { value: "levantine", label: "شامي" }, { value: "iraqi", label: "عراقي" },
  { value: "maghrebi", label: "مغربي" }, { value: "msa", label: "فصحى" },
];
const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || d);

export const toolSpecs: Record<string, ToolSpec> = {
  image: {
    inspire: true,
    fields: [
      { type: "text", name: "prompt", label: "صف الصورة أو التعديل اللي تبيه", required: true, max: 1500, placeholder: "مثال: كوب قهوة عربية على طاولة خشب، إضاءة صباحية دافئة" },
      { type: "files", name: "images", label: "صورة للتعديل (اختياري)", accept: "image", max: 4, hint: "إذا رفعت صورة، يعدّل شاهين عليها بدل ما يبدأ من الصفر." },
      aspect,
      { type: "count", name: "count", label: "عدد الصور", min: 1, max: 4, default: 2 },
    ],
    units: (v) => n(v.count, 1),
  },
  carousel: {
    inspire: true,
    fields: [
      { type: "text", name: "prompt", label: "موضوع الكاروسيل", required: true, max: 1000, rows: 3, placeholder: "مثال: 5 نصائح للعناية بالبشرة في الصيف من متجرنا" },
      { type: "count", name: "slides", label: "عدد الشرائح", min: 3, max: 10, default: 5 },
      { type: "choice", name: "dialect", label: "لهجة النص", default: "kuwaiti", options: dialects },
      { type: "files", name: "images", label: "صور منتجك أو شعارك (اختياري)", accept: "image", max: 3 },
      carouselAspect,
    ],
    units: (v) => n(v.slides, 5),
  },
  "product-photo": {
    fields: [
      { type: "files", name: "images", label: "صورة المنتج", accept: "image", min: 1, max: 4, hint: "حتى 4 صور لنفس المنتج من زوايا مختلفة." },
      {
        type: "choice", name: "mood", label: "الأجواء", default: "marble",
        options: [
          { value: "marble", label: "رخام فاخر" }, { value: "studio", label: "استوديو أبيض" }, { value: "nature", label: "طبيعة" },
          { value: "bold", label: "ألوان جريئة" }, { value: "night", label: "ليلي فاخر" }, { value: "desert", label: "رمال ودفء" },
          { value: "lifestyle", label: "مشهد من الحياة اليومية" }, { value: "macro", label: "لقطة مقرّبة" },
        ],
      },
      { type: "line", name: "extra", label: "لمسة إضافية (اختياري)", max: 200, placeholder: "مثال: أضف أوراق نعناع وقطرات ماء" },
      aspect,
      { type: "count", name: "count", label: "عدد الصور", min: 1, max: 4, default: 4 },
    ],
    units: (v) => n(v.count, 1),
  },
  "ad-design": {
    inspire: true,
    fields: [
      { type: "line", name: "product", label: "اسم المنتج أو الخدمة", required: true, max: 100 },
      { type: "text", name: "prompt", label: "وصف المنتج أو العرض", required: true, max: 600, rows: 3 },
      { type: "line", name: "audience", label: "الجمهور المستهدف (اختياري)", max: 200 },
      { type: "choice", name: "dialect", label: "لهجة النص", default: "kuwaiti", options: dialects },
      { type: "files", name: "images", label: "صور المنتج (اختياري)", accept: "image", max: 3 },
      aspect,
      { type: "count", name: "count", label: "عدد الإعلانات", min: 1, max: 4, default: 2 },
    ],
    units: (v) => n(v.count, 1),
  },
  "motion-video": {
    inspire: true,
    fields: [
      { type: "text", name: "prompt", label: "صف الفيديو", required: true, max: 1200, placeholder: "مثال: ريلز لعرض الويكند في مطعم مشاوي، حركة كاميرا سينمائية ودخان الشوي" },
      { type: "files", name: "images", label: "صورة البداية (اختياري)", accept: "image", max: 1, hint: "صورة منتجك أو محلك ليبدأ منها الفيديو." },
      { type: "choice", name: "duration", label: "المدة", default: "10", options: [{ value: "5", label: "5 ثوانٍ" }, { value: "10", label: "10 ثوانٍ" }] },
      videoAspect,
    ],
    units: () => 1,
  },
  "avatar-video": {
    fields: [
      { type: "files", name: "images", label: "صورة الشخصية", accept: "image", min: 1, max: 1, hint: "صورة واضحة للوجه من الأمام. استخدم صورتك أو صورة لديك حق استخدامها." },
      { type: "text", name: "script", label: "النص اللي بتقوله الشخصية", required: true, max: 600, rows: 4 },
      { type: "voice", name: "voice", label: "الصوت" },
      { type: "consent", name: "consent", label: "أملك حق استخدام هذه الصورة وأوافق على الشروط." },
    ],
    units: () => 1,
  },
  "video-editing": {
    fields: [
      { type: "files", name: "video", label: "الفيديو الخام", accept: "video", min: 1, max: 1, hint: "MP4 أو MOV حتى 500 ميجا و10 دقائق." },
      { type: "toggle", name: "cut_silence", label: "قص الأجزاء الصامتة", default: true },
      { type: "toggle", name: "captions", label: "ترجمة عربية مكتوبة على الفيديو", default: true },
      { type: "choice", name: "aspect", label: "المقاس النهائي", default: "9:16", options: [{ value: "9:16", label: "ريلز / تيك توك 9:16 (1080×1920)" }, { value: "1:1", label: "مربع 1:1 (1080×1080)" }, { value: "16:9", label: "يوتيوب عريض 16:9 (1920×1080)" }, { value: "original", label: "كما هو" }] },
      { type: "choice", name: "target", label: "مدة الفيديو النهائي", default: "60", options: [{ value: "30", label: "30 ثانية" }, { value: "60", label: "دقيقة" }, { value: "90", label: "دقيقة ونص" }, { value: "full", label: "بدون تقصير" }] },
      { type: "line", name: "notes", label: "ملاحظات إضافية (اختياري)", max: 300 },
    ],
    // duration_seconds is read from the file in the browser; the worker re-checks it.
    units: (v) => Math.max(1, Math.ceil(n(v.duration_seconds, 60) / 60)),
  },
  voice: {
    fields: [
      { type: "text", name: "text", label: "النص", required: true, max: 2500, rows: 6 },
      { type: "voice", name: "voice", label: "الصوت" },
      { type: "toggle", name: "clone", label: "استخدم صوتي (استنساخ)", default: false, hint: "ارفع تسجيل لصوتك من 30 ثانية إلى دقيقتين." },
      { type: "files", name: "sample", label: "عينة صوتك", accept: "audio", max: 1 },
      { type: "consent", name: "consent", label: "أملك حق استخدام هذا الصوت وأوافق على الشروط.", showIf: { field: "clone", truthy: true } },
    ],
    units: (v) => Math.max(1, Math.ceil(String(v.text ?? "").length / 500)),
  },
  nasheed: {
    inspire: true,
    fields: [
      { type: "text", name: "prompt", label: "كلمات النشيد أو فكرته", required: true, max: 800, rows: 4 },
      {
        type: "choice", name: "style", label: "النوع", default: "calm",
        options: [{ value: "calm", label: "نشيد هادئ" }, { value: "epic", label: "نشيد حماسي" }, { value: "hum", label: "همهمة خلفية" }, { value: "kids", label: "نشيد أطفال" }, { value: "ramadan", label: "أجواء رمضانية" }],
      },
      { type: "choice", name: "gender", label: "الأصوات", default: "male", options: [{ value: "male", label: "رجالية" }, { value: "female", label: "نسائية" }, { value: "kids", label: "أطفال" }] },
      { type: "choice", name: "duration", label: "المدة", default: "30", options: [{ value: "30", label: "30 ثانية" }, { value: "60", label: "دقيقة" }, { value: "90", label: "دقيقة ونص" }] },
    ],
    units: (v) => Math.max(1, Math.round(n(v.duration, 30) / 30)),
  },
};

export function defaultValues(spec: ToolSpec): Values {
  const v: Values = {};
  for (const f of spec.fields) {
    if (f.type === "choice") v[f.name] = f.default;
    else if (f.type === "count") v[f.name] = f.default;
    else if (f.type === "toggle") v[f.name] = f.default;
    else if (f.type === "files") v[f.name] = [];
    else if (f.type === "consent") v[f.name] = false;
    else v[f.name] = "";
  }
  return v;
}

/** Server-side validation. Returns an Arabic error message or null. */
export function validate(spec: ToolSpec, v: Values): string | null {
  for (const f of spec.fields) {
    const val = v[f.name];
    if ((f.type === "text" || f.type === "line")) {
      const s = typeof val === "string" ? val.trim() : "";
      if (f.required && !s) return `«${f.label}» مطلوب.`;
      if (f.max && s.length > f.max) return `«${f.label}» أطول من المسموح.`;
    }
    if (f.type === "files") {
      const arr = Array.isArray(val) ? val : [];
      if (arr.some((p) => typeof p !== "string")) return "ملفات غير صالحة.";
      if (f.min && arr.length < f.min) return `ارفع «${f.label}».`;
      if (arr.length > f.max) return `عدد الملفات في «${f.label}» أكثر من المسموح.`;
    }
    if (f.type === "choice" && !f.options.some((o) => o.value === val)) return `اختر «${f.label}».`;
    if (f.type === "count") {
      const c = Number(val);
      if (!Number.isInteger(c) || c < f.min || c > f.max) return `«${f.label}» غير صالح.`;
    }
    if (f.type === "consent") {
      const needed = !f.showIf || Boolean(v[f.showIf.field]);
      if (needed && val !== true) return "لازم توافق على حق الاستخدام.";
    }
  }
  return null;
}
