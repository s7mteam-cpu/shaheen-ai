"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";

async function guard() {
  const u = await requireAdmin("templates");
  if (!u) throw new Error("غير مصرّح");
  return u;
}
const refresh = () => revalidatePath("/admin/templates");
const clean = (x: unknown, n: number) => String(x ?? "").replace(/[<>"]/g, "").replace(/\s+/g, " ").trim().slice(0, n);

/** The tool job that makes the conversion (the video worker picks it up like any other job). */
async function queue(templateId: string, userId: string, name: string, direct: boolean) {
  const admin = createAdminClient();
  await admin.from("jobs").insert({ user_id: userId, tool_id: "free-motion", title: `مكتبة الأساليب: ${name}`.slice(0, 60), status: "queued", progress: 0, input: { kind: "free", mode: "ingest", templateId, direct } });
}
/** كود Remotion جاهز (يصدّر Free) يدخل بالرفع المباشر بدون Claude. غير كذا (صفحة HTML مثلًا) يتحوّل بClaude. */
const looksReady = (code: string) => /export\s+(const|function)\s+Free\b/.test(code) && /from\s*["'](react-)?remotion["']/.test(code);

export async function createTemplate(form: FormData) {
  const me = await guard();
  const name = clean(form.get("name"), 60);
  const tags = String(form.get("tags") ?? "").split(/[,،]/).map((t) => clean(t, 24)).filter(Boolean).slice(0, 8);
  let code = String(form.get("code") ?? "");
  const file = form.get("file");
  if (!code.trim() && file instanceof File && file.size > 0 && file.size < 400_000) code = await file.text();
  code = code.trim(); // الأقواس وأي كلام زائد ينظفها شاهين تلقائيًا
  if (!name || code.length < 200 || code.length > 200_000) return;
  const admin = createAdminClient();
  const { data: row } = await admin.from("free_templates").insert({ name, tags, source_code: code, created_by: me.id }).select("id").single();
  if (row) await queue(row.id, me.id, name, looksReady(code) && form.get("via") !== "claude");
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
  await admin.from("free_templates").update({ status: "converting", error: null, updated_at: new Date().toISOString() }).eq("id", id);
  await queue(id, me.id, t.name, looksReady(String(t.source_code ?? "")) && form.get("via") !== "claude");
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
