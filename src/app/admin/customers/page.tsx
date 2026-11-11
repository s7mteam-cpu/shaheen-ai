import { guardPage, adminAccess } from "@/lib/server/auth";
import Link from "next/link";
import { waLink } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { setUserFlags, deleteCustomerWork, blockCustomer, unblockEmail, impersonate, requestAccess, cancelCustomerSub, resumeCustomerSub } from "./actions";
import { latestAccess } from "@/lib/server/supportAccess";
import { AUDIT_AR } from "@/lib/server/audit";
import { CreditsForm, DeleteCustomer, DeleteWork, BlockEmail, Impersonate, RequestAccess, CancelSub } from "@/components/admin/CustomerTools";

export const dynamic = "force-dynamic";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; id?: string; deleted?: string }> }) {
  await guardPage("customers");
  const full = !!(await adminAccess())?.full;
  const { q = "", id, deleted } = await searchParams;
  const admin = createAdminClient();
  let query = admin.from("profiles").select("id,full_name,email,phone,credits,plan_id,role,is_suspended,created_at").order("created_at", { ascending: false }).limit(50);
  if (q) { const k = q.replace(/[%,()]/g, ""); query = query.or(`email.ilike.%${k}%,full_name.ilike.%${k}%,phone.ilike.%${k.replace(/\D/g, "") || k}%`); }
  const { data: users } = await query;
  const selected = id ? users?.find((u) => u.id === id) ?? (await admin.from("profiles").select("*").eq("id", id).single()).data : null;
  const { data: ledger } = selected ? await admin.from("credit_ledger").select("amount,reason,created_at,ref").eq("user_id", selected.id).order("created_at", { ascending: false }).limit(20) : { data: null };
  const blockedRes = await admin.from("blocked_emails").select("email,reason,created_at").order("created_at", { ascending: false }).limit(100);
  const blocked = blockedRes.error ? [] : blockedRes.data ?? [];
  const isBlocked = !!selected?.email && blocked.some((b) => b.email === String(selected.email).toLowerCase());
  const auditRes = selected ? await admin.from("admin_audit").select("action,admin_email,note,created_at").eq("target_user", selected.id).order("created_at", { ascending: false }).limit(15) : null;
  const access = selected ? await latestAccess(selected.id) : null;
  const { data: sub } = selected
    ? await admin.from("subscriptions").select("*").eq("user_id", selected.id).in("status", ["active", "trialing", "past_due"]).order("updated_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const SUB_AR: Record<string, string> = { active: "نشط", trialing: "تجريبي", past_due: "متأخر الدفع" };
  const accessAr: Record<string, string> = { pending: "بانتظار موافقة العميل", approved: "وافق العميل", denied: "رفض العميل", revoked: "ملغية", expired: "انتهت المدة" };
  const log = auditRes && !auditRes.error ? auditRes.data ?? [] : [];
  const reasonAr: Record<string, string> = { subscription: "اشتراك", renewal_reset: "تصفير التجديد", spend: "استخدام", refund: "استرجاع", admin: "تعديل إداري", referral: "دعوة" };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-bold text-navy-900">العملاء</h1>
      {deleted && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">انحذف حساب العميل وكل بياناته.</p>}
      <form className="flex max-w-md gap-2"><label htmlFor="q" className="sr-only">بحث</label><input id="q" name="q" defaultValue={q} placeholder="ابحث بالاسم أو البريد أو الرقم" className="field bg-white" /><button className="btn btn-primary px-5">بحث</button></form>
      <div className="flex flex-col gap-5 xl:flex-row">
        <section className="card min-w-0 flex-1 overflow-x-auto p-2">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3 font-semibold">العميل</th><th className="p-3 font-semibold">الواتساب</th><th className="p-3 font-semibold">الباقة</th><th className="p-3 font-semibold">الرصيد</th><th className="p-3 font-semibold">الحالة</th><th className="p-3"><span className="sr-only">إدارة</span></th></tr></thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-t border-[#EDF1F6]">
                  <td className="p-3"><div className="font-semibold">{u.full_name || "—"}</div><div dir="ltr" className="text-right text-xs text-subtle">{u.email}</div></td>
                  <td className="p-3">{u.phone ? <a href={waLink(u.phone)} target="_blank" rel="noopener" dir="ltr" className="font-latin font-semibold text-emerald-700 hover:underline">{u.phone}</a> : <span className="text-subtle">—</span>}</td>
                  <td className="p-3">{u.plan_id ?? "—"}</td><td className="p-3 font-latin">{u.credits}</td>
                  <td className="p-3">{blocked.some((b) => b.email === String(u.email ?? "").toLowerCase()) ? <span className="font-semibold text-red-800">محظور</span> : u.is_suspended ? <span className="text-red-700">موقوف</span> : u.role === "admin" ? <span className="text-navy-700">مدير</span> : u.role === "staff" ? <span className="text-navy-700">فريق</span> : "نشط"}</td>
                  <td className="p-3"><Link href={`/admin/customers?id=${u.id}${q ? `&q=${q}` : ""}`} className="font-semibold text-navy-700">إدارة</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {selected && (
          <aside className="card flex flex-col gap-4 p-5 xl:w-[380px]">
            <h2 className="text-lg font-bold">{selected.full_name || selected.email}</h2>
            {selected.phone
              ? <a href={waLink(selected.phone, `السلام عليكم ${selected.full_name ?? ""}، معك فريق شاهين.`)} target="_blank" rel="noopener" className="btn bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700">واتساب: <span dir="ltr" className="font-latin">{selected.phone}</span></a>
              : <p className="text-sm text-subtle">ما أضاف رقم واتساب للحين (بينطلب منه أول ما يدخل).</p>}
            <p className="text-sm text-subtle">الرصيد الحالي: <strong className="text-navy-900">{selected.credits} ريشة</strong></p>
            <CreditsForm key={selected.id} userId={selected.id} />
            <div className="flex flex-col gap-2 rounded-2xl bg-canvas p-3">
              <p className="text-sm font-bold">الاشتراك</p>
              {sub ? (
                <>
                  <p className="text-[13px] leading-6 text-navy-900">
                    {SUB_AR[sub.status] ?? sub.status} · {sub.plan_id ?? "—"}
                    {sub.pay_method && <> · {sub.pay_method === "card" ? `بطاقة ${sub.card_label ?? ""}` : "كي نت / رابط شهري"}</>}
                    {sub.current_period_end && <><br />{sub.cancel_at_period_end ? "ينتهي في" : "التجديد"}: {new Date(sub.current_period_end).toLocaleDateString("ar-KW")}</>}
                  </p>
                  {sub.cancel_at_period_end
                    ? <form action={resumeCustomerSub}><input type="hidden" name="user_id" value={selected.id} /><button className="btn btn-outline w-full py-2.5 text-sm">رجّع التجديد</button></form>
                    : null}
                  <CancelSub key={`c-${selected.id}`} userId={selected.id} action={cancelCustomerSub} />
                </>
              ) : <p className="text-[13px] text-subtle">ما عنده اشتراك شغّال.</p>}
            </div>
            <form action={setUserFlags} className="flex gap-2">
              <input type="hidden" name="user_id" value={selected.id} />
              <input type="hidden" name="is_suspended" value={selected.is_suspended ? "false" : "true"} />
              <button className={`btn flex-1 py-2.5 ${selected.is_suspended ? "btn-outline" : "bg-red-50 text-red-800"}`}>{selected.is_suspended ? "إلغاء الإيقاف" : "إيقاف الحساب"}</button>
            </form>
            {full && <Link href="/admin/team" className="btn btn-outline py-2.5 text-center">{selected.role === "user" ? "إضافته لفريق الإدارة" : "صلاحياته بفريق الإدارة"}</Link>}
            {selected.role === "user" && (
              <div className="flex flex-col gap-2 border-t border-[#EDF1F6] pt-4">
                <div className="flex flex-col gap-2 rounded-2xl bg-canvas p-3">
                  <p className="text-sm font-bold">صلاحية الدخول على حسابه (للدعم)</p>
                  {access && <p className="text-[13px] text-subtle">آخر طلب: <strong className={access.status === "approved" ? "text-emerald-700" : "text-navy-900"}>{accessAr[access.status] ?? access.status}</strong> — {access.reason}{access.status === "approved" && access.expires_at ? ` · لحد ${new Date(access.expires_at).toLocaleString("ar-KW")}` : ""}{access.signed_name ? ` · وقّع: ${access.signed_name}` : ""}</p>}
                  {access?.status === "approved"
                    ? <Impersonate key={`i-${selected.id}`} userId={selected.id} action={impersonate} />
                    : <RequestAccess key={`r-${selected.id}`} userId={selected.id} action={requestAccess} again={!!access} />}
                </div>
                <DeleteWork key={`w-${selected.id}`} userId={selected.id} action={deleteCustomerWork} />
                {isBlocked
                  ? <form action={unblockEmail}><input type="hidden" name="email" value={String(selected.email).toLowerCase()} /><button className="btn btn-outline w-full py-2.5 font-semibold">إلغاء حظر البريد</button></form>
                  : <BlockEmail key={`b-${selected.id}`} userId={selected.id} action={blockCustomer} />}
                <DeleteCustomer key={`d-${selected.id}`} userId={selected.id} email={selected.email ?? ""} />
              </div>
            )}
            {log.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-bold">سجل الإدارة على هالحساب</h3>
                <ul className="flex flex-col text-[13px]">{log.map((l, i) => <li key={i} className="flex flex-col border-b border-[#EDF1F6] py-1.5"><span className="font-semibold">{AUDIT_AR[l.action] ?? l.action}{l.note ? ` — ${l.note}` : ""}</span><span className="text-subtle">{new Date(l.created_at).toLocaleString("ar-KW")} · <span dir="ltr">{l.admin_email}</span></span></li>)}</ul>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-sm font-bold">آخر حركات الرصيد</h3>
              <ul className="flex flex-col text-sm">{(ledger ?? []).map((l, i) => <li key={i} className="flex justify-between border-b border-[#EDF1F6] py-1.5"><span>{reasonAr[l.reason] ?? l.reason}</span><span dir="ltr" className={`font-latin ${l.amount < 0 ? "text-red-700" : "text-emerald-700"}`}>{l.amount > 0 ? "+" : ""}{l.amount}</span></li>)}</ul>
            </div>
          </aside>
        )}
      </div>
      {blocked.length > 0 && (
        <section className="card flex flex-col gap-2 p-5">
          <h2 className="text-lg font-bold">البريدات المحظورة ({blocked.length})</h2>
          <ul className="flex flex-col">{blocked.map((b) => (
            <li key={b.email} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDF1F6] py-2 text-sm">
              <span><span dir="ltr" className="font-latin font-semibold">{b.email}</span>{b.reason ? <span className="text-subtle"> — {b.reason}</span> : null}</span>
              <form action={unblockEmail}><input type="hidden" name="email" value={b.email} /><button className="font-semibold text-navy-700 underline">إلغاء الحظر</button></form>
            </li>
          ))}</ul>
        </section>
      )}
    </div>
  );
}
