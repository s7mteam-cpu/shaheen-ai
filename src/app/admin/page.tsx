import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { counterResets } from "@/lib/server/overviewReset";

export const dynamic = "force-dynamic";

export default async function Overview() {
  await guardPage("overview");
  const admin = createAdminClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const r = await counterResets();
  const since = (k: keyof typeof r, base = "1970-01-01T00:00:00Z") => (r[k] && r[k]! > base ? r[k]! : base);
  const active = ["active", "trialing", "past_due"];
  const [{ data: subs }, { data: subsRev }, { data: plans }, { count: users }, { data: spent }, { count: failed }, { count: jobs }] = await Promise.all([
    admin.from("subscriptions").select("plan_id,status").in("status", active).gte("updated_at", since("subs")),
    admin.from("subscriptions").select("plan_id").in("status", active).gte("updated_at", since("revenue")),
    admin.from("plans").select("id,name,price_kwd"),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since("accounts")),
    admin.from("credit_ledger").select("amount").eq("reason", "spend").gte("created_at", since("spent", monthStart)),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", since("failed", monthStart)),
    admin.from("jobs").select("id", { count: "exact", head: true }).gte("created_at", since("jobs", monthStart)),
  ]);
  const price = (id: string | null) => Number(plans?.find((p) => p.id === id)?.price_kwd ?? 0);
  const mrr = (subsRev ?? []).reduce((s, x) => s + price(x.plan_id), 0);
  const used = -(spent ?? []).reduce((s, x) => s + x.amount, 0);
  const byPlan = (plans ?? []).map((p) => ({ name: p.name, n: (subs ?? []).filter((s) => s.plan_id === p.id).length }));

  const cards = [
    ["المشتركون النشطون", (subs ?? []).length.toLocaleString("en")],
    ["الإيراد الشهري", `${mrr.toLocaleString("en")} د.ك`],
    ["كل الحسابات", (users ?? 0).toLocaleString("en")],
    ["ريش مستهلكة هذا الشهر", used.toLocaleString("en")],
    ["طلبات هذا الشهر", (jobs ?? 0).toLocaleString("en")],
    ["طلبات فاشلة هذا الشهر", (failed ?? 0).toLocaleString("en")],
  ];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px] font-bold text-navy-900">نظرة عامة</h1>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {cards.map(([l, v], i) => (
          <div key={l} className={i === 1 ? "flex flex-col gap-2 rounded-2xl bg-navy-800 p-5" : "card flex flex-col gap-2 p-5"}>
            <span className={`text-sm ${i === 1 ? "text-white/75" : "text-subtle"}`}>{l}</span>
            <span className={`font-latin text-3xl font-bold ${i === 1 ? "text-gold-500" : "text-navy-900"}`}>{v}</span>
          </div>
        ))}
      </div>
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-bold">المشتركون حسب الباقة</h2>
        <ul className="flex flex-col gap-2">{byPlan.map((p) => <li key={p.name} className="flex justify-between border-b border-[#EDF1F6] py-2 last:border-0"><span>{p.name}</span><span className="font-latin font-bold">{p.n}</span></li>)}</ul>
      </section>
      <p className="text-sm text-subtle">تكلفة المزودين الفعلية تجدها في لوحات fal.ai وElevenLabs وAnthropic. الإيرادات التفصيلية والاستردادات في لوحة Stripe.</p>
    </div>
  );
}
