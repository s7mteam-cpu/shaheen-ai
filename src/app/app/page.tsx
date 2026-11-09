import Link from "next/link";
import { Icon } from "@/components/Icon";
import { QuickStart } from "@/components/app/QuickStart";
import { WorkCard } from "@/components/app/WorkCard";
import { getPlans, getSessionProfile, getTools } from "@/lib/data";
import { listWorks } from "@/lib/works";

export const metadata = { title: "لوحة التحكم" };
const cat = { image: "صور", video: "فيديو", audio: "صوت" } as const;

export default async function Dashboard() {
  const [profile, tools, plans, works] = await Promise.all([getSessionProfile(), getTools(), getPlans(), listWorks({ limit: 4 })]);
  const plan = plans.find((p) => p.id === profile?.plan_id);
  const pct = plan ? Math.min(100, Math.round(((profile?.credits ?? 0) / plan.credits) * 100)) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-6">
        <QuickStart tools={tools.map((t) => ({ id: t.id, name: t.name }))} name={profile?.full_name?.split(" ")[0] ?? ""} />
        <section aria-labelledby="bal" className="relative flex min-w-0 flex-[1_1_260px] flex-col gap-4 overflow-hidden rounded-3xl bg-navy-800 p-7 text-white">
          <h2 id="bal" className="text-[15px] font-semibold text-white/80">رصيدك</h2>
          <div className="flex items-baseline gap-2"><span className="font-latin text-[44px] font-bold text-gold-500">{(profile?.credits ?? 0).toLocaleString("en")}</span><span>ريشة</span></div>
          {plan && <div className="h-2 rounded-full bg-white/15"><div className="h-full rounded-full bg-gold-500" style={{ width: `${pct}%` }} /></div>}
          <span className="text-[13px] text-white/75">{plan ? `باقة ${plan.name} · ${plan.credits.toLocaleString("en")} ريشة شهرياً` : "بدون باقة"}</span>
          <Link href={plan ? "/app/account" : "/#pricing"} className="btn btn-gold mt-auto py-3 text-[15px]">{plan ? "ترقية الباقة" : "اختر باقتك"}</Link>
        </section>
      </div>

      <section aria-labelledby="tl" className="flex flex-col gap-4">
        <div className="flex items-center justify-between"><h2 id="tl" className="text-[22px] font-bold text-navy-900">الأدوات</h2><Link href="/app/tools" className="text-sm font-semibold text-navy-700">عرض الكل</Link></div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3">
          {tools.map((t) => (
            <Link key={t.id} href={`/app/tools/${t.id}`} className="card flex flex-col gap-2.5 rounded-2xl p-4.5 p-5 transition hover:-translate-y-0.5 hover:border-gold-500">
              <span className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-navy-800"><Icon name={t.icon} size={20} /></span><span className="rounded-full bg-tint px-2.5 py-1 text-xs font-semibold text-subtle">{cat[t.category]}</span></span>
              <span className="font-bold text-navy-900">{t.name}</span>
              <span className="text-[13px] text-subtle">{t.credit_cost} ريشة / {t.cost_unit}</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="wk" className="flex flex-col gap-4">
        <div className="flex items-center justify-between"><h2 id="wk" className="text-[22px] font-bold text-navy-900">آخر أعمالي</h2><Link href="/app/works" className="text-sm font-semibold text-navy-700">كل الأعمال</Link></div>
        {works.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">{works.map((w) => <WorkCard key={w.id} w={w} />)}</div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-field bg-white px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tint text-navy-700"><Icon name="folder" size={26} /></span>
            <span className="text-[17px] font-bold text-navy-900">ما عندك أعمال للحين</span>
            <span className="text-[15px] text-subtle">اكتب فكرتك فوق، وأول عمل لك بيظهر هنا.</span>
          </div>
        )}
      </section>
    </div>
  );
}
