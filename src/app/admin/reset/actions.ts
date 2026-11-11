"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { deleteUserCompletely, emptyFolder } from "@/lib/server/deleteUser";
import { RESET_PHRASE } from "./phrase";

type Res = { ok?: string; error?: string } | undefined;

/** «تصفير المنصة» with choices. Plans, tools, prices, site content and admin accounts always stay. */
export async function resetPlatform(_prev: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin();
  if (!me) return { error: "غير مصرّح" };
  const want = { credits: form.get("credits") === "on", jobs: form.get("jobs") === "on", customers: form.get("customers") === "on", leads: form.get("leads") === "on" };
  if (!Object.values(want).some(Boolean)) return { error: "اختر شي واحد على الأقل تصفّره." };
  if (String(form.get("confirm") ?? "").trim() !== RESET_PHRASE || form.get("sure") !== "on") return { error: `علّم مربع «أفهم» واكتب «${RESET_PHRASE}» بالضبط.` };

  const admin = createAdminClient();
  const done: string[] = [];
  let failed = 0;

  // 1) Customer accounts (and with them everything they own).
  if (want.customers) {
    const { data: people } = await admin.from("profiles").select("id,role,stripe_customer_id").neq("role", "admin");
    let n = 0;
    for (const c of people ?? []) {
      if ((await deleteUserCompletely(c)).error) failed++;
      else n++;
    }
    done.push(`انحذف ${n} حساب عميل`);
  }

  // 2) All work and files, for whoever is left.
  if (want.jobs) {
    const { data: left } = await admin.from("profiles").select("id");
    await admin.from("credit_ledger").update({ job_id: null }).not("job_id", "is", null);
    await admin.from("jobs").delete().not("id", "is", null);
    await Promise.all((left ?? []).flatMap((p) => [emptyFolder("uploads", p.id), emptyFolder("results", p.id)])).catch(() => {});
    done.push("انحذفت كل الأعمال والملفات");
  }

  // 3) Credits in/out: the whole history goes and every balance becomes zero.
  if (want.credits) {
    await admin.from("credit_ledger").delete().not("id", "is", null);
    await admin.from("profiles").update({ credits: 0 }).not("id", "is", null);
    done.push("تصفّرت حركات الريش وكل الأرصدة");
  }

  if (want.leads) {
    await admin.from("leads").delete().not("id", "is", null);
    done.push("انحذفت طلبات الإدارة الكاملة");
  }

  revalidatePath("/", "layout");
  const msg = done.join("، ") + ".";
  return failed ? { error: `${msg} بس فشل حذف ${failed} حساب، اضغط مرة ثانية لإكمالهم.` } : { ok: `تمّ: ${msg}` };
}
