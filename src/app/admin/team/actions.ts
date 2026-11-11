"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFullAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { OWNER_EMAILS, SECTIONS, type SectionKey } from "@/lib/admin/sections";

type Res = { ok?: string; error?: string } | undefined;
const KEYS = SECTIONS.map((s) => s.key) as SectionKey[];
const picked = (form: FormData) => KEYS.filter((k) => form.get(`p_${k}`) === "on");

/** Adds (or updates) a team member by email with the ticked sections. */
export async function saveMember(_prev: Res, form: FormData): Promise<Res> {
  const me = await requireFullAdmin();
  if (!me) return { error: "هالصفحة للمدير الكامل بس." };
  const email = String(form.get("email") || "").trim().toLowerCase();
  const perms = picked(form);
  const full = form.get("full") === "on";
  if (!email.includes("@")) return { error: "اكتب بريد صحيح." };
  if (!full && !perms.length) return { error: "علّم قسم واحد على الأقل، أو «صلاحية كاملة»." };
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("id,email,role").ilike("email", email).maybeSingle();
  if (!p) return { error: "ما في حساب بهالبريد. خلّيه يسجّل بشاهين أول، بعدين ضيفه." };
  if (p.id === me.id) return { error: "ما تقدر تعدّل صلاحياتك أنت." };
  if (OWNER_EMAILS.includes(String(p.email).toLowerCase())) return { error: "هذا حساب المالك، صلاحيته كاملة دائماً." };
  const { error } = await admin.from("profiles").update(full ? { role: "admin", admin_perms: null } : { role: "staff", admin_perms: perms }).eq("id", p.id);
  if (error) return { error: "ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v27." };
  await audit(me, full ? "make_admin" : "team_perms", p, full ? "صلاحية كاملة" : perms.join(", "));
  revalidatePath("/admin/team");
  return { ok: full ? "صار عنده صلاحية كاملة." : `انحفظت الصلاحيات (${perms.length} قسم).` };
}

/** Removes someone from the team: back to a normal customer account. */
export async function removeMember(form: FormData) {
  const me = await requireFullAdmin();
  if (!me) return;
  const id = String(form.get("user_id"));
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("id,email").eq("id", id).maybeSingle();
  if (!p || p.id === me.id || OWNER_EMAILS.includes(String(p.email).toLowerCase())) return;
  await admin.from("profiles").update({ role: "user", admin_perms: null }).eq("id", id);
  await audit(me, "remove_admin", p);
  revalidatePath("/admin/team");
}
