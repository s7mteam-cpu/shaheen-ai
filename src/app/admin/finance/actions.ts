"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { syncClaudeCosts } from "@/lib/server/finance";
import { getL } from "@/lib/server/lang";

type Res = { ok?: string; error?: string } | undefined;
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
  const category = ["fixed", "yearly", "usage", "other"].includes(String(form.get("category"))) ? String(form.get("category")) : "usage";
  const { error } = await createAdminClient().from("expenses").insert({
    vendor, amount, currency: cur(form.get("currency")), category, spent_on: day(form.get("date")),
    note: String(form.get("note") || "").slice(0, 300) || null, receipt_path: receipt, created_by: me.id,
  });
  if (error) return { error: L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v27.") };
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
  if (error) return { error: L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v27.") };
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
  if (error) return { error: L("ما قدرت أحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v27.") };
  done();
  return { ok: L("انحفظ الإيراد.") };
}

export async function deleteIncome(form: FormData) {
  if (!(await guard())) return;
  await createAdminClient().from("income").delete().eq("id", String(form.get("id")));
  done();
}

export async function saveRate(form: FormData) {
  if (!(await guard())) return;
  const r = num(form.get("rate"));
  if (r > 0 && r < 2) await createAdminClient().from("site_content").upsert({ key: "finance", value: { usd_kwd: r }, updated_at: new Date().toISOString() });
  done();
}

export async function syncClaude(): Promise<Res> {
  const L = await getL();
  if (!(await guard())) return { error: L("غير مصرّح") };
  const r = await syncClaudeCosts();
  done();
  return r;
}
