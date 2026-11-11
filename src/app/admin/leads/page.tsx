import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setLeadStatus } from "../actions";
import { getL } from "@/lib/server/lang";

export const dynamic = "force-dynamic";
const st = [["new", "جديد"], ["contacted", "تم التواصل"], ["won", "اشترك"], ["closed", "مغلق"]] as const;

export default async function Leads() {
  const L = await getL();
  await guardPage("leads");
  const { data } = await createAdminClient().from("leads").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="text-[26px] font-bold text-navy-900">{L("طلبات الإدارة")}</h1><p className="mt-1 text-sm text-subtle">{L("طلبات باقة إدارة السوشال ميديا اللي وصلت من نموذج الموقع.")}</p></div>
      <section className="card overflow-x-auto p-2">
        <table className="w-full min-w-[720px] text-sm">
          <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3 font-semibold">{L("التاريخ")}</th><th className="p-3 font-semibold">{L("الاسم")}</th><th className="p-3 font-semibold">{L("الجوال")}</th><th className="p-3 font-semibold">{L("الرسالة")}</th><th className="p-3 font-semibold">{L("الحالة")}</th></tr></thead>
          <tbody>
            {(data ?? []).map((l) => (
              <tr key={l.id} className="border-t border-[#EDF1F6] align-top">
                <td className="whitespace-nowrap p-3">{new Date(l.created_at).toLocaleString("ar-KW")}</td>
                <td className="p-3 font-semibold">{l.name}</td>
                <td className="p-3"><a dir="ltr" href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="font-semibold text-navy-700">{l.phone}</a></td>
                <td className="max-w-[320px] p-3 text-muted">{l.message}</td>
                <td className="p-3">
                  <form action={setLeadStatus} className="flex gap-2"><input type="hidden" name="id" value={l.id} />
                    <select name="status" defaultValue={l.status} className="field py-1.5 text-sm">{st.map(([v, t]) => <option key={v} value={v}>{L(t)}</option>)}</select>
                    <button className="btn btn-outline px-3 text-sm">{L("حفظ")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <p className="p-8 text-center text-subtle">{L("ما فيه طلبات للحين.")}</p>}
      </section>
    </div>
  );
}
