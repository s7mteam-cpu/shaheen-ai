import { guardPage } from "@/lib/server/auth";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundJob } from "../actions";
import { getL } from "@/lib/server/lang";

export const dynamic = "force-dynamic";
const statusAr: Record<string, string> = { queued: "انتظار", running: "قيد التنفيذ", done: "جاهز", failed: "فشل" };

export default async function Jobs({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const L = await getL();
  await guardPage("jobs");
  const { s = "" } = await searchParams;
  const admin = createAdminClient();
  let q = admin.from("jobs").select("id,tool_id,title,status,error,credits_charged,refunded,created_at,profiles(email)").order("created_at", { ascending: false }).limit(100);
  if (s) q = q.eq("status", s);
  const { data } = await q;
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-bold text-navy-900">{L("الطلبات")}</h1>
      <div className="flex flex-wrap gap-2">{[["", L("الكل")], ["failed", L("الفاشلة")], ["running", L("قيد التنفيذ")], ["queued", L("في الانتظار")], ["done", L("الجاهزة")]].map(([v, l]) => <Link key={v} href={v ? `/admin/jobs?s=${v}` : "/admin/jobs"} aria-pressed={s === v} className="chip">{l}</Link>)}</div>
      <section className="card overflow-x-auto p-2">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3 font-semibold">{L("التاريخ")}</th><th className="p-3 font-semibold">{L("العميل")}</th><th className="p-3 font-semibold">{L("الأداة")}</th><th className="p-3 font-semibold">{L("الحالة")}</th><th className="p-3 font-semibold">{L("الريش")}</th><th className="p-3 font-semibold">{L("الخطأ")}</th><th className="p-3"><span className="sr-only">{L("إجراء")}</span></th></tr></thead>
          <tbody>
            {(data ?? []).map((j) => (
              <tr key={j.id} className="border-t border-[#EDF1F6] align-top">
                <td className="p-3 whitespace-nowrap">{new Date(j.created_at).toLocaleString("ar-KW")}</td>
                <td className="p-3" dir="ltr">{(j.profiles as unknown as { email: string } | null)?.email}</td>
                <td className="p-3">{j.tool_id}</td>
                <td className="p-3">{L(statusAr[j.status] ?? j.status)}{j.refunded ? L(" · مُسترجع") : ""}</td>
                <td className="p-3 font-latin">{j.credits_charged}</td>
                <td className="max-w-[260px] p-3 text-xs text-red-700" dir="ltr">{j.error}</td>
                <td className="p-3">{!j.refunded && j.credits_charged > 0 && j.status !== "done" && (
                  <form action={refundJob}><input type="hidden" name="job_id" value={j.id} /><button className="text-sm font-semibold text-navy-700">{L("استرجاع الريش")}</button></form>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
