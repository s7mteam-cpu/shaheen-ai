/** «الأدوات» is shown to the customer in sections: "new" (a fresh design drawn from scratch every time), "templates" (ready styles to pick and stick to),
 *  and "ai" (voices and AI pictures/videos — neither). The admin can move any tool and edit the two-line texts (site_content key "tool_sections"). */
export const SECTION_IDS = ["new", "templates", "ai"] as const;
export type SectionId = (typeof SECTION_IDS)[number];
export type SectionText = { title: string; desc: string };
export type ToolSections = { map: Record<string, SectionId>; texts: Record<SectionId, SectionText> };

export const SECTION_ICON: Record<SectionId, string> = { new: "✨", templates: "🎨", ai: "🎙️" };
export const SECTION_TEXTS: Record<SectionId, SectionText> = {
  new: { title: "المبتكر", desc: "تصميم جديد يُرسم لك من الصفر حسب وصفك. كل مرة نتيجة مختلفة ما تشبه أحد. (تجريبي، والنتيجة تختلف من مرة لمرة.)" },
  templates: { title: "القوالب الجاهزة", desc: "مئات الستايلات المجرّبة. تختار اللي يعجبك وتلتزم فيه، والنتيجة مضمونة وسريعة." },
  ai: { title: "صوت وصور بالذكاء", desc: "تعليق صوتي بلهجتك، وصور وفيديوهات يولّدها الذكاء الاصطناعي من وصفك أو من صورة منتجك." },
};
const NEW = ["free-post", "free-carousel", "free-motion", "site-free"];
const AI = ["image", "product-photo", "product-video", "real-scenes", "avatar-video", "voice", "nasheed"];

/** where a tool sits when the admin has not placed it */
export function defaultSection(id: string): SectionId { return NEW.includes(id) ? "new" : AI.includes(id) ? "ai" : "templates"; }
export function sectionOf(id: string, s: ToolSections): SectionId { return s.map[id] ?? defaultSection(id); }

export function cleanToolSections(v: unknown): ToolSections {
  const o = (v && typeof v === "object" ? v : {}) as { map?: unknown; texts?: unknown };
  const map: Record<string, SectionId> = {};
  if (o.map && typeof o.map === "object") for (const [k, x] of Object.entries(o.map as Record<string, unknown>).slice(0, 200)) {
    if (/^[a-z0-9-]{1,40}$/.test(k) && (SECTION_IDS as readonly string[]).includes(String(x))) map[k] = x as SectionId;
  }
  const t = (o.texts && typeof o.texts === "object" ? o.texts : {}) as Record<string, { title?: unknown; desc?: unknown }>;
  const txt = (x: unknown, max: number, d: string) => { const s = typeof x === "string" ? x.replace(/[<>]/g, "").trim().slice(0, max) : ""; return s || d; };
  const texts = Object.fromEntries(SECTION_IDS.map((id) => [id, { title: txt(t[id]?.title, 40, SECTION_TEXTS[id].title), desc: txt(t[id]?.desc, 220, SECTION_TEXTS[id].desc) }])) as Record<SectionId, SectionText>;
  return { map, texts };
}
