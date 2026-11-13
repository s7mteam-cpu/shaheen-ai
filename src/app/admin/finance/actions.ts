"use server";
import { recordPriceChanges } from "@/lib/server/priceHistory";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { syncClaudeCosts, CATEGORY, PAY_KIND } from "@/lib/server/finance";
import { audit } from "@/lib/server/audit";
import { requireFullAdmin } from "@/lib/server/auth";
import { periodWorkbook } from "@/lib/server/periodBook";
import { getL } from "@/lib/server/lang";

type Res = { ok?: string; error?: string } | undefined;
const CLOSED_MSG = "هذا التاريخ داخل دورة محاسبية مقفلة، فما يقدر أحد يضيف أو يعدّل أو يحذف فيها. لو لازم، أعد فتح الدورة من «الدورات المحاسبية».";
const done = () => revalidatePath("/admin/finance");
const guard = () => requireAdmin("finance");
const num = (v: FormDataEntryValue | null) => Math.round(Number(String(v ?? "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/,/g, "")) * 1000) / 1000;
const cur = (v: FormDataEntryValue | null) => (v === "KWD" ? "KWD" : "USD");
const day = (v: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : new Date().toISOString().slice(0, 10));

async function saveReceipt(file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || !file.size) return null;
  if (file.size > 3.8 * 1024 * 1024) throw new Error("BIG");
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const path = `finance/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createAdminClient().storage.from("uploads").upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw new Error("UPLOAD");
  return path;
}

export async function addExpense(_prev: Res, form: FormData): Promise<Res> {
  const L = await getL();
  const me = await guard();
  if (!me) return { error: L("غير مصرّح") };
  const vendor = String(form.get("vendor") || "").trim().slice(0, 80);
  const amount = num(form.get("amount"));
  if (!vendor) return { error: L("اكتب اسم الشركة أو الجهة.") };
  if (!(amount > 0)) return { error: L("اكتب المبلغ.") };
  let receipt: string | null = null;
  try { receipt = await saveReceipt(form.get("receipt")); } catch (e) { return { error: (e as Error).message === "BIG" ? L("الفاتورة أكبر من 4 ميجا. صوّرها بدقة أقل أو اضغط الـPDF.") : L("ما قدرت أرفع الفاتورة.") }; }
  const category = String(form.get("category")) in CATEGORY ? String(form.get("category")) : "usage";
  const { error } = await createAdminClient().from("expenses").insert({
    vendor, amount, currency: cur(form.get("currency")), category, spent_on: day(form.get("date")),
    note: String(form.get("note") || "").slice(0, 300) || null, receipt_path: receipt, created_by: me.id,
  });
  if (error) return { error: error.message.includes("period_closed") ? L(CLOSED_MSG) : L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v27.") };
  done();
  return { ok: L("انحفظ المصروف.") };
}

export async function deleteExpense(form: FormData) {
  if (!(await guard())) return;
  await createAdminClient().from("expenses").delete().eq("id", String(form.get("id")));
  done();
}

export async function addRecurring(_prev: Res, form: FormData): Promise<Res> {
  const L = await getL();
  if (!(await guard())) return { error: L("غير مصرّح") };
  const vendor = String(form.get("vendor") || "").trim().slice(0, 80);
  const amount = num(form.get("amount"));
  if (!vendor) return { error: L("اكتب اسم الشركة.") };
  if (!(amount > 0)) return { error: L("اكتب المبلغ.") };
  const yearly = form.get("category") === "yearly";
  const starts = day(form.get("starts_on"));
  const { error } = await createAdminClient().from("recurring_expenses").insert({
    vendor, amount, currency: cur(form.get("currency")), category: yearly ? "yearly" : "fixed",
    day_of_month: Math.min(28, Math.max(1, Number(form.get("day")) || Number(starts.slice(8, 10)) || 1)),
    month_of_year: yearly ? Number(starts.slice(5, 7)) : null, starts_on: starts, note: String(form.get("note") || "").slice(0, 300) || null,
  });
  if (error) return { error: error.message.includes("period_closed") ? L(CLOSED_MSG) : L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v27.") };
  done();
  return { ok: yearly ? L("انحفظ. بينضاف لحاله كل سنة بموعده.") : L("انحفظ. بينضاف لحاله كل شهر.") };
}

export async function toggleRecurring(form: FormData) {
  if (!(await guard())) return;
  await createAdminClient().from("recurring_expenses").update({ is_active: form.get("on") === "1" }).eq("id", String(form.get("id")));
  done();
}

export async function deleteRecurring(form: FormData) {
  if (!(await guard())) return;
  await createAdminClient().from("recurring_expenses").delete().eq("id", String(form.get("id")));
  done();
}

export async function addIncome(_prev: Res, form: FormData): Promise<Res> {
  const L = await getL();
  const me = await guard();
  if (!me) return { error: L("غير مصرّح") };
  const description = String(form.get("description") || "").trim().slice(0, 120);
  const amount = num(form.get("amount"));
  if (!description) return { error: L("اكتب وصف الإيراد (مثلاً: باقة الإدارة الكاملة).") };
  if (!(amount > 0)) return { error: L("اكتب المبلغ.") };
  const { error } = await createAdminClient().from("income").insert({
    description, amount, currency: cur(form.get("currency") ?? "KWD"), received_on: day(form.get("date")),
    customer_name: String(form.get("customer") || "").slice(0, 80) || null, method: String(form.get("method") || "").slice(0, 40) || null,
    note: String(form.get("note") || "").slice(0, 300) || null, created_by: me.id,
  });
  if (error) return { error: error.message.includes("period_closed") ? L(CLOSED_MSG) : L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v27.") };
  done();
  return { ok: L("انحفظ الإيراد.") };
}

export async function deleteIncome(form: FormData) {
  if (!(await guard())) return;
  await createAdminClient().from("income").delete().eq("id", String(form.get("id")));
  done();
}

export async function saveRate(form: FormData) {
  const me = await guard();
  if (!me) return;
  const r = num(form.get("rate"));
  if (r > 0 && r < 2) {
    const { data: before } = await createAdminClient().from("site_content").select("value").eq("key", "finance").maybeSingle();
    await createAdminClient().from("site_content").upsert({ key: "finance", value: { usd_kwd: r }, updated_at: new Date().toISOString() });
    await recordPriceChanges("setting", "usd_kwd", "سعر الدولار", (before?.value as Record<string, unknown>) ?? null, { usd_kwd: r }, me.email);
  }
  done();
}

export async function syncClaude(): Promise<Res> {
  const L = await getL();
  if (!(await guard())) return { error: L("غير مصرّح") };
  const r = await syncClaudeCosts();
  done();
  return r;
}

/* ───────── الشركاء والسحوبات والدورات ───────── */

export async function addPartner(_prev: Res, form: FormData): Promise<Res> {
  const L = await getL();
  const me = await guard();
  if (!me) return { error: L("غير مصرّح") };
  const name = String(form.get("name") || "").trim().slice(0, 80);
  const share = num(form.get("share"));
  if (!name) return { error: L("اكتب اسم الشريك.") };
  if (!(share >= 0 && share <= 100)) return { error: L("النسبة لازم تكون من 0 لين 100.") };
  const { error } = await createAdminClient().from("partners").insert({
    name, share_percent: share, email: String(form.get("email") || "").trim().slice(0, 120) || null, phone: String(form.get("phone") || "").trim().slice(0, 30) || null,
    joined_on: /^\d{4}-\d{2}-\d{2}$/.test(String(form.get("joined_on"))) ? String(form.get("joined_on")) : null, note: String(form.get("note") || "").slice(0, 300) || null,
  });
  if (error) return { error: error.message.includes("period_closed") ? L(CLOSED_MSG) : L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v71.") };
  await audit(me, "partner_add", undefined, `${name} — ${share}%`);
  done();
  return { ok: L("انضاف الشريك.") };
}

export async function savePartner(form: FormData) {
  const me = await guard();
  if (!me) return;
  const id = String(form.get("id"));
  const share = num(form.get("share"));
  if (!(share >= 0 && share <= 100)) return;
  await createAdminClient().from("partners").update({ share_percent: share, is_active: form.get("is_active") === "on" }).eq("id", id);
  await audit(me, "partner_edit", undefined, `${String(form.get("name") ?? "")} — ${share}%`);
  done();
}

export async function addMove(_prev: Res, form: FormData): Promise<Res> {
  const L = await getL();
  const me = await guard();
  if (!me) return { error: L("غير مصرّح") };
  const amount = num(form.get("amount"));
  const kind = form.get("kind") === "capital" ? "capital" : "withdrawal";
  const partner = String(form.get("partner_id") || "");
  if (!partner) return { error: L("اختر الشريك.") };
  if (!(amount > 0)) return { error: L("اكتب المبلغ.") };
  const { error } = await createAdminClient().from("partner_moves").insert({
    partner_id: partner, kind, amount, currency: form.get("currency") === "USD" ? "USD" : "KWD", moved_on: day(form.get("date")),
    note: String(form.get("note") || "").slice(0, 300) || null, created_by: me.email ?? null,
  });
  if (error) return { error: error.message.includes("period_closed") ? L(CLOSED_MSG) : L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v71.") };
  await audit(me, kind === "capital" ? "partner_capital" : "partner_withdrawal", undefined, `${amount} ${form.get("currency") === "USD" ? "$" : "KWD"}`);
  done();
  return { ok: kind === "capital" ? L("انسجّل الإيداع.") : L("انسجّل السحب.") };
}

export async function deleteMove(form: FormData) {
  const me = await guard();
  if (!me) return;
  await createAdminClient().from("partner_moves").delete().eq("id", String(form.get("id")));
  await audit(me, "partner_move_deleted", undefined, String(form.get("label") ?? ""));
  done();
}

export async function addPeriod(_prev: Res, form: FormData): Promise<Res> {
  const L = await getL();
  const me = await guard();
  if (!me) return { error: L("غير مصرّح") };
  const name = String(form.get("name") || "").trim().slice(0, 80);
  const from = String(form.get("from") || ""), to = String(form.get("to") || "");
  if (!name) return { error: L("اكتب اسم الدورة.") };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) return { error: L("تأكد من التاريخين: النهاية لازم تكون بعد البداية.") };
  const { error } = await createAdminClient().from("finance_periods").insert({ name, starts_on: from, ends_on: to, note: String(form.get("note") || "").slice(0, 300) || null });
  if (error) return { error: error.message.includes("period_closed") ? L(CLOSED_MSG) : L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v71.") };
  done();
  return { ok: L("انحفظت الدورة.") };
}

export async function deletePeriod(form: FormData) {
  if (!(await guard())) return;
  await createAdminClient().from("finance_periods").delete().eq("id", String(form.get("id"))).is("closed_at", null); // a closed cycle can't be deleted
  done();
}

const txt = (form: FormData, k: string, n = 120) => String(form.get(k) || "").trim().slice(0, n) || null;
const dateOrNull = (v: FormDataEntryValue | null) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : null);

export async function addEmployee(_prev: Res, form: FormData): Promise<Res> {
  const L = await getL();
  const me = await guard();
  if (!me) return { error: L("غير مصرّح") };
  const name = txt(form, "name", 80);
  if (!name) return { error: L("اكتب اسم الموظف.") };
  const civil = String(form.get("civil_id") || "").replace(/[^0-9]/g, "").slice(0, 12) || null;
  const { error } = await createAdminClient().from("employees").insert({
    name, job_title: txt(form, "job_title", 80), phone: txt(form, "phone", 30), email: txt(form, "email"), address: txt(form, "address", 300), civil_id: civil,
    salary: num(form.get("salary")) || null, salary_currency: form.get("salary_currency") === "USD" ? "USD" : "KWD",
    starts_on: dateOrNull(form.get("starts_on")), note: txt(form, "note", 300),
  });
  if (error) return { error: error.message.includes("period_closed") ? L(CLOSED_MSG) : L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v71.") };
  await audit(me, "employee_add", undefined, name);
  done();
  return { ok: L("انضاف الموظف.") };
}

export async function saveEmployee(form: FormData) {
  const me = await guard();
  if (!me) return;
  const id = String(form.get("id"));
  const active = form.get("is_active") === "on";
  await createAdminClient().from("employees").update({
    job_title: txt(form, "job_title", 80), phone: txt(form, "phone", 30), email: txt(form, "email"), address: txt(form, "address", 300),
    salary: num(form.get("salary")) || null, is_active: active, ends_on: active ? null : dateOrNull(form.get("ends_on")) ?? new Date().toISOString().slice(0, 10),
    ...(String(form.get("civil_id") || "").replace(/[^0-9]/g, "") ? { civil_id: String(form.get("civil_id")).replace(/[^0-9]/g, "").slice(0, 12) } : {}),
  }).eq("id", id);
  await audit(me, "employee_edit", undefined, String(form.get("name") ?? ""));
  done();
}

/** A payment to an employee is a company expense («رواتب ومستحقات»), linked to that employee. */
export async function payEmployee(_prev: Res, form: FormData): Promise<Res> {
  const L = await getL();
  const me = await guard();
  if (!me) return { error: L("غير مصرّح") };
  const id = String(form.get("employee_id") || "");
  const amount = num(form.get("amount"));
  const kind = String(form.get("pay_kind")) in PAY_KIND ? String(form.get("pay_kind")) : "salary";
  if (!id) return { error: L("اختر الموظف.") };
  if (!(amount > 0)) return { error: L("اكتب المبلغ.") };
  const { data: emp } = await createAdminClient().from("employees").select("name").eq("id", id).maybeSingle();
  if (!emp) return { error: L("ما لقيت الموظف.") };
  const { error } = await createAdminClient().from("expenses").insert({
    vendor: emp.name, amount, currency: form.get("currency") === "USD" ? "USD" : "KWD", category: "salaries", spent_on: day(form.get("date")),
    note: [PAY_KIND[kind], txt(form, "note", 250)].filter(Boolean).join(" — "), employee_id: id, pay_kind: kind, created_by: me.id,
  });
  if (error) return { error: error.message.includes("period_closed") ? L(CLOSED_MSG) : L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v71.") };
  await audit(me, "employee_pay", undefined, `${emp.name} — ${amount}`);
  done();
  return { ok: L("انسجّلت الدفعة، وانحسبت من المصاريف.") };
}

/** «إقفال الدورة»: freezes the numbers (no add/edit/delete inside its dates) and keeps a fixed closing report. */
export async function closePeriod(_prev: Res, form: FormData): Promise<Res> {
  const L = await getL();
  const me = await requireFullAdmin();
  if (!me || !(await guard())) return { error: L("إقفال الدورة للمالك بس.") };
  if (form.get("sure") !== "on") return { error: L("علّم على مربع التأكيد أول.") };
  const admin = createAdminClient();
  const { data: p } = await admin.from("finance_periods").select("*").eq("id", String(form.get("id"))).maybeSingle();
  if (!p) return { error: L("ما لقيت الدورة.") };
  if (p.closed_at) return { error: L("الدورة مقفلة من قبل.") };
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Kuwait" });
  if (p.ends_on >= today) return { error: L("ما تقدر تقفل دورة قبل ما تخلص. آخر يوم فيها لازم يكون قبل اليوم.") };
  const at = new Date().toISOString();
  const { wb, report: r } = await periodWorkbook(p.name, p.starts_on, p.ends_on, { at, by: me.email ?? null });
  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const path = `_closed_periods/${p.id}-${at.slice(0, 10)}.xlsx`;
  const up = await admin.storage.from("results").upload(path, buf, { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", upsert: true });
  if (up.error) return { error: L("ما قدرت أحفظ تقرير الإقفال. جرّب مرة ثانية.") };
  const snapshot = {
    rate: r.rate, revenue: r.revenue, expenses: r.spent, net: r.net, margin: r.margin,
    by_category: r.byCategory.map((c) => ({ type: c.label, amount: c.v })),
    partners: r.partners.map((x) => ({ name: x.name, share_percent: Number(x.share_percent), share: x.share, withdrawn: x.withdrawn, remaining: x.remaining, capital: x.capital })),
    employees: r.employees.filter((e) => e.paid > 0).map((e) => ({ name: e.name, paid: e.paid })),
    counts: { income: r.income.length, expenses: r.expenses.length, moves: r.moves.length },
  };
  const { error } = await admin.from("finance_periods").update({ closed_at: at, closed_by: me.email ?? null, snapshot, report_path: path }).eq("id", p.id).is("closed_at", null);
  if (error) { await admin.storage.from("results").remove([path]); return { error: L("ما قدرت أقفل الدورة. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v74.") }; }
  await audit(me, "period_closed", undefined, `${p.name} (${p.starts_on} → ${p.ends_on}) · صافي ${r.net.toFixed(3)} د.ك`);
  done();
  return { ok: L("انقفلت الدورة، وانحفظ تقرير الإقفال.") };
}

/** Re-opening a closed cycle needs a written reason; it is logged, and the old closing report stays. */
export async function reopenPeriod(_prev: Res, form: FormData): Promise<Res> {
  const L = await getL();
  const me = await requireFullAdmin();
  if (!me || !(await guard())) return { error: L("إعادة الفتح للمالك بس.") };
  const reason = String(form.get("reason") || "").trim().slice(0, 300);
  if (reason.length < 5) return { error: L("اكتب سبب إعادة الفتح.") };
  const admin = createAdminClient();
  const { data: p } = await admin.from("finance_periods").select("*").eq("id", String(form.get("id"))).maybeSingle();
  if (!p?.closed_at) return { error: L("الدورة مو مقفلة.") };
  const log = [...((p.reopen_log as unknown[]) ?? []), { at: new Date().toISOString(), by: me.email ?? null, reason, closed_at: p.closed_at, report_path: p.report_path, snapshot: p.snapshot }];
  await admin.from("finance_periods").update({ closed_at: null, closed_by: null, reopen_log: log }).eq("id", p.id);
  await audit(me, "period_reopened", undefined, `${p.name}: ${reason}`);
  done();
  return { ok: L("انفتحت الدورة. تقرير الإقفال القديم محفوظ بالسجل.") };
}
