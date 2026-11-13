"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { approveTransfer, rejectTransfer } from "@/lib/server/transfers";
import { COUNTRIES } from "@/lib/countries";

type Res = { ok?: string; error?: string } | undefined;
const done = () => { revalidatePath("/admin/transfers"); revalidatePath("/admin/finance"); };

export async function approve(id: string): Promise<Res> {
  const me = await requireAdmin("transfers");
  if (!me) return { error: "غير مصرّح" };
  const r = await approveTransfer(id, me.email ?? null);
  if (r.error) return { error: r.error };
  await audit(me, "transfer_approved", undefined, id);
  done();
  return { ok: "انقبل التحويل ✓ تفعّل الاشتراك وانسجلت الدفعة بالمالية." };
}

export async function reject(id: string, _p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("transfers");
  if (!me) return { error: "غير مصرّح" };
  const reason = String(form.get("reason") ?? "").trim().slice(0, 300);
  if (reason.length < 3) return { error: "اكتب سبب الرفض علشان يوصل للعميل." };
  const r = await rejectTransfer(id, me.email ?? null, reason);
  if (r.error) return { error: r.error };
  await audit(me, "transfer_rejected", undefined, `${id}: ${reason}`);
  done();
  return { ok: "انرفض التحويل، ووصل العميل إشعار بالسبب." };
}

/** Add or edit a transfer method (name, account details, countries, on/off). */
export async function saveMethod(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("transfers");
  if (!me) return { error: "غير مصرّح" };
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const details = String(form.get("details") ?? "").trim().slice(0, 1000);
  if (name.length < 2) return { error: "اكتب اسم الطريقة." };
  const valid = new Set(COUNTRIES.map((c) => c.code));
  const countries = form.getAll("countries").map(String).filter((c) => valid.has(c));
  const row = { name, details, countries, is_active: form.get("is_active") === "on", sort_order: Number(form.get("sort_order") ?? 0) || 0 };
  if (row.is_active && (details.length < 5 || details.includes("…"))) return { error: "حط بيانات الحساب كاملة (بدال النقاط …) قبل ما تشغّل الطريقة." };
  const admin = createAdminClient();
  const { error } = id ? await admin.from("transfer_methods").update(row).eq("id", id) : await admin.from("transfer_methods").insert(row);
  if (error) return { error: "ما انحفظت. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v80." };
  await audit(me, "transfer_method_saved", undefined, `${name}${row.is_active ? " (مفعّلة)" : " (موقوفة)"}`);
  done();
  return { ok: "انحفظت ✓" };
}

export async function deleteMethod(id: string): Promise<Res> {
  const me = await requireAdmin("transfers");
  if (!me) return { error: "غير مصرّح" };
  const admin = createAdminClient();
  const { data } = await admin.from("transfer_methods").select("name").eq("id", id).maybeSingle();
  await admin.from("transfer_methods").delete().eq("id", id);
  await audit(me, "transfer_method_deleted", undefined, data?.name ?? id);
  done();
  return { ok: "انحذفت. التحويلات القديمة تظل محفوظة باسم الطريقة." };
}

/** Which periods customers may pay at once (1 month is always allowed). */
export async function saveMonths(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("transfers");
  if (!me) return { error: "غير مصرّح" };
  const months = [...new Set([1, ...form.getAll("months").map(Number).filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)])].sort((a, b) => a - b);
  await createAdminClient().from("site_content").upsert({ key: "transfers", value: { months }, updated_at: new Date().toISOString() });
  await audit(me, "transfer_months_saved", undefined, months.join("، "));
  done();
  return { ok: "انحفظت المدد ✓" };
}
