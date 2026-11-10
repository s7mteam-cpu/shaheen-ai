import type { Values } from "@/lib/tools/specs";

export type EditRequest = { instruction?: string; file_index?: number; options?: Record<string, unknown> };
type Parent = { tool_id: string; input: Values; output: { files?: { path: string; type: string }[] } | null };

/** What the customer types / picks when pressing «تعديل», per tool. */
export const editHints: Record<string, { label: string; placeholder: string; textReplaces?: boolean; options?: boolean }> = {
  image: { label: "وش تبي تغيّر في الصورة؟", placeholder: "مثال: خلّ الخلفية أفتح، وأضف ظل خفيف" },
  carousel: { label: "وش تبي تغيّر في هالشريحة؟", placeholder: "مثال: كبّر العنوان وخلّ الخلفية أفتح" },
  "product-photo": { label: "وش تبي تغيّر في الصورة؟", placeholder: "مثال: قرّب على المنتج وغيّر الإضاءة لدافئة" },
  "ad-design": { label: "وش تبي تغيّر في صورة الإعلان؟", placeholder: "مثال: خلّ الألوان ذهبية أكثر" },
  "motion-video": { label: "وش تبي تغيّر في الفيديو؟", placeholder: "مثال: خلّ الحركة أبطأ، والإضاءة ليلية" },
  "avatar-video": { label: "النص الجديد اللي تقوله الشخصية", placeholder: "اكتب النص كامل بعد التعديل", textReplaces: true },
  "video-editing": { label: "غيّر إعدادات المونتاج", placeholder: "", options: true },
  voice: { label: "النص الجديد", placeholder: "اكتب النص كامل بعد التعديل", textReplaces: true },
  nasheed: { label: "وش تبي تغيّر في النشيد؟", placeholder: "مثال: أبطأ وبأصوات أهدأ" },
};

/** Builds the input of the new (edit) job from the original job. Returns an Arabic error string on bad input. */
export function buildEditInput(parent: Parent, req: EditRequest): { input: Values } | { error: string } {
  const v = { ...parent.input };
  const text = (req.instruction ?? "").trim().slice(0, 1200);
  const files = parent.output?.files ?? [];
  const isImageTool = ["image", "carousel", "product-photo", "ad-design"].includes(parent.tool_id);

  if (parent.tool_id === "video-editing") {
    const o = req.options ?? {};
    return { input: { ...v, cut_silence: Boolean(o.cut_silence ?? v.cut_silence), captions: Boolean(o.captions ?? v.captions), aspect: String(o.aspect ?? v.aspect), target: String(o.target ?? v.target ?? "60") } };
  }
  if (!text) return { error: "اكتب التعديل اللي تبيه." };

  if (isImageTool) {
    const f = files[Math.max(0, Math.min(files.length - 1, Number(req.file_index ?? 0)))];
    if (!f) return { error: "ما فيه صورة نعدّل عليها." };
    return { input: { ...v, count: 1, _edit_from: f.path, _edit_text: text } };
  }
  switch (parent.tool_id) {
    case "motion-video": return { input: { ...v, prompt: `${v.prompt}\nالتعديل المطلوب: ${text}` } };
    case "nasheed": return { input: { ...v, prompt: `${v.prompt}\nالتعديل المطلوب: ${text}` } };
    case "avatar-video": return { input: { ...v, script: text } };
    case "voice": return { input: { ...v, text, clone: false, sample: [] } };
  }
  return { error: "التعديل غير متاح لهذه الأداة." };
}
