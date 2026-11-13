"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireFullAdmin } from "@/lib/server/auth";
import { deleteUserCompletely, emptyFolder } from "@/lib/server/deleteUser";
import { backupLink, makeBackup } from "@/lib/server/backup";
import { syncSheets } from "@/lib/server/sheetsSync";
import { serverT } from "@/lib/server/lang";
import { audit } from "@/lib/server/audit";
import { FULL_PHRASE, isFullPhrase } from "./phrase";

type Res = { ok?: string; error?: string; url?: string | null } | undefined;

/**
 * «تصفير كامل» (owner only): the platform as on launch day. A full backup is saved first; if it fails nothing is deleted.
 * Kept: plans, tools, prices, transfer methods, site texts and pictures, settings, legal texts, admin accounts, passwords, the Google Sheets link.
 * Wiped: customers, works, credits, payments, payment attempts and transfers, subscriptions, all finance (cycles, income, expenses,
 * partners, employees), leads, notifications, sign-in log, archive, ban list, price history and the admin log
 * (which then starts again with one line: this reset and its backup's name).
 */
export async function fullReset(_prev: Res, form: FormData): Promise<Res> {
  const T = await serverT();
  const me = await requireFullAdmin();
  if (!me || !(await requireAdmin("reset"))) return { error: T("التصفير الكامل للمالك بس.", "Full reset is for the owner only.") };
  if (form.get("sure") !== "on" || !isFullPhrase(String(form.get("confirm") ?? ""))) {
    return { error: T(`علّم مربع «أفهم» واكتب «${FULL_PHRASE}» بالضبط.`, "Tick «I understand» and type «RESET EVERYTHING» exactly.") };
  }

  // 1) the safety copy first
  const b = await makeBackup("before-full-reset");
  if (b.error || !b.name) return { error: T(`ما قدرنا نسوي النسخة الاحتياطية، فما مسحنا أي شي. ${b.error ?? ""}`, `The backup failed, so nothing was deleted. ${b.error ?? ""}`) };

  const admin = createAdminClient();
  const fails: string[] = [];
  const wipe = async (table: string, pk = "id") => {
    const { error } = await admin.from(table).delete().not(pk, "is", null);
    if (error && !/does not exist|schema cache|Could not find/i.test(error.message)) fails.push(`${table}: ${error.message}`);
  };

  // 2) customers (no archive: these are test accounts), with their files and sign-in accounts
  const { data: people } = await admin.from("profiles").select("id,role,stripe_customer_id").eq("role", "user");
  let gone = 0;
  for (const c of people ?? []) { if ((await deleteUserCompletely(c)).error) fails.push(`عميل ${c.id}`); else gone++; }

  // 3) accounting cycles first: a closed cycle blocks deleting the entries inside it. Their saved reports go too.
  const { data: periods } = await admin.from("finance_periods").select("report_path,reopen_log");
  const reports = (periods ?? []).flatMap((p) => [p.report_path as string | null, ...(((p.reopen_log as { report_path?: string }[] | null) ?? []).map((x) => x.report_path ?? null))]).filter((x): x is string => !!x);
  if (reports.length) await admin.storage.from("results").remove(reports);
  await wipe("finance_periods");

  // 4) finance (children before parents)
  for (const t of ["partner_moves", "partners", "expenses", "employees", "income", "recurring_expenses"]) await wipe(t);

  // 5) payments and activity
  await wipe("tap_charges");
  await wipe("transfers");
  await wipe("trial_claims");   // after the reset, everyone can have a trial again   // the receipts live in each customer's folder and go with it
  await wipe("subscriptions");
  await admin.from("credit_ledger").update({ job_id: null }).not("job_id", "is", null);
  await wipe("jobs");
  const { data: left } = await admin.from("profiles").select("id");
  await Promise.all((left ?? []).flatMap((p) => [emptyFolder("uploads", p.id), emptyFolder("results", p.id)])).catch(() => {});
  await wipe("credit_ledger");
  await admin.from("profiles").update({ credits: 0 }).gt("credits", 0);
  for (const t of ["leads", "notifications", "user_events", "support_access", "price_history", "closed_accounts"]) await wipe(t);
  await wipe("brand_kits", "user_id");
  await wipe("blocked_emails", "email");
  await admin.from("site_content").delete().eq("key", "overview_reset");

  // 6) the admin log starts again, with this reset as its first line
  await wipe("admin_audit");
  await audit(me, "platform_full_reset", undefined, `انحذف ${gone} عميل. نسخة احتياطية قبل التصفير: ${b.name}`);

  after(() => syncSheets("manual").catch(() => null)); // Google Sheets empties too
  revalidatePath("/", "layout");
  const url = await backupLink(b.name);
  if (fails.length) return { error: T(`تمّ أغلب التصفير، بس فيه أشياء ما انحذفت: ${fails.slice(0, 5).join("، ")}. اضغط مرة ثانية لإكمالها.`, `Mostly done, but some items failed: ${fails.slice(0, 5).join(", ")}. Press again to finish.`), url };
  return { ok: T(`تمّ التصفير الكامل ✓ انحذف ${gone} عميل وكل البيانات، والمنصة صارت مثل يوم الإطلاق. ملف Google Sheets بيتصفّر خلال دقيقة.`, `Full reset done ✓ ${gone} customers and all data deleted. Google Sheets will empty within a minute.`), url };
}
