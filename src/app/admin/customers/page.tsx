import { guardPage, adminAccess } from "@/lib/server/auth";
import Link from "next/link";
import { waLink } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { setUserFlags, deleteCustomerWork, blockCustomer, unblockEmail, impersonate, requestAccess, cancelCustomerSub, resumeCustomerSub } from "./actions";
import { latestAccess } from "@/lib/server/supportAccess";
import { previousClosed, REASON_AR } from "@/lib/server/archive";
import { AUDIT_AR } from "@/lib/server/audit";
import { CreditsForm, DeleteCustomer, DeleteWork, BlockEmail, Impersonate, RequestAccess, CancelSub } from "@/components/admin/CustomerTools";
import { getL, serverT } from "@/lib/server/lang";
import { L } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; id?: string; deleted?: string }> }) {
  const T = await serverT();
  const L = await getL();
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
  const previous = selected ? await previousClosed(selected.email, selected.phone).catch(() => []) : [];
  const auditRes = selected ? await admin.from("admin_audit").select("action,admin_email,note,created_at").eq("target_user", selected.id).order("created_at", { ascending: false }).limit(15) : null;
  const access = selected ? await latestAccess(selected.id) : null;
  const { data: sub } = selected
    ? await admin.from("subscriptions").select("*").eq("user_id", selected.id).in("status", ["active", "trialing", "past_due"]).order("updated_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const SUB_AR: Record<string, string> = { active: L("نشط"), trialing: L("تجريبي"), past_due: L("متأخر الدفع") };
  const accessAr: Record<string, string> = { pending: L("بانتظار موافقة العميل"), approved: L("وافق العميل"), denied: L("رفض العميل"), revoked: L("ملغية"), expired: L("انتهت المدة") };
  const log = auditRes && !auditRes.error ? auditRes.data ?? [] : [];
  const reasonAr: Record<string, string> = { subscription: L("اشتراك"), renewal_reset: L("تصفير التجديد"), spend: L("استخدام"), refund: L("استرجاع"), admin: L("تعديل إداري"), referral: L("دعوة") };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[26px] font-bold text-navy-900">{L("العملاء")}</h1>
        <Link href="/admin/customers/closed" className="btn btn-outline px-4 py-2 text-sm">🔒 {T("الحسابات المغلقة (المحذوفة والمحظورة)", "Closed accounts (deleted & banned)")}</Link>
      </div>
      {deleted && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{L("انحذف حساب العميل وكل بياناته.")}</p>}
      <form className="flex max-w-md gap-2"><label htmlFor="q" className="sr-only">{L("بحث")}</label><input id="q" name="q" defaultValue={q} placeholder={L("ابحث بالاسم أو البريد أو الرقم")} className="field bg-white" /><button className="btn btn-primary px-5">{L("بحث")}</button></form>
      <div className="flex flex-col gap-5 xl:flex-row">
        {/* phones: one card per customer (the wide table hid the «إدارة» button off-screen) */}
        <ul className="flex flex-col gap-2.5 md:hidden">
          {(users ?? []).map((u) => {
            const status = blocked.some((b) => b.email === String(u.email ?? "").toLowerCase()) ? <span className="font-semibold text-red-800">{L("محظور")}</span> : u.is_suspended ? <span className="text-red-700">{L("موقوف")}</span> : u.role === "admin" ? <span className="text-navy-700">{L("مدير")}</span> : u.role === "staff" ? <span className="text-navy-700">{L("فريق")}</span> : L("نشط");
            const on = selected?.id === u.id;
            return (
              <li key={u.id} className={`card flex flex-col gap-2 p-4 text-sm ${on ? "border-2 border-gold-500" : ""}`}>
                <div className="min-w-0"><div className="font-bold text-navy-900">{u.full_name || "—"}</div><div dir="ltr" className="truncate text-right text-xs text-subtle">{u.email}</div></div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                  {u.phone && <a href={waLink(u.phone)} target="_blank" rel="noopener" dir="ltr" className="font-latin font-semibold text-emerald-700">{u.phone}</a>}
                  <span>{L("الباقة")}: {u.plan_id ?? "—"}</span><span>{L("الرصيد")}: <span className="font-latin">{u.credits}</span></span><span>{status}</span>
                </div>
                <Link href={`/admin/customers?id=${u.id}${q ? `&q=${q}` : ""}#manage`} className={`btn py-2.5 text-center text-[14px] ${on ? "btn-gold" : "btn-outline"}`}>{on ? L("✓ مفتوح تحت") : L("إدارة العميل")}</Link>
              </li>
            );
          })}
        </ul>
        <section className="card hidden min-w-0 flex-1 overflow-x-auto p-2 md:block">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3 font-semibold">{L("العميل")}</th><th className="p-3 font-semibold">{L("الواتساب")}</th><th className="p-3 font-semibold">{L("الباقة")}</th><th className="p-3 font-semibold">{L("الرصيد")}</th><th className="p-3 font-semibold">{L("الحالة")}</th><th className="p-3"><span className="sr-only">{L("إدارة")}</span></th></tr></thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-t border-[#EDF1F6]">
                  <td className="p-3"><div className="font-semibold">{u.full_name || "—"}</div><div dir="ltr" className="text-right text-xs text-subtle">{u.email}</div></td>
                  <td className="p-3">{u.phone ? <a href={waLink(u.phone)} target="_blank" rel="noopener" dir="ltr" className="font-latin font-semibold text-emerald-700 hover:underline">{u.phone}</a> : <span className="text-subtle">—</span>}</td>
                  <td className="p-3">{u.plan_id ?? "—"}</td><td className="p-3 font-latin">{u.credits}</td>
                  <td className="p-3">{blocked.some((b) => b.email === String(u.email ?? "").toLowerCase()) ? <span className="font-semibold text-red-800">{L("محظور")}</span> : u.is_suspended ? <span className="text-red-700">{L("موقوف")}</span> : u.role === "admin" ? <span className="text-navy-700">{L("مدير")}</span> : u.role === "staff" ? <span className="text-navy-700">{L("فريق")}</span> : L("نشط")}</td>
                  <td className="p-3"><Link href={`/admin/customers?id=${u.id}${q ? `&q=${q}` : ""}`} className="font-semibold text-navy-700">{L("إدارة")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {selected && (
          <aside id="manage" className="card flex scroll-mt-24 flex-col gap-4 p-5 xl:w-[380px]">
            <h2 className="text-lg font-bold">{selected.full_name || selected.email}</h2>
            {previous.length > 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-[13px] leading-6 text-amber-900">
                <p className="font-bold">⚠️ {T("عنده حساب سابق مغلق بنفس البريد أو الرقم", "Had a closed account with the same email or phone")}</p>
                {previous.map((p) => <Link key={p.id} href={`/admin/customers/log?archived=${p.id}`} className="block font-semibold underline">{T(REASON_AR[p.reason as keyof typeof REASON_AR]?.[0] ?? p.reason, REASON_AR[p.reason as keyof typeof REASON_AR]?.[1] ?? p.reason)} · {new Date(p.closed_at).toLocaleDateString("ar-KW", { timeZone: "Asia/Kuwait" })}{p.note ? ` — ${p.note}` : ""}</Link>)}
              </div>
            )}
            {selected.phone
              ? <a href={waLink(selected.phone, `السلام عليكم ${selected.full_name ?? ""}، معك فريق شاهين.`)} target="_blank" rel="noopener" className="btn bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700">{L("واتساب:")} <span dir="ltr" className="font-latin">{selected.phone}</span></a>
              : <p className="text-sm text-subtle">{L("ما أضاف رقم واتساب للحين (بينطلب منه أول ما يدخل).")}</p>}
            <p className="text-sm text-subtle">{L("الرصيد الحالي:")} <strong className="text-navy-900">{selected.credits} {L("ريشة")}</strong></p>
            <CreditsForm key={selected.id} userId={selected.id} />
            <Link href={`/admin/customers/log?id=${selected.id}`} className="btn btn-outline py-2.5 font-semibold">📜 {T("السجل الكامل (أعماله، رصيده، مدفوعاته، دخوله)", "Full history (work, credits, payments, sign-ins)")}</Link>
            <div className="flex flex-col gap-2 rounded-2xl bg-canvas p-3">
              <p className="text-sm font-bold">{L("الاشتراك")}</p>
              {sub ? (
                <>
                  <p className="text-[13px] leading-6 text-navy-900">
                    {SUB_AR[sub.status] ?? sub.status} · {sub.plan_id ?? "—"}
                    {sub.pay_method && <> · {sub.pay_method === "card" ? T(`بطاقة ${sub.card_label ?? ""}`, `Card ${sub.card_label ?? ""}`) : L("كي نت / رابط شهري")}</>}
                    {sub.current_period_end && <><br />{sub.cancel_at_period_end ? L("ينتهي في") : L("التجديد")}: {new Date(sub.current_period_end).toLocaleDateString("ar-KW")}</>}
                  </p>
                  {sub.cancel_at_period_end
                    ? <form action={resumeCustomerSub}><input type="hidden" name="user_id" value={selected.id} /><button className="btn btn-outline w-full py-2.5 text-sm">{L("رجّع التجديد")}</button></form>
                    : null}
                  <CancelSub key={`c-${selected.id}`} userId={selected.id} action={cancelCustomerSub} />
                </>
              ) : <p className="text-[13px] text-subtle">{L("ما عنده اشتراك شغّال.")}</p>}
            </div>
            <form action={setUserFlags} className="flex gap-2">
              <input type="hidden" name="user_id" value={selected.id} />
              <input type="hidden" name="is_suspended" value={selected.is_suspended ? "false" : "true"} />
              <button className={`btn flex-1 py-2.5 ${selected.is_suspended ? "btn-outline" : "bg-red-50 text-red-800"}`}>{selected.is_suspended ? L("إلغاء الإيقاف") : L("إيقاف الحساب")}</button>
            </form>
            {full && <Link href="/admin/team" className="btn btn-outline py-2.5 text-center">{selected.role === "user" ? L("إضافته لفريق الإدارة") : L("صلاحياته بفريق الإدارة")}</Link>}
            {selected.role === "user" && (
              <div className="flex flex-col gap-2 border-t border-[#EDF1F6] pt-4">
                <div className="flex flex-col gap-2 rounded-2xl bg-canvas p-3">
                  <p className="text-sm font-bold">{L("صلاحية الدخول على حسابه (للدعم)")}</p>
                  {access && <p className="text-[13px] text-subtle">{L("آخر طلب:")} <strong className={access.status === "approved" ? "text-emerald-700" : "text-navy-900"}>{accessAr[access.status] ?? access.status}</strong> — {access.reason}{access.status === "approved" && access.expires_at ? T(` · لحد ${new Date(access.expires_at).toLocaleString("ar-KW")}`, ` · until ${new Date(access.expires_at).toLocaleString("en-GB")}`) : ""}{access.signed_name ? T(` · وقّع: ${access.signed_name}`, ` · signed: ${access.signed_name}`) : ""}</p>}
                  {access?.status === "approved"
                    ? <Impersonate key={`i-${selected.id}`} userId={selected.id} action={impersonate} />
                    : <RequestAccess key={`r-${selected.id}`} userId={selected.id} action={requestAccess} again={!!access} />}
                </div>
                <DeleteWork key={`w-${selected.id}`} userId={selected.id} action={deleteCustomerWork} />
                {isBlocked
                  ? <form action={unblockEmail}><input type="hidden" name="email" value={String(selected.email).toLowerCase()} /><button className="btn btn-outline w-full py-2.5 font-semibold">{L("إلغاء حظر البريد")}</button></form>
                  : <BlockEmail key={`b-${selected.id}`} userId={selected.id} action={blockCustomer} />}
                <DeleteCustomer key={`d-${selected.id}`} userId={selected.id} email={selected.email ?? ""} />
              </div>
            )}
            {log.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-bold">{L("سجل الإدارة على هالحساب")}</h3>
                <ul className="flex flex-col text-[13px]">{log.map((l, i) => <li key={i} className="flex flex-col border-b border-[#EDF1F6] py-1.5"><span className="font-semibold">{L(AUDIT_AR[l.action] ?? l.action)}{l.note ? ` — ${l.note}` : ""}</span><span className="text-subtle">{new Date(l.created_at).toLocaleString("ar-KW")} · <span dir="ltr">{l.admin_email}</span></span></li>)}</ul>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-sm font-bold">{L("آخر حركات الرصيد")}</h3>
              <ul className="flex flex-col text-sm">{(ledger ?? []).map((l, i) => <li key={i} className="flex justify-between border-b border-[#EDF1F6] py-1.5"><span>{reasonAr[l.reason] ?? l.reason}</span><span dir="ltr" className={`font-latin ${l.amount < 0 ? "text-red-700" : "text-emerald-700"}`}>{l.amount > 0 ? "+" : ""}{l.amount}</span></li>)}</ul>
            </div>
          </aside>
        )}
      </div>
      {blocked.length > 0 && (
        <section className="card flex flex-col gap-2 p-5">
          <h2 className="text-lg font-bold">{L("البريدات المحظورة (")}{blocked.length})</h2>
          <ul className="flex flex-col">{blocked.map((b) => (
            <li key={b.email} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDF1F6] py-2 text-sm">
              <span><span dir="ltr" className="font-latin font-semibold">{b.email}</span>{b.reason ? <span className="text-subtle"> — {b.reason}</span> : null}</span>
              <form action={unblockEmail}><input type="hidden" name="email" value={b.email} /><button className="font-semibold text-navy-700 underline">{L("إلغاء الحظر")}</button></form>
            </li>
          ))}</ul>
        </section>
      )}
    </div>
  );
}
