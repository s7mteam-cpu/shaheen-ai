import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Skeleton } from "@/lib/templates";

export type TemplateFull = { id: string; style: string; title: string; seconds: number; aspect: string; thumb_url: string | null; skeleton: Skeleton };

export async function loadTemplate(id: unknown): Promise<TemplateFull | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient().from("video_templates").select("id,style,title,seconds,aspect,thumb_url,skeleton").eq("id", id).eq("is_published", true).maybeSingle();
  return data ? (data as TemplateFull) : null;
}

/** What the planner must keep from the template: same scenes, same order, same timing. */
export function templateText(t: TemplateFull) {
  const sc = t.skeleton?.scenes ?? [];
  return `القالب المختار: «${t.title}» بستايل رسومات ${t.style}.\nالتزم ببنية القالب بالضبط: ${sc.length} مشاهد بهذا الترتيب والأنواع والمدد (kind:ثواني): ${sc.map((s) => `${s.kind}:${s.dur}`).join("، ")}.\nغيّر النصوص والأرقام ووصف الرسمات (prompt) لتناسب نشاط العميل ومعلوماته، ولا تغيّر أنواع المشاهد ولا ترتيبها ولا مدتها. ما تنسخ أي نص من القالب لأنه مجرد هيكل.`;
}
