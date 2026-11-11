import { guardPage } from "@/lib/server/auth";
import { getL } from "@/lib/server/lang";
import { createAdminClient } from "@/lib/supabase/admin";
import { INDUSTRIES } from "@/design/industries";
import { GROUPS, SCOPES } from "@/lib/server/trends";
import { runCustomers, runResearch, setTrend } from "./actions";
import { Pending } from "./pending";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type T = { id: string; created_at: string; origin: string; scope: string; industry: string; title: string; insight: string; instruction: string; sources: { title: string; url: string }[]; status: string; approved_at: string | null };

/** Trends lab: suggestions from the weekly research and from what customers change. Approved ones feed the AI. */
export default async function Trends({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const L = await getL();
  await guardPage("trends");
  const { tab = "pending" } = await searchParams;
  const { data, error } = await createAdminClient().from("trends").select("*").order("created_at", { ascending: false }).limit(300);
  const all = (data ?? []) as T[];
  const where = (t: T) => INDUSTRIES.find((i) => i.id === t.industry)?.label ?? (t.industry === "all" ? "كل المجالات" : t.industry);
  const scope = (s: string) => SCOPES.find((x) => x[0] === s)?.[1] ?? s;
  const age = (d: string | null) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 864e5) : 0);
  const pending = all.filter((t) => t.status === "pending");
  const approved = all.filter((t) => t.status === "approved");
  const list = tab === "approved" ? approved : tab === "rejected" ? all.filter((t) => t.status === "rejected") : pending;

  const Card = ({ t }: { t: T }) => (
    <li className="card flex flex-col gap-2.5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${t.origin === "customers" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"}`}>{t.origin === "customers" ? L("من عملائك") : L("من الإنترنت")}</span>
        <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-semibold text-navy-800">{L(where(t))}</span>
        <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-semibold text-navy-800">{L(scope(t.scope))}</span>
        {t.status === "approved" && age(t.approved_at) > 60 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">{L("قديم — جدده أو احذفه")}</span>}
        <span className="ms-auto text-xs text-subtle">{t.created_at.slice(0, 10)}</span>
      </div>
      <h3 className="text-[16px] font-bold text-navy-900">{t.title}</h3>
      {t.insight && <p className="text-[14px] leading-7 text-muted">{t.insight}</p>}
      <p className="rounded-xl bg-canvas p-3 text-[14px] leading-7 text-navy-900"><b>{L("التعليمات للذكاء الاصطناعي:")}</b> {t.instruction}</p>
      {t.sources?.length > 0 && <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">{t.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-navy-700 underline">{s.title}</a></li>)}</ul>}
      <div className="flex flex-wrap gap-2 pt-1">
        {t.status === "pending" && <Pending id={t.id} instruction={t.instruction} />}
        {t.status === "approved" && <form action={setTrend}><input type="hidden" name="id" value={t.id} /><button name="act" value="renew" className="btn btn-outline px-4 py-2 text-sm">{L("🔄 جدّد شهرين")}</button></form>}
        {t.status !== "pending" && <form action={setTrend}><input type="hidden" name="id" value={t.id} /><button name="act" value="delete" className="rounded-xl px-4 py-2 text-sm text-red-700 hover:bg-red-50">{L("حذف")}</button></form>}
      </div>
    </li>
  );

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">{L("الترندات")}</h1>
        <p className="mt-1 text-sm text-subtle">{L("كل جمعة شاهين يبحث بالإنترنت عن أقوى المحتوى انتشاراً لفئتين من المجالات (كل فئة تقريباً مرة بالشهر)، ويتعلم من وش يغيّرون عملاؤك. الاقتراحات توصل هنا، واللي تعتمده يدخل بتعليمات الذكاء الاصطناعي لمدة شهرين. البحث يستخدم Gemini أولاً (فيه حصة مجانية) وبعده نموذج Claude الصغير، عشان يوفّر رصيدك.")}</p>
      </div>
      {error && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{L("شغّل ملف v47-trends.sql بقاعدة البيانات أول.")}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="text-[13px] text-subtle">{L("بانتظار موافقتك")}</div><div className="mt-1 text-[26px] font-bold text-amber-700">{pending.length}</div></div>
        <div className="card p-4"><div className="text-[13px] text-subtle">{L("معتمدة وشغّالة")}</div><div className="mt-1 text-[26px] font-bold text-emerald-700">{approved.filter((t) => age(t.approved_at) <= 90).length}</div></div>
        <div className="card p-4"><div className="text-[13px] text-subtle">{L("تحتاج تجديد")}</div><div className="mt-1 text-[26px] font-bold text-navy-900">{approved.filter((t) => age(t.approved_at) > 60).length}</div></div>
      </div>
      <details className="card p-4">
        <summary className="cursor-pointer font-semibold text-navy-900">{L("⚡ شغّل البحث الحين")}</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {GROUPS.map((g) => <form key={g} action={runResearch}><input type="hidden" name="group" value={g} /><button className="chip">{L(g)}</button></form>)}
          <form action={runCustomers}><button className="chip">{L("📊 تعلّم من العملاء")}</button></form>
        </div>
        <p className="mt-2 text-[13px] text-subtle">{L("البحث ياخذ دقيقة أو دقيقتين، خلّ الصفحة مفتوحة.")}</p>
      </details>
      <nav className="flex flex-wrap gap-2">
        {[["pending", `بانتظار الموافقة (${pending.length})`], ["approved", `المعتمدة (${approved.length})`], ["rejected", "المرفوضة"]].map(([k, l]) => <a key={k} href={`/admin/trends?tab=${k}`} className={`chip ${tab === k ? "!border-navy-800 !bg-navy-800 !text-white" : ""}`}>{L(l)}</a>)}
      </nav>
      <ul className="flex flex-col gap-3">
        {list.length === 0 && <li className="card p-6 text-center text-subtle">{L("ما فيه شي هنا للحين.")}</li>}
        {list.map((t) => <Card key={t.id} t={t} />)}
      </ul>
    </div>
  );
}
