"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { deleteUserCompletely } from "@/lib/server/deleteUser";

type Res = { ok?: string; error?: string } | undefined;
const MAX = 100;   // per press (each account also removes its files and its sign-in)

/**
 * Deletes chosen accounts that never subscribed (no subscription ever, no payment ever).
 * Their trial record stays, so the same number / email / device can't take another trial.
 */
export async function deleteUnsubscribed(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("customers");
  if (!me) return { error: "غير مصرّح" };
  const ids = [...new Set(form.getAll("id").map(String))].filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, MAX);
  if (!ids.length) return { error: "علّم على العملاء اللي تبي تحذفهم أول." };
  if (form.get("sure") !== "on") return { error: "علّم مربع التأكيد." };
  const admin = createAdminClient();
  // re-check on the server: only customers with no subscription and no payment, ever
  const [{ data: people }, { data: subs }, { data: paid }] = await Promise.all([
    admin.from("profiles").select("id,role,stripe_customer_id").in("id", ids).eq("role", "user"),
    admin.from("subscriptions").select("user_id").in("user_id", ids),
    admin.from("income").select("customer_id").in("customer_id", ids),
  ]);
  const keep = new Set([...(subs ?? []).map((x) => x.user_id), ...(paid ?? []).map((x) => x.customer_id)]);
  let n = 0, failed = 0;
  for (const p of people ?? []) {
    if (keep.has(p.id)) continue;
    if ((await deleteUserCompletely(p)).error) failed++; else n++;
  }
  await audit(me, "unsubscribed_deleted", undefined, `انحذف ${n} حساب بدون اشتراك`);
  revalidatePath("/admin/customers/unsubscribed"); revalidatePath("/admin/customers");
  return failed ? { error: `انحذف ${n}، وفشل ${failed}. اضغط مرة ثانية لإكمالهم.` } : { ok: `انحذف ${n} حساب ✓ وسجل تجاربهم يظل محفوظ، فما يقدرون ياخذون تجربة ثانية.` };
}
