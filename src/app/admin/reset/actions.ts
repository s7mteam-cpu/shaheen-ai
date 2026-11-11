"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { deleteUserCompletely, emptyFolder } from "@/lib/server/deleteUser";
import { COUNTERS, counterResets, type Counter } from "@/lib/server/overviewReset";
import { RESET_PHRASE } from "./phrase";
import { CHANGELOG } from "@/lib/changelog";

type Res = { ok?: string; error?: string } | undefined;

/** «تصفير المنصة»: every box is independent. Plans, tools, prices, site content and admin accounts always stay. */
export async function resetPlatform(_prev: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin();
  if (!me) return { error: "غير مصرّح" };
  const on = (k: string) => form.get(k) === "on";
  const counters = (Object.keys(COUNTERS) as Counter[]).filter((k) => on(`c_${k}`));
  const want = { history: on("history"), balances: on("balances"), jobs: on("jobs"), customers: on("customers"), leads: on("leads"), notes: on("notes"), changelog: on("changelog") };
  if (!counters.length && !Object.values(want).some(Boolean)) return { error: "اختر شي واحد على الأقل تصفّره." };
  if (String(form.get("confirm") ?? "").trim() !== RESET_PHRASE || form.get("sure") !== "on") return { error: `علّم مربع «أفهم» واكتب «${RESET_PHRASE}» بالضبط.` };

  const admin = createAdminClient();
  const done: string[] = [];
  let failed = 0;

  // Dashboard cards: start counting again from now. Nothing is deleted.
  if (counters.length) {
    const now = new Date().toISOString();
    const value = { ...(await counterResets()), ...Object.fromEntries(counters.map((k) => [k, now])) };
    await admin.from("site_content").upsert({ key: "overview_reset", value, updated_at: now });
    done.push(`تصفّر: ${counters.map((k) => COUNTERS[k]).join("، ")}`);
  }

  if (want.customers) {
    const { data: people } = await admin.from("profiles").select("id,role,stripe_customer_id").neq("role", "admin");
    let n = 0;
    for (const c of people ?? []) {
      if ((await deleteUserCompletely(c)).error) failed++;
      else n++;
    }
    done.push(`انحذف ${n} حساب عميل`);
  }

  if (want.jobs) {
    const { data: left } = await admin.from("profiles").select("id");
    await admin.from("credit_ledger").update({ job_id: null }).not("job_id", "is", null);
    await admin.from("jobs").delete().not("id", "is", null);
    await Promise.all((left ?? []).flatMap((p) => [emptyFolder("uploads", p.id), emptyFolder("results", p.id)])).catch(() => {});
    done.push("انحذفت كل الأعمال والملفات");
  }

  // Balances first, so the zeroing itself is recorded (unless the history is being wiped too).
  if (want.balances) {
    const { data: holders } = await admin.from("profiles").select("id,credits").gt("credits", 0);
    const stamp = `admin-reset:${me.id}:${Date.now()}`;
    if (holders?.length) {
      await admin.from("credit_ledger").insert(holders.map((h) => ({ user_id: h.id, amount: -h.credits, reason: "renewal_reset", ref: stamp })));
      await admin.from("profiles").update({ credits: 0 }).gt("credits", 0);
    }
    done.push(`تصفّرت أرصدة ${holders?.length ?? 0} حساب`);
  }

  if (want.history) {
    await admin.from("credit_ledger").delete().not("id", "is", null);
    done.push("انمسح سجل حركات الريش (الأرصدة مثل ما هي)");
  }

  if (want.leads) {
    await admin.from("leads").delete().not("id", "is", null);
    done.push("انحذفت طلبات الإدارة الكاملة");
  }

  if (want.notes) {
    await admin.from("notifications").delete().not("id", "is", null).then(() => null, () => null);
    done.push("انحذفت كل الإشعارات");
  }

  if (want.changelog) {
    await admin.from("site_content").upsert({ key: "changelog_cleared", value: { versions: CHANGELOG.map((c) => c.version) }, updated_at: new Date().toISOString() });
    done.push("انمسحت قائمة آخر التعديلات");
  }

  revalidatePath("/", "layout");
  const msg = done.join(" · ") + ".";
  return failed ? { error: `${msg} بس فشل حذف ${failed} حساب، اضغط مرة ثانية لإكمالهم.` } : { ok: `تمّ: ${msg}` };
}
