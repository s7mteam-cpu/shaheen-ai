import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL } from "@/lib/server/lang";
import { getRetention, runRetention } from "@/lib/server/retention";
import { saveRetention, runRetentionNow } from "./actions";

export const dynamic = "force-dynamic";

/** «مدة حفظ الملفات»: the results customers make are deleted automatically after N days, with a notice before. */
export default async function RetentionPage({ searchParams }: { searchParams: Promise<{ saved?: string; ran?: string }> }) {
  const L = await getL();
  await guardPage("jobs");
  const { saved, ran } = await searchParams;
  const cfg = await getRetention();
  const preview = await runRetention({ dry: true });
  const { data: last } = await createAdminClient().from("site_content").select("value").eq("key", "retention_last").maybeSingle();
  const l = (last?.value ?? null) as { at?: string; warned?: number; deleted?: number; files?: number; failed?: number } | null;
  let ranText = "";
  try { const r = JSON.parse(ran ?? "null"); if (r) ranText = r.skipped === "off" ? L("الميزة مطفية، ما صار شي.") : r.error ? `${L("خطأ")}: ${r.error}` : `${L("تنبيهات أُرسلت لـ")} ${r.warned ?? 0} ${L("عمل")} · ${L("حُذف")} ${r.deleted ?? 0} ${L("عمل")} (${r.files ?? 0} ${L("ملف")})${r.failed ? ` · ${L("تعذّر")} ${r.failed}` : ""}`; } catch { /* ignore */ }
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-bold text-navy-900">{L("مدة حفظ الملفات")}</h1>
        <Link href="/admin/jobs" className="chip">{L("← الطلبات")}</Link>
      </div>
      <p className="text-[14px] leading-7 text-muted">{L("الفيديوهات والصور والملفات اللي يصنعها العميل تنحذف تلقائياً بعد المدة، ويوصله تنبيه (داخل حسابه وعلى بريده) قبل الحذف. ما نحذف شعاره ولا هويته ولا الملفات اللي رفعها بنفسه ولا حسابه، وسجل العمل يبقى ويظهر «انتهت مدة الحفظ».")}</p>
      {saved && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{L("انحفظت الإعدادات.")}</p>}
      {ranText && <p className="rounded-lg bg-tint p-3 text-sm font-semibold text-navy-900">{ranText}</p>}
      <form action={saveRetention} className="card flex flex-col gap-4 p-5">
        <label className="flex items-center gap-2 text-[15px] font-semibold text-navy-900"><input type="checkbox" name="enabled" defaultChecked={cfg.enabled} className="h-4 w-4" />{L("تشغيل الحذف التلقائي")}</label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5"><label className="label">{L("مدة الحفظ (يوم)")}</label><input name="days" type="number" min={14} max={365} defaultValue={cfg.days} className="field" /></div>
          <div className="flex flex-col gap-1.5"><label className="label">{L("التنبيه قبل الحذف بـ (يوم)")}</label><input name="warn" type="number" min={1} max={30} defaultValue={cfg.warn} className="field" /></div>
        </div>
        <p className="text-[13px] leading-6 text-subtle">{L("أول ما تشغّل الميزة، الأعمال الأقدم من المدة يوصل أصحابها تنبيه أولاً، وما يتحذف شي إلا بعد ما يمر على التنبيه عدد أيام التنبيه. المدة تظهر تلقائياً للعميل وفي الشروط والخصوصية وصفحة الباقات.")}</p>
        <button className="btn btn-primary w-fit px-5 py-2.5">{L("حفظ")}</button>
      </form>
      <section className="card flex flex-col gap-2 p-5 text-[14px] leading-7 text-ink">
        <h2 className="text-[16px] font-bold text-navy-900">{L("لو شُغّل الآن (معاينة)")}</h2>
        {"error" in preview && preview.error ? <p className="text-red-700">{preview.error} — {L("غالباً ما شغّلت ملف SQL الخاص بـ v226 في Supabase.")}</p> : <>
          <p>{L("أعمال يوصل أصحابها تنبيه:")} <b>{preview.warnJobs ?? 0}</b> ({preview.warnUsers ?? 0} {L("عميل")})</p>
          <p>{L("أعمال جاهزة للحذف الآن (مرّ عليها التنبيه):")} <b>{preview.deleteJobs ?? 0}</b> ({preview.files ?? 0} {L("ملف")})</p>
        </>}
        {l?.at && <p className="text-[13px] text-subtle">{L("آخر تشغيل:")} {new Date(l.at).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait" })} · {L("تنبيهات")} {l.warned ?? 0} · {L("حُذف")} {l.deleted ?? 0} · {L("ملفات")} {l.files ?? 0}{l.failed ? ` · ${L("تعذّر")} ${l.failed}` : ""}</p>}
        <form action={runRetentionNow}><button className="btn btn-outline w-fit px-4 py-2 text-[13px] font-semibold">{L("شغّل الآن")}</button></form>
        <p className="text-[12.5px] text-subtle">{L("يشتغل تلقائياً كل يوم الساعة 5:20 صباحاً بتوقيت الكويت. «شغّل الآن» نفس العملية ويحترم نفس الشروط.")}</p>
      </section>
    </div>
  );
}
