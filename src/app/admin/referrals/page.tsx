import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL } from "@/lib/server/lang";
import { setReferralCode } from "./actions";

export const dynamic = "force-dynamic";

export default async function Referrals() {
  const L = await getL();
  await guardPage("referrals");
  const admin = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { data: invited } = await admin.from("profiles").select("id,referred_by,plan_id,created_at").not("referred_by", "is", null).limit(5000);
  const ids = [...new Set((invited ?? []).map((p) => p.referred_by as string))];
  const [{ data: inviters }, { data: charges }, { data: led }] = await Promise.all([
    ids.length ? admin.from("profiles").select("id,full_name,email,referral_code").in("id", ids) : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null; referral_code: string | null }[] }),
    admin.from("tap_charges").select("user_id,amount").eq("status", "CAPTURED").eq("currency", "KWD").limit(20000),
    admin.from("credit_ledger").select("user_id,amount").eq("reason", "referral").limit(20000),
  ]);
  const paid = new Map<string, number>();
  for (const c of charges ?? []) paid.set(c.user_id as string, (paid.get(c.user_id as string) ?? 0) + Number(c.amount ?? 0));
  const credits = new Map<string, number>();
  for (const l of led ?? []) credits.set(l.user_id as string, (credits.get(l.user_id as string) ?? 0) + Number(l.amount ?? 0));
  const rows = (inviters ?? []).map((i) => {
    const mine = (invited ?? []).filter((p) => p.referred_by === i.id);
    const subs = mine.filter((p) => p.plan_id);
    return { i, n: mine.length, subs: subs.length, kwd: mine.reduce((a, p) => a + (paid.get(p.id as string) ?? 0), 0), cr: credits.get(i.id) ?? 0 };
  }).sort((a, b) => b.subs - a.subs || b.n - a.n);
  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="text-[26px] font-bold text-navy-900">{L("الدعوات")}</h1><p className="mt-1 text-sm text-subtle">{L("كل عميل له رابط دعوة. هنا تشوف من دعا كم واحد، كم اشترك، وكم دفعوا. تغيير الكود (مثل ahmed) من الإدارة فقط.")}</p></div>
      <section className="card overflow-x-auto p-2">
        <table className="w-full min-w-[860px] text-sm">
          <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3 font-semibold">{L("الداعي")}</th><th className="p-3 font-semibold">{L("سجّلوا")}</th><th className="p-3 font-semibold">{L("اشتركوا")}</th><th className="p-3 font-semibold">{L("دفعوا (د.ك)")}</th><th className="p-3 font-semibold">{L("ريش حصل عليها")}</th><th className="p-3 font-semibold">{L("الكود")}</th></tr></thead>
          <tbody>
            {rows.map(({ i, n, subs, kwd, cr }) => (
              <tr key={i.id} className="border-t border-[#EDF1F6] align-top">
                <td className="p-3"><div className="font-semibold">{i.full_name || "—"}</div><div dir="ltr" className="text-xs text-subtle">{i.email}</div></td>
                <td className="p-3 font-latin font-bold">{n}</td>
                <td className="p-3 font-latin font-bold">{subs}</td>
                <td className="p-3 font-latin">{kwd.toFixed(3)}</td>
                <td className="p-3 font-latin">{cr}</td>
                <td className="p-3">
                  <div dir="ltr" className="mb-1.5 text-xs text-subtle">{`${site}/?ref=${i.referral_code}`}</div>
                  <form action={setReferralCode} className="flex gap-2"><input type="hidden" name="id" value={i.id} />
                    <input name="code" dir="ltr" defaultValue={i.referral_code ?? ""} maxLength={20} className="field w-36 py-1.5 text-sm" />
                    <button className="btn btn-outline px-3 text-sm">{L("حفظ")}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-8 text-center text-subtle">{L("ما أحد سجّل عن طريق دعوة للحين.")}</p>}
      </section>
      <p className="text-xs text-subtle">{L("الكود: حروف إنجليزية صغيرة وأرقام و - و _ ، من 3 إلى 20 خانة، وما يتكرر. إذا انرفض الحفظ فالكود مأخوذ أو غير مسموح.")}</p>
    </div>
  );
}
