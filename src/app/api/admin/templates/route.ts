import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiJson } from "@/lib/providers/text";
import { SYSTEM, type Plan } from "@/lib/server/motionPlan";
import { illustrate } from "@/lib/server/illustrate";
import { ILLUS_STYLES } from "@/remotion/styles";
import { TEMPLATE_IDEAS, type Skeleton } from "@/lib/templates";
import { trendsFor } from "@/lib/server/trends";

export const maxDuration = 300;

const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined);

/** Moves a picture from the private results bucket to the public site bucket (template thumbnails). */
async function publish(path: string, id: string) {
  const admin = createAdminClient();
  const { data } = await admin.storage.from("results").download(path);
  if (!data) return null;
  const type = data.type || "image/jpeg";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const to = `templates/${id}.${ext}`;
  const { error } = await admin.storage.from("site").upload(to, data, { contentType: type, upsert: true });
  return error ? null : admin.storage.from("site").getPublicUrl(to).data.publicUrl;
}

/**
 * Admin → template library.
 *  { style, idea }   : Shaheen plans a new template (structure + colors + font) for that style and draws its cover.
 *  { jobId, style, title } : saves a video the admin made in the studio as a template.
 */
export async function POST(req: Request) {
  const user = await requireAdmin("gallery");
  if (!user) return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { style?: string; idea?: number; jobId?: string; title?: string };
  const style = ILLUS_STYLES.some((x) => x[0] === b.style) ? String(b.style) : null;
  if (!style) return NextResponse.json({ error: "اختر ستايل." }, { status: 400 });
  const admin = createAdminClient();
  const id = crypto.randomUUID();

  try {
    if (b.jobId) {
      const { data: job } = await admin.from("jobs").select("id,user_id,tool_id,title,input").eq("id", b.jobId).maybeSingle();
      const spec = (job?.input as { spec?: Record<string, unknown>; seconds?: number; aspect?: string } | null)?.spec as
        | { graphics?: { kind: string; at: number; dur: number; img?: string }[]; font?: string; colors?: { accent?: string; bg?: string }; board?: string; aspect?: string; segments?: { e: number }[] }
        | undefined;
      if (!job || job.tool_id !== "motion-video" || !spec?.graphics?.length) return NextResponse.json({ error: "هذا مو فيديو موشن جاهز. افتح الفيديو من أعمالك وانسخ رقمه." }, { status: 400 });
      const gs = [...spec.graphics].sort((a, b2) => a.at - b2.at);
      const sk: Skeleton = { scenes: gs.map((g) => ({ kind: g.kind, dur: Math.round(g.dur * 10) / 10 })), colors: spec.colors, font: spec.font, board: spec.board, illus: style };
      const seconds = Math.round(gs.reduce((a, g) => a + g.dur, 0)) || 30;
      const cover = gs.find((g) => g.kind === "scene" && g.img)?.img;
      const thumb = cover ? await publish(cover, id) : null;
      const { error } = await admin.from("video_templates").insert({ id, style, title: String(b.title || job.title || "قالب").slice(0, 80), scenario: String(job.title ?? "").slice(0, 300), seconds, aspect: spec.aspect ?? "9:16", skeleton: sk, thumb_url: thumb, source: "saved" });
      if (error) throw error;
      return NextResponse.json({ ok: true, id });
    }

    const pick = TEMPLATE_IDEAS[Number(b.idea)];
    if (!pick) return NextResponse.json({ error: "فكرة غير معروفة." }, { status: 400 });
    // one new template: the planner builds a 30s ad with this style, without voice (the customer decides on voice later)
    const ask = `فكرة الفيديو:\n${pick.idea}\n\nاللغة: لهجة كويتية بيضاء واضحة\nالمدة: 30 ثانية تقريباً (${Math.round(30 / 3.5)} مشاهد تقريباً، بدون صوت).\nستايل الرسومات المطلوب: ${style}\n${await trendsFor(undefined, "motion")}`;
    const hint = `استخدم مشهد scene (رسمة بالذكاء الاصطناعي) من 2 إلى 4 مرات، و prompt يكون بالإنجليزي لرسمة بدون أي نص.`;
    const plan = await aiJson<Plan>(SYSTEM(hint, true, "", false), ask, 9000, { provider: "claude", model: "claude-sonnet-5-5" });
    const lines = (plan.lines ?? []).filter((l) => l.scene && typeof l.scene.kind === "string").slice(0, 20);
    if (lines.length < 4) throw new Error("plan too short");
    const sk: Skeleton = { scenes: lines.map((l) => ({ kind: String(l.scene!.kind), dur: Math.min(6, Math.max(1.5, Number(l.dur) || 3)) })), colors: { accent: hex(plan.colors?.accent), bg: hex(plan.colors?.bg) }, font: plan.font, board: plan.board, illus: style };
    const prompt = String(lines.find((l) => l.scene!.kind === "scene")?.scene?.prompt ?? pick.idea);
    let thumb: string | null = null;
    try { thumb = await publish(await illustrate(user.id, id, prompt, style, "9:16"), id); } catch (e) { console.error("template thumb", e); }
    const seconds = Math.round(sk.scenes.reduce((a, s) => a + s.dur, 0));
    const { error } = await admin.from("video_templates").insert({ id, style, title: pick.title, scenario: pick.idea, seconds, skeleton: sk, thumb_url: thumb, sort_order: Number(b.idea) || 0, source: "auto" });
    if (error) throw error;
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("template", e);
    return NextResponse.json({ error: "تعذّر توليد القالب. جرّب مرة ثانية. (إذا ما اشتغل، تأكد إنك شغّلت ملف SQL v90.)" }, { status: 500 });
  }
}
