"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { MODEL_CATALOG, cleanModelMap, validReplacement } from "@/lib/models";
import { forgetModelMap } from "@/lib/server/models";

type Res = { ok?: string; error?: string } | undefined;

/** Saves the whole «النماذج» list. An empty box (or the built-in name) means «use the built-in model». */
export async function saveModels(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("ai");
  if (!me) return { error: "غير مصرّح" };
  const raw: Record<string, string> = {};
  for (const m of MODEL_CATALOG) {
    const v = String(form.get(`m:${m.id}`) ?? "").trim();
    if (!v || v === m.id) continue;
    if (!validReplacement(m.family, v)) return { error: `«${v}» مو اسم نموذج صحيح لنفس مزوّد «${m.id}». الاسم ينكتب بالإنجليزي مثل ما هو بموقع المزوّد، بدون مسافات.` };
    raw[m.id] = v;
  }
  const map = cleanModelMap(raw);
  // «بوست / كاروسيل مبتكر»: its own writer model (empty = follows the general Sonnet choice)
  const post = String(form.get("post_model") ?? "").trim();
  if (post && !validReplacement("claude", post)) return { error: `«${post}» مو اسم نموذج Claude صحيح. الاسم ينكتب بالإنجليزي مثل ما هو بموقع Anthropic، بدون مسافات.` };
  const admin = createAdminClient();
  const { data: before } = await admin.from("site_content").select("value").eq("key", "models").maybeSingle();
  const { error } = await admin.from("site_content").upsert({ key: "models", value: { map, ...(post ? { post } : {}) }, updated_at: new Date().toISOString() });
  if (error) return { error: "ما انحفظت. جرّب مرة ثانية." };
  await admin.from("site_content").delete().eq("key", "models_last_error");
  forgetModelMap();
  const old = cleanModelMap((before?.value as { map?: unknown } | null)?.map);
  const changes = MODEL_CATALOG.filter((m) => (old[m.id] ?? m.id) !== (map[m.id] ?? m.id)).map((m) => `${m.id} → ${map[m.id] ?? "الأصلي"}`);
  const oldPost = String((before?.value as { post?: unknown } | null)?.post ?? "");
  if (oldPost !== post) changes.push(`كاتب البوست المبتكر → ${post || "الأصلي"}`);
  if (changes.length) await audit(me, "models_changed", undefined, changes.join(" | ").slice(0, 400));
  revalidatePath("/admin/ai");
  const n = Object.keys(map).length + (post ? 1 : 0);
  return { ok: n ? `انحفظت ✓ ${n} نموذج مبدّل. الموقع يبدأ يستخدمها خلال نص دقيقة، والعامل (Railway) كذلك.` : "انحفظت ✓ كل النماذج على الأصلي." };
}

/** A tiny real request (a few tokens) to check that a text model name exists on the owner's key BEFORE saving it. */
export async function testModel(family: string, name: string): Promise<{ ok: boolean; note: string }> {
  const me = await requireAdmin("ai");
  if (!me) return { ok: false, note: "غير مصرّح" };
  const v = String(name ?? "").trim();
  try {
    if (family === "claude") {
      if (!validReplacement("claude", v)) return { ok: false, note: "اسم غير صحيح." };
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: AbortSignal.timeout(25_000),
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: v, max_tokens: 8, messages: [{ role: "user", content: "قل: تمام" }] }),
      });
      if (r.ok) return { ok: true, note: "النموذج موجود ويرد ✓" };
      const t = await r.text();
      return { ok: false, note: r.status === 404 || /model/i.test(t) ? "المزوّد ما يعرف هذا الاسم (تأكد من كتابته)." : r.status === 401 ? "مفتاح Anthropic غير صحيح أو ناقص في Vercel." : `ما رد (${r.status}).` };
    }
    if (family === "google") {
      if (!validReplacement("google", v)) return { ok: false, note: "اسم غير صحيح." };
      const key = process.env.GEMINI_API_KEY;
      if (!key) return { ok: false, note: "GEMINI_API_KEY غير موجود في Vercel." };
      // asking Google about the model costs nothing (no generation)
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(v)}`, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(20_000) });
      if (r.ok) return { ok: true, note: "النموذج موجود عند Google ✓ (ما جرّبنا التوليد نفسه)" };
      return { ok: false, note: r.status === 404 ? "Google ما يعرف هذا الاسم." : `ما رد (${r.status}).` };
    }
    return { ok: false, note: "هذا المزوّد ما ينختبر من هنا. احفظ وجرّب الأداة نفسها." };
  } catch { return { ok: false, note: "ما قدرنا نوصل للمزوّد. جرّب بعد شوي." }; }
}
