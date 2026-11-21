/** «النماذج»: every AI model name the platform uses, in one list. The admin can point any of them at a newer model
 *  (site_content key "models": { map: { "<name in code>": "<name to use>" } }) without uploading code. */
export type ModelFamily = "claude" | "google" | "elevenlabs" | "fal";
export type ModelRow = { id: string; family: ModelFamily; use: string; test?: "text" };

export const MODEL_CATALOG: ModelRow[] = [
  { id: "claude-sonnet-5-5", family: "claude", test: "text", use: "التخطيط الثقيل: خطة المونتاج، الدروس والموشن، السيرة الذاتية، العروض، اختيار اللقطات والصور، ومخرج ومراجع «تصميم مبتكر»" },
  { id: "claude-haiku-5-5", family: "claude", test: "text", use: "المهام السريعة: «كلم شاهين»، فحص المحتوى، الترجمة، تجهيز نص الصوت، معرفة المجال، الترندات، النصوص القصيرة" },
  { id: "gemini-4-neon", family: "google", test: "text", use: "كتابة كود «تصميم مبتكر» (النموذج القوي)" },
  { id: "gemini-3.8-flash", family: "google", test: "text", use: "نصوص Gemini السريعة، الترندات، وكود «تصميم مبتكر» (السريع)" },
  { id: "gemini-2.5-pro", family: "google", test: "text", use: "كاتب مشاهد الموشن لما يكون المزوّد Gemini" },
  { id: "gemini-3-pro-image-preview", family: "google", use: "صور Google: الصور، البوست، الكاروسيل، تصوير المنتجات، الإعلانات، رسومات الدروس" },
  { id: "gemini-omni-1.2-flash", family: "google", use: "فيديو Google: فيديو المنتج" },
  { id: "gemini-omni-1.1-flash", family: "google", use: "فيديو Google: لقطات «مشاهد واقعية» بالذكاء الاصطناعي" },
  { id: "gemini-2.5-flash-preview-tts", family: "google", use: "صوت Google (لما يكون مزوّد أداة الصوت Google)" },
  { id: "eleven_v4", family: "elevenlabs", use: "الصوت الأساسي: التعليق الصوتي بكل الأدوات" },
  { id: "eleven_multilingual_v2", family: "elevenlabs", use: "الصوت الاحتياطي لو الأساسي ما اشتغل" },
  { id: "eleven_multilingual_ttv_v2", family: "elevenlabs", use: "تصميم صوت جديد من وصف (الأدمن)" },
  { id: "scribe_v1", family: "elevenlabs", use: "تفريغ كلام الفيديو في المونتاج (العامل)" },
  { id: "scribe_v2", family: "elevenlabs", use: "تفريغ الكلام في الموقع" },
  { id: "fal-ai/nano-banana-2", family: "fal", use: "صور fal: أداة الصور" },
  { id: "fal-ai/nano-banana-pro", family: "fal", use: "صور fal: البوست، الكاروسيل، الإعلانات" },
  { id: "fal-ai/nano-banana-pro/edit", family: "fal", use: "صور fal: تصوير المنتجات والتعديل على صورة" },
  { id: "fal-ai/kling-video/ai-avatar/v2/standard", family: "fal", use: "فيديو المتحدث (أفاتار)" },
  { id: "fal-ai/birefnet/v2", family: "fal", use: "إزالة خلفية الصور في المونتاج" },
];

export const FAMILY_NAME: Record<ModelFamily, string> = { claude: "Claude (Anthropic)", google: "Google (Gemini)", elevenlabs: "ElevenLabs", fal: "fal.ai" };

const FAMILY_RE: Record<ModelFamily, RegExp> = {
  claude: /^claude-[a-z0-9.-]{2,60}$/,
  google: /^(gemini|veo|imagen|lyria)-[a-z0-9.-]{2,60}$/,
  elevenlabs: /^(eleven|scribe)_[a-z0-9_.]{2,60}$/,
  fal: /^fal-ai\/[a-z0-9._/-]{2,90}$/,
};
/** A replacement must be a model name of the SAME provider (a Claude name never goes to Google, and so on). */
export function validReplacement(family: ModelFamily, name: string): boolean {
  return FAMILY_RE[family].test(name) && !name.includes("..") && !name.includes("//");
}
export function familyOf(id: string): ModelFamily | null {
  return MODEL_CATALOG.find((m) => m.id === id)?.family ?? null;
}
/** Keeps only valid entries (known model → valid name of the same provider, and different from the default). */
export function cleanModelMap(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const fam = familyOf(k);
    const name = typeof v === "string" ? v.trim() : "";
    if (fam && name && name !== k && validReplacement(fam, name)) out[k] = name;
  }
  return out;
}
