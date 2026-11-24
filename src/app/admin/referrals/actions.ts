"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const RESERVED = new Set(["admin", "app", "api", "login", "signup", "auth", "shaheen", "www", "test", "null", "undefined"]);

/** الإدارة فقط: تغيير كود الدعوة لعميل إلى اسم مخصص (مثل ahmed). العميل نفسه ما يقدر يغيّره (يمنعه trigger في القاعدة). */
export async function setReferralCode(form: FormData): Promise<void> {
  const u = await requireAdmin("referrals");
  if (!u) throw new Error("غير مصرّح");
  const id = String(form.get("id") ?? "");
  const code = String(form.get("code") ?? "").trim().toLowerCase();
  if (!/^[0-9a-f-]{36}$/.test(id)) return;
  if (!/^[a-z0-9][a-z0-9_-]{2,19}$/.test(code) || RESERVED.has(code)) return;
  const admin = createAdminClient();
  const { data: taken } = await admin.from("profiles").select("id").eq("referral_code", code).neq("id", id).maybeSingle();
  if (taken) return;
  await admin.from("profiles").update({ referral_code: code }).eq("id", id);
  revalidatePath("/admin/referrals");
}
