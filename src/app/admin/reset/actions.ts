"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { deleteUserCompletely, emptyFolder } from "@/lib/server/deleteUser";
import { COUNTERS, counterResets, type Counter } from "@/lib/server/overviewReset";
import { RESET_PHRASE, isResetPhrase } from "./phrase";
import { CHANGELOG } from "@/lib/changelog";
import { getL, serverT } from "@/lib/server/lang";
import { audit } from "@/lib/server/audit";

type Res = { ok?: string; error?: string } | undefined;

/** «تصفير المنصة»: every box is independent. Plans, tools, prices, site content and admin accounts always stay. */
export async function resetPlatform(_prev: Res, form: FormData): Promise<Res> {
  const T = await serverT();
  const L = await getL();
  const me = await requireAdmin("reset");
  if (!me) return { error: L("غير مصرّح") };
  const on = (k: string) => form.get(k) === "on";
  const counters = (Object.keys(COUNTERS) as Counter[]).filter((k) => on(`c_${k}`));
  const want = { history: on("history"), balances: on("balances"), jobs: on("jobs"), customers: on("customers"), leads: on("leads"), notes: on("notes"), changelog: on("changelog") };
  if (!counters.length && !Object.values(want).some(Boolean)) return { error: L("اختر شي واحد على الأقل تصفّره.") };
  if (!isResetPhrase(String(form.get("confirm") ?? "")) || form.get("sure") !== "on") return { error: T(`علّم مربع «أفهم» واكتب «${RESET_PHRASE}» بالضبط.`, `Tick «I understand» and type «RESET PLATFORM» exactly.`) };

  const admin = createAdminClient();
  const done: string[] = [];
  let failed = 0;

  // Dashboard cards: start counting again from now. Nothing is deleted.
  if (counters.length) {
    const now = new Date().toISOString();
    const value = { ...(await counterResets()), ...Object.fromEntries(counters.map((k) => [k, now])) };
    await admin.from("site_content").upsert({ key: "overview_reset", value, updated_at: now });
    done.push(T(`تصفّر: ${counters.map((k) => COUNTERS[k]).join("، ")}`, `Reset: ${counters.map((k) => L(COUNTERS[k])).join(", ")}`));
  }

  if (want.customers) {
    const { data: people } = await admin.from("profiles").select("id,role,stripe_customer_id").eq("role", "user");
    let n = 0;
    for (const c of people ?? []) {
      if ((await deleteUserCompletely(c)).error) failed++;
      else n++;
    }
    done.push(T(`انحذف ${n} حساب عميل`, `${n} customer accounts deleted`));
  }

  if (want.jobs) {
    const { data: left } = await admin.from("profiles").select("id");
    await admin.from("credit_ledger").update({ job_id: null }).not("job_id", "is", null);
    await admin.from("jobs").delete().not("id", "is", null);
    await Promise.all((left ?? []).flatMap((p) => [emptyFolder("uploads", p.id), emptyFolder("results", p.id)])).catch(() => {});
    done.push(L("انحذفت كل الأعمال والملفات"));
  }

  // Balances first, so the zeroing itself is recorded (unless the history is being wiped too).
  if (want.balances) {
    const { data: holders } = await admin.from("profiles").select("id,credits").gt("credits", 0);
    const stamp = `admin-reset:${me.id}:${Date.now()}`;
    if (holders?.length) {
      await admin.from("credit_ledger").insert(holders.map((h) => ({ user_id: h.id, amount: -h.credits, reason: "renewal_reset", ref: stamp })));
      await admin.from("profiles").update({ credits: 0 }).gt("credits", 0);
    }
    done.push(T(`تصفّرت أرصدة ${holders?.length ?? 0} حساب`, `Balances reset for ${holders?.length ?? 0} accounts`));
  }

  if (want.history) {
    await admin.from("credit_ledger").delete().not("id", "is", null);
    done.push(L("انمسح سجل حركات الريش (الأرصدة مثل ما هي)"));
  }

  if (want.leads) {
    await admin.from("leads").delete().not("id", "is", null);
    done.push(L("انحذفت طلبات الإدارة الكاملة"));
  }

  if (want.notes) {
    await admin.from("notifications").delete().not("id", "is", null).then(() => null, () => null);
    done.push(L("انحذفت كل الإشعارات"));
  }

  if (want.changelog) {
    await admin.from("site_content").upsert({ key: "changelog_cleared", value: { versions: CHANGELOG.map((c) => c.version) }, updated_at: new Date().toISOString() });
    done.push(L("انمسحت قائمة آخر التعديلات"));
  }

  revalidatePath("/", "layout");
  const msg = done.join(" · ") + ".";
  await audit(me, "platform_reset", undefined, msg.slice(0, 300));
  return failed ? { error: T(`${msg} بس فشل حذف ${failed} حساب، اضغط مرة ثانية لإكمالهم.`, `${msg} but ${failed} accounts failed to delete — press again to finish them.`) } : { ok: T(`تمّ: ${msg}`, `Done: ${msg}`) };
}
