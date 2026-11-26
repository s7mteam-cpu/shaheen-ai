"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";

type Res = { ok?: string; error?: string } | undefined;

/** wipes one customer's «تعليماتي» (his instructions, switched-off skills and own skills). He can write new ones afterwards. */
export async function clearMine(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("ai"); if (!me) return { error: "غير مصرّح" };
  const uid = String(form.get("user") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(uid)) return { error: "عميل غير معروف." };
  const admin = createAdminClient();
  const { data } = await admin.from("brand_kits").select("plan_prefs").eq("user_id", uid).maybeSingle();
  if (!data) return { error: "ما لقيت العميل." };
  const next = { ...((data.plan_prefs as Record<string, unknown>) ?? {}) }; delete next.mine;
  const { error } = await admin.from("brand_kits").update({ plan_prefs: next }).eq("user_id", uid);
  if (error) return { error: "ما انمسحت." };
  await audit(me, "ai_mine_clear", { id: uid }, "مسح تعليمات العميل");
  revalidatePath("/admin/ai/team/customers");
  return { ok: "انمسحت ✓" };
}
