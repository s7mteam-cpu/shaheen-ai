"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { INDUSTRIES } from "@/design/industries";

async function guard() {
  const u = await requireAdmin("templates");
  if (!u) throw new Error("غير مصرّح");
  return u;
}
/** المجالات = معرّفات من قائمة «مجالك» الفعلية فقط (مو كتابة حرّة) */
const fieldIds = (raw: unknown) => [...new Set(String(raw ?? "").split(",").map((x) => x.trim()).filter((x) => INDUSTRIES.some((i) => i.id === x)))];
const refresh = () => revalidatePath("/admin/templates");
const clean = (x: unknown, n: number) => String(x ?? "").replace(/[<>"]/g, "").replace(/\s+/g, " ").trim().slice(0, n);

/** The tool job that makes the conversion (the video worker picks it up like any other job). */
async function queue(templateId: string, userId: string, name: string, mode: "remotion" | "html" | "claude") {
  const admin = createAdminClient();
  await admin.from("jobs").insert({ user_id: userId, tool_id: "free-motion", title: `مكتبة الأساليب: ${name}`.slice(0, 60), status: "queued", progress: 0, input: { kind: "free", mode: "ingest", templateId, ...(mode === "remotion" ? { direct: true } : mode === "html" ? { html: true } : {}) } });
}
/** كود Remotion جاهز (يصدّر Free) يدخل بالرفع المباشر بدون Claude. غير كذا (صفحة HTML مثلًا) يتحوّل بClaude. */
/** HTML أصلي (من جيميناي): نحتفظ به كما هو بدون تحويل، ونعرضه ونسجّله فيديو. */
const looksHtml = (code: string) => /<(!doctype html|html|body|div|svg|style|script)\b/i.test(code) && !/export\s+(const|function)\s+Free\b/.test(code);
const modeOf = (code: string, via: unknown): "remotion" | "html" | "claude" => (via === "claude" ? "claude" : looksReady(code) ? "remotion" : looksHtml(code) ? "html" : "claude");
const looksReady = (code: string) => /export\s+(const|function)\s+Free\b/.test(code) && /from\s*["'](react-)?remotion["']/.test(code);

export async function createTemplate(form: FormData) {
  const me = await guard();
  const name = clean(form.get("name"), 60);
  const tags = fieldIds(form.get("tags"));
  let code = String(form.get("code") ?? "");
  const file = form.get("file");
  if (!code.trim() && file instanceof File && file.size > 0 && file.size < 400_000) code = await file.text();
  code = code.trim(); // الأقواس وأي كلام زائد ينظفها شاهين تلقائيًا
  if (!name || code.length < 200 || code.length > 600_000) return;
  const admin = createAdminClient();
  const { data: row } = await admin.from("free_templates").insert({ name, tags, source_code: code, created_by: me.id }).select("id").single();
  if (row) await queue(row.id, me.id, name, modeOf(code, form.get("via")));
  refresh();
}

export async function approveTemplate(form: FormData) {
  await guard();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await createAdminClient().from("free_templates").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "review");
  refresh();
}

export async function retryTemplate(form: FormData) {
  const me = await guard();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const admin = createAdminClient();
  const { data: t } = await admin.from("free_templates").select("name,source_code").eq("id", id).maybeSingle();
  if (!t) return;
  await admin.from("free_templates").update({ status: "converting", error: null, assets: {}, updated_at: new Date().toISOString() }).eq("id", id);
  await queue(id, me.id, t.name, modeOf(String(t.source_code ?? ""), form.get("via")));
  refresh();
}

export async function deleteTemplate(form: FormData) {
  await guard();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const admin = createAdminClient();
  const { data: t } = await admin.from("free_templates").select("thumb_path").eq("id", id).maybeSingle();
  if (t?.thumb_path) await admin.storage.from("results").remove([t.thumb_path]);
  await admin.from("free_templates").delete().eq("id", id);
  refresh();
}

/** يجهّز المعاينة الحية لقالب (للقوالب اللي ما لها معاينة بعد). العامل يبنيها ويحفظ مسارها داخل assets._preview */
export async function prepareTry(form: FormData) {
  const me = await guard();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const admin = createAdminClient();
  const { data: t } = await admin.from("free_templates").select("name,code").eq("id", id).maybeSingle();
  if (!t?.code) return;
  const { data: busy } = await admin.from("jobs").select("id").eq("tool_id", "free-motion").in("status", ["queued", "running"]).contains("input", { mode: "tplpreview", templateId: id }).limit(1);
  if (!busy?.length) await admin.from("jobs").insert({ user_id: me.id, tool_id: "free-motion", title: `معاينة قالب: ${t.name}`.slice(0, 60), status: "queued", progress: 0, input: { kind: "free", mode: "tplpreview", templateId: id } });
  revalidatePath(`/admin/templates/${id}`);
}

/** يغيّر مهن القالب (الوسوم). نفس الوسوم تطلع كأزرار فلتر بأعلى المكتبة. */
export async function setTags(form: FormData) {
  await guard();
  const id = String(form.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const tags = fieldIds(form.get("tags"));
  await createAdminClient().from("free_templates").update({ tags, updated_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

/** يطلب فيديو MP4 من القالب بالتعديلات الحالية (نصوص/ألوان/خط/مدة). بدون صوت وبدون Claude. */
export async function renderTemplate(id: string, input: { t: Record<string, string>; colors: { bg: string; accent: string; text: string }; font: string; seconds: number; contact: string[]; hex?: Record<string, string> }) {
  const me = await guard();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false };
  const hex = (c: unknown, d: string) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : d);
  const t: Record<string, string> = {};
  for (const [k, v] of Object.entries(input?.t ?? {}).slice(0, 120)) if (/^\w{1,40}$/.test(k)) t[k] = String(v ?? "").slice(0, 300);
  const props = {
    t, font: ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"].includes(input?.font) ? input.font : "Cairo",
    colors: { bg: hex(input?.colors?.bg, "#0B2A4A"), accent: hex(input?.colors?.accent, "#E8B44C"), text: hex(input?.colors?.text, "#FFFFFF") },
    seconds: Math.max(15, Math.min(120, Math.round(Number(input?.seconds) || 35))), contact: (input?.contact ?? []).map((x) => String(x).slice(0, 60)).filter(Boolean).slice(0, 6),
    texts: t, hex: Object.fromEntries(Object.entries(input?.hex ?? {}).filter(([a, b]) => /^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(String(b))).slice(0, 12)),
  };
  const admin = createAdminClient();
  const { data: tpl } = await admin.from("free_templates").select("name,assets").eq("id", id).maybeSingle();
  if (!tpl) return { ok: false };
  const { data: busy } = await admin.from("jobs").select("id").eq("tool_id", "free-motion").in("status", ["queued", "running"]).contains("input", { mode: "tplrender", templateId: id }).limit(1);
  if (busy?.length) return { ok: true };
  await admin.from("free_templates").update({ assets: { ...(tpl.assets ?? {}), _video: null, _videoErr: null } }).eq("id", id);
  await admin.from("jobs").insert({ user_id: me.id, tool_id: "free-motion", title: `فيديو قالب: ${tpl.name}`.slice(0, 60), status: "queued", progress: 0, input: { kind: "free", mode: "tplrender", templateId: id, props } });
  return { ok: true };
}

/** المسار الكامل التجريبي: وصف + مجال ← قالب من المكتبة ← فيديو. للأدمن فقط. */
/** «التجربة الكبرى» (أدمن فقط): Claude يخطط ← Gemini يبني ← شاهين يسجّل. */
export async function startGemini(form: FormData) {
  const me = await guard();
  const idea = String(form.get("idea") ?? "").replace(/\s+/g, " ").trim().slice(0, 1500);
  const seconds = [15, 30, 45, 60].includes(Number(form.get("seconds"))) ? Number(form.get("seconds")) : 30;
  const aspect = ["9:16", "16:9", "1:1", "4:5"].includes(String(form.get("aspect"))) ? String(form.get("aspect")) : "9:16";
  const brand = String(form.get("brand") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (idea.length < 10) return;
  const admin = createAdminClient();
  const { data: busy } = await admin.from("jobs").select("id").eq("tool_id", "free-motion").in("status", ["queued", "running"]).contains("input", { mode: "gemflow" }).limit(1);
  if (!busy?.length) await admin.from("jobs").insert({ user_id: me.id, tool_id: "free-motion", title: "تجربة جيميناي", status: "queued", progress: 0, input: { kind: "free", mode: "gemflow", idea, seconds, aspect, brand, plan: String(form.get("plan")) === "scenes" ? "scenes" : "text" } });
  revalidatePath("/admin/templates/gemini");
}

export async function startFlow(form: FormData) {
  const me = await guard();
  const idea = String(form.get("idea") ?? "").replace(/\s+/g, " ").trim().slice(0, 1500);
  const ind = INDUSTRIES.find((i) => i.id === String(form.get("field") ?? ""));
  if (idea.length < 10 || !ind) return;
  const admin = createAdminClient();
  const { data: busy } = await admin.from("jobs").select("id").eq("tool_id", "free-motion").in("status", ["queued", "running"]).contains("input", { mode: "tplflow" }).limit(1);
  if (!busy?.length) await admin.from("jobs").insert({ user_id: me.id, tool_id: "free-motion", title: `مسار القالب: ${ind.label}`.slice(0, 60), status: "queued", progress: 0, input: { kind: "free", mode: "tplflow", idea, fieldId: ind.id, groupIds: INDUSTRIES.filter((i) => i.group === ind.group).map((i) => i.id) } });
  revalidatePath("/admin/templates/flow");
}
