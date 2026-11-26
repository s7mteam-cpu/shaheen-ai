"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { ROLES, PLAYBOOKS, playText, cleanTeam, type RoleId } from "@/lib/team";

type Res = { ok?: string; error?: string } | undefined;

async function load() {
  const admin = createAdminClient();
  const { data } = await admin.from("admin_secrets").select("value").eq("key", "ai_team").maybeSingle();
  return { admin, all: cleanTeam(data?.value) };
}
async function store(admin: ReturnType<typeof createAdminClient>, all: ReturnType<typeof cleanTeam>) {
  all.at = new Date().toISOString();
  return admin.from("admin_secrets").upsert({ key: "ai_team", value: all, updated_at: all.at });
}

/** one team member (role): edit text and switch on/off; empty text = back to the built-in text */
export async function saveRole(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("ai"); if (!me) return { error: "غير مصرّح" };
  const id = String(form.get("id") ?? "") as RoleId;
  if (!ROLES.some((r) => r.id === id)) return { error: "عضو غير معروف." };
  const { admin, all } = await load();
  const text = String(form.get("text") ?? "");
  const next = cleanTeam({ roles: { [id]: { text, on: form.get("on") === "on" } } }).roles?.[id];
  const def = ROLES.find((r) => r.id === id)!.text;
  all.roles = { ...(all.roles ?? {}), [id]: { text: next?.text && next.text !== def ? next.text : undefined, on: next?.on !== false } };
  const { error } = await store(admin, all);
  if (error) return { error: "ما انحفظت." };
  await audit(me, "ai_team_role", undefined, `${id}: ${next?.on === false ? "موقوف" : next?.text && next.text !== def ? "معدّل" : "الأصلي"}`);
  revalidatePath("/admin/ai/team");
  return { ok: "انحفظ ✓ يطبّق على الطلبات الجديدة خلال نص دقيقة." };
}

/** one field's playbook: edit/replace it, switch it off, or go back to the built-in one */
export async function saveField(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("ai"); if (!me) return { error: "غير مصرّح" };
  const id = String(form.get("id") ?? "");
  if (!(id in PLAYBOOKS)) return { error: "مجال غير معروف." };
  const { admin, all } = await load();
  const raw = String(form.get("text") ?? "");
  const same = raw.replace(/\s+/g, " ").trim() === playText(id).replace(/\s+/g, " ").trim(); // untouched built-in text is not stored as an override
  const next = cleanTeam({ fields: { [id]: { text: same ? "" : raw, on: form.get("on") === "on" } } }).fields?.[id];
  const f = { ...(all.fields ?? {}) };
  if (next) f[id] = next; else delete f[id];
  all.fields = f;
  const { error } = await store(admin, all);
  if (error) return { error: "ما انحفظت." };
  await audit(me, "ai_team_field", undefined, `${id}: ${next ? (next.on === false ? "موقوف" : "معدّل") : "الأصلي"}`);
  revalidatePath("/admin/ai/team");
  return { ok: next ? "انحفظ ✓" : "رجع للأصلي ✓" };
}

/** master switch for the whole team */
export async function saveMaster(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("ai"); if (!me) return { error: "غير مصرّح" };
  const { admin, all } = await load();
  all.on = form.get("on") === "on";
  const { error } = await store(admin, all);
  if (error) return { error: "ما انحفظت." };
  await audit(me, "ai_team_master", undefined, all.on ? "شغّال" : "موقوف");
  revalidatePath("/admin/ai/team");
  return { ok: all.on ? "الفريق شغّال ✓" : "الفريق موقوف: الأدوات ترجع لتعليماتها الأصلية." };
}
