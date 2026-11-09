import Link from "next/link";
import { Icon } from "@/components/Icon";
import { WorkCard } from "@/components/app/WorkCard";
import { getSessionProfile, getTools } from "@/lib/data";
import { listWorks } from "@/lib/works";

export const metadata = { title: "الرئيسية" };

export default async function Dashboard() {
  const [profile, tools, works] = await Promise.all([getSessionProfile(), getTools(), listWorks({ limit: 4 })]);
  const first = profile?.full_name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold text-navy-900">{first ? `هلا ${first} 👋` : "هلا فيك 👋"}</h1>
        <p className="text-[16px] text-subtle">شنو تبي تسوّي اليوم؟ اختر أداة وابدأ.</p>
      </header>

      <section aria-label="الأدوات" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((t) => (
          <Link key={t.id} href={`/app/tools/${t.id}`} className="card group flex items-center gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-gold-500">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-800 text-gold-500"><Icon name={t.icon} size={22} /></span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[16px] font-bold text-navy-900">{t.name}</span>
              <span className="text-[13px] text-subtle">{t.credit_cost} ريشة / {t.cost_unit}</span>
            </span>
            <span aria-hidden className="ms-auto text-navy-700 transition group-hover:-translate-x-1">←</span>
          </Link>
        ))}
      </section>

      {works.length > 0 && (
        <section aria-labelledby="wk" className="flex flex-col gap-4">
          <div className="flex items-center justify-between"><h2 id="wk" className="text-[20px] font-bold text-navy-900">آخر أعمالي</h2><Link href="/app/works" className="text-sm font-semibold text-navy-700">كل الأعمال</Link></div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">{works.map((w) => <WorkCard key={w.id} w={w} />)}</div>
        </section>
      )}
    </div>
  );
}
