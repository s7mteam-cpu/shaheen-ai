import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { setUserFlags } from "../actions";
import { CreditsForm, DeleteCustomer } from "@/components/admin/CustomerTools";

export const dynamic = "force-dynamic";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; id?: string; deleted?: string }> }) {
  const { q = "", id, deleted } = await searchParams;
  const admin = createAdminClient();
  let query = admin.from("profiles").select("id,full_name,email,phone,credits,plan_id,role,is_suspended,created_at").order("created_at", { ascending: false }).limit(50);
  if (q) query = query.or(`email.ilike.%${q.replace(/[%,()]/g, "")}%,full_name.ilike.%${q.replace(/[%,()]/g, "")}%`);
  const { data: users } = await query;
  const selected = id ? users?.find((u) => u.id === id) ?? (await admin.from("profiles").select("*").eq("id", id).single()).data : null;
  const { data: ledger } = selected ? await admin.from("credit_ledger").select("amount,reason,created_at,ref").eq("user_id", selected.id).order("created_at", { ascending: false }).limit(20) : { data: null };
  const reasonAr: Record<string, string> = { subscription: "اشتراك", renewal_reset: "تصفير التجديد", spend: "استخدام", refund: "استرجاع", admin: "تعديل إداري", referral: "دعوة" };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-bold text-navy-900">العملاء</h1>
      {deleted && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">انحذف حساب العميل وكل بياناته.</p>}
      <form className="flex max-w-md gap-2"><label htmlFor="q" className="sr-only">بحث</label><input id="q" name="q" defaultValue={q} placeholder="ابحث بالاسم أو البريد" className="field bg-white" /><button className="btn btn-primary px-5">بحث</button></form>
      <div className="flex flex-col gap-5 xl:flex-row">
        <section className="card min-w-0 flex-1 overflow-x-auto p-2">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3 font-semibold">العميل</th><th className="p-3 font-semibold">الباقة</th><th className="p-3 font-semibold">الرصيد</th><th className="p-3 font-semibold">الحالة</th><th className="p-3"><span className="sr-only">إدارة</span></th></tr></thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-t border-[#EDF1F6]">
                  <td className="p-3"><div className="font-semibold">{u.full_name || "—"}</div><div dir="ltr" className="text-right text-xs text-subtle">{u.email}</div></td>
                  <td className="p-3">{u.plan_id ?? "—"}</td><td className="p-3 font-latin">{u.credits}</td>
                  <td className="p-3">{u.is_suspended ? <span className="text-red-700">موقوف</span> : u.role === "admin" ? <span className="text-navy-700">مدير</span> : "نشط"}</td>
                  <td className="p-3"><Link href={`/admin/customers?id=${u.id}${q ? `&q=${q}` : ""}`} className="font-semibold text-navy-700">إدارة</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {selected && (
          <aside className="card flex flex-col gap-4 p-5 xl:w-[380px]">
            <h2 className="text-lg font-bold">{selected.full_name || selected.email}</h2>
            <p className="text-sm text-subtle">الرصيد الحالي: <strong className="text-navy-900">{selected.credits} ريشة</strong></p>
            <CreditsForm key={selected.id} userId={selected.id} />
            <form action={setUserFlags} className="flex gap-2">
              <input type="hidden" name="user_id" value={selected.id} />
              <input type="hidden" name="is_suspended" value={selected.is_suspended ? "false" : "true"} />
              <button className={`btn flex-1 py-2.5 ${selected.is_suspended ? "btn-outline" : "bg-red-50 text-red-800"}`}>{selected.is_suspended ? "إلغاء الإيقاف" : "إيقاف الحساب"}</button>
            </form>
            <form action={setUserFlags} className="flex gap-2">
              <input type="hidden" name="user_id" value={selected.id} />
              <input type="hidden" name="role" value={selected.role === "admin" ? "user" : "admin"} />
              <button className="btn btn-outline flex-1 py-2.5">{selected.role === "admin" ? "إزالة صلاحية المدير" : "جعله مديراً"}</button>
            </form>
            {selected.role !== "admin" && <DeleteCustomer key={`d-${selected.id}`} userId={selected.id} email={selected.email ?? ""} />}
            <div>
              <h3 className="mb-2 text-sm font-bold">آخر حركات الرصيد</h3>
              <ul className="flex flex-col text-sm">{(ledger ?? []).map((l, i) => <li key={i} className="flex justify-between border-b border-[#EDF1F6] py-1.5"><span>{reasonAr[l.reason] ?? l.reason}</span><span dir="ltr" className={`font-latin ${l.amount < 0 ? "text-red-700" : "text-emerald-700"}`}>{l.amount > 0 ? "+" : ""}{l.amount}</span></li>)}</ul>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
