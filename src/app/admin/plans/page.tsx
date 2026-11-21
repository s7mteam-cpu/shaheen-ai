import { guardPage } from "@/lib/server/auth";
import { getPlans, getContent } from "@/lib/data";
import type { Plan } from "@/lib/defaults";
import { savePlan, deletePlan, saveManaged, deleteManagedPkg } from "../actions";
import { managedPackages, type ManagedPkg } from "@/lib/managed";
import { getL } from "@/lib/server/lang";
import { PriceHistory } from "@/components/admin/PriceHistory";
import { L } from "@/lib/i18n/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { trialSettings, turnstileOn } from "@/lib/server/trial";
import { TrialForm } from "./TrialForm";

export const dynamic = "force-dynamic";

async function PlanForm({ p, audience }: { p?: Plan; audience?: "ind" | "biz" }) {
  const L = await getL();
  return (
    <form action={savePlan} className="card grid gap-4 p-5 md:grid-cols-2">
      {p ? <input type="hidden" name="id" value={p.id} /> : <input type="hidden" name="audience" value={audience ?? "ind"} />}
      <div className="flex flex-col gap-1.5"><label className="label">{L("الاسم")}</label><input name="name" defaultValue={p?.name} required className="field" /></div>
      <div className="flex flex-col gap-1.5"><label className="label">{L("الوصف القصير")}</label><input name="subtitle" defaultValue={p?.subtitle ?? ""} className="field" /></div>
      <div className="flex flex-col gap-1.5"><label className="label">{L("السعر الشهري (د.ك)")}</label><input name="price_kwd" type="number" step="0.001" defaultValue={p?.price_kwd} required className="field" /></div>
      <div className="flex flex-col gap-1.5"><label className="label">{L("الريش الشهرية")}</label><input name="credits" type="number" defaultValue={p?.credits} required className="field" /></div>
      <div className="flex flex-col gap-1.5"><label className="label">{L("ريش هدية شهرية (إضافية)")}</label><input name="bonus_credits" type="number" min="0" defaultValue={p?.bonus_credits ?? 0} className="field" /></div>
      <div className="flex flex-col gap-1.5"><label className="label">{L("الترتيب")}</label><input name="sort_order" type="number" defaultValue={p?.sort_order ?? 0} className="field" /></div>
      <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">{L("المميزات (كل سطر ميزة)")}</label><textarea name="features" rows={3} defaultValue={p?.features.join("\n")} className="field" /></div>
      <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">{L("Stripe Price ID (يبدأ بـ price_)")}</label><input name="stripe_price_id" defaultValue={p?.stripe_price_id ?? ""} dir="ltr" className="field text-right" placeholder="price_..." /><span className="text-xs text-subtle">{L("أنشئ السعر في Stripe بعملة KWD وبتكرار شهري، ثم الصق المعرّف هنا. إذا غيّرت السعر، أنشئ Price جديد في Stripe.")}</span></div>
      <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={p?.is_featured} className="h-5 w-5 accent-navy-700" />{L("«الأكثر اختياراً»")}</label>
      <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={p?.is_active ?? true} className="h-5 w-5 accent-navy-700" />{L("ظاهرة للعملاء")}</label>
      <button className="btn btn-primary justify-self-start px-6 py-2.5">{p ? L("حفظ") : L("إضافة الباقة")}</button>
    </form>
  );
}

async function PlanBlock({ p, used, who }: { p: Plan; used: boolean; who: string[] }) {
  const L = await getL();
  return (
    <div className="flex flex-col gap-2">
      <PlanForm p={p} />
      <details className="text-[13px] text-subtle"><summary className="cursor-pointer font-semibold text-navy-800">{L("المشتركون في هالباقة")}: {who.length}</summary>
        {who.length ? <ul className="mt-2 flex flex-col gap-1">{who.map((w) => <li key={w}>{w}</li>)}</ul> : <p className="mt-1">{L("ما فيها مشتركين.")}</p>}
      </details>
      {used
        ? <p className="text-[13px] text-subtle">{L("فيها مشتركين، ما تنحذف. لإخفائها ألغِ «ظاهرة للعملاء» واحفظ.")}</p>
        : <form action={deletePlan}><input type="hidden" name="id" value={p.id} /><button className="text-[13px] font-semibold text-red-600 underline">{L("حذف الباقة نهائياً (ما فيها مشتركين)")}</button></form>}
    </div>
  );
}

async function ManagedForm({ pkg }: { pkg?: ManagedPkg }) {
  const L = await getL();
  const f = (label: string, name: string, v: string, dir?: "ltr") => <div className="flex flex-col gap-1.5"><label className="label">{label}</label><input name={name} defaultValue={v} dir={dir} className={dir ? "field text-right" : "field"} /></div>;
  return (
    <form action={saveManaged} className="card grid gap-4 p-5 md:grid-cols-2">
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      {f(L("العنوان"), "title", pkg?.title ?? "")}
      {f(L("السعر (د.ك)"), "price_kwd", pkg?.price_kwd ?? "")}
      {f(L("الفترة (مثل: شهرياً)"), "period", pkg?.period ?? "شهرياً")}
      {f(L("نص الزر"), "cta", pkg?.cta ?? "اشترك الآن")}
      {f(L("رقم واتساب الطلبات"), "whatsapp", pkg?.whatsapp ?? "", "ltr")}
      {f(L("الرسالة الجاهزة للواتساب"), "whatsapp_message", pkg?.whatsapp_message ?? "")}
      <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">{L("المميزات (كل سطر ميزة)")}</label><textarea name="features" rows={5} defaultValue={(pkg?.features ?? []).join("\n")} className="field" /></div>
      <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">{L("رسالة الشكر بعد الطلب")}</label><input name="thanks" defaultValue={pkg?.thanks ?? "وصلنا طلبك ✓ سيتم التواصل معكم في أسرع وقت."} className="field" /></div>
      {pkg && <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">{L("رابط الدفع (ترسله للعميل)")}</label><input readOnly dir="ltr" value={`/app/pay?kind=managed&pkg=${pkg.id}`} className="field text-right" /></div>}
      <label className="flex items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={pkg ? pkg.enabled : true} className="h-5 w-5 accent-navy-700" />{L("ظاهرة للعملاء")}</label>
      <button className="btn btn-primary justify-self-start px-6 py-2.5">{pkg ? L("حفظ") : L("إضافة الباقة")}</button>
    </form>
  );
}

async function ManagedBlock({ pkg, only }: { pkg: ManagedPkg; only: boolean }) {
  const L = await getL();
  return (
    <div className="flex flex-col gap-2">
      <ManagedForm pkg={pkg} />
      {only
        ? <p className="text-[13px] text-subtle">{L("هذي آخر باقة إدارة، ما تنحذف. لإخفائها ألغِ «ظاهرة للعملاء» واحفظ.")}</p>
        : <form action={deleteManagedPkg}><input type="hidden" name="id" value={pkg.id} /><button className="text-[13px] font-semibold text-red-600 underline">{L("حذف الباقة")}</button></form>}
    </div>
  );
}

export default async function PlansAdmin() {
  const L = await getL();
  await guardPage("plans");
  const plans = await getPlans(true);
  const adm = createAdminClient();
  const { data: subs } = await adm.from("subscriptions").select("plan_id,user_id,status");
  const usedIds = new Set((subs ?? []).map((x) => x.plan_id as string));
  const live = (subs ?? []).filter((x) => ["active", "trialing", "past_due"].includes(String(x.status)));
  const { data: ppl } = live.length ? await adm.from("profiles").select("id,email,full_name").in("id", live.map((x) => x.user_id as string)) : { data: [] };
  const nameOf = new Map((ppl ?? []).map((x) => [x.id as string, String(x.full_name || x.email || x.id)]));
  const whoBy: Record<string, string[]> = {};
  for (const x of live) (whoBy[x.plan_id as string] ??= []).push(nameOf.get(x.user_id as string) ?? String(x.user_id));
  const mp = managedPackages((await getContent()).managed_service);
  const biz = plans.filter((p) => p.id.startsWith("biz-")), ind = plans.filter((p) => !p.id.startsWith("biz-"));
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-bold text-navy-900">{L("الباقات")}</h1>
      <TrialCard />
      <details className="card p-5"><summary className="cursor-pointer text-xl font-bold text-navy-900">{L("باقات الأفراد")} <span className="text-sm font-normal text-subtle">({ind.length})</span></summary>
        <div className="mt-4 flex flex-col gap-5">
      {ind.map((p) => <PlanBlock key={p.id} p={p} used={usedIds.has(p.id)} who={whoBy[p.id] ?? []} />)}
      <details className="card p-5"><summary className="cursor-pointer text-[15px] font-bold text-navy-800">+ {L("إضافة باقة للأفراد")}</summary><div className="mt-4"><PlanForm audience="ind" /></div></details>
        </div></details>
      <details className="card p-5"><summary className="cursor-pointer text-xl font-bold text-navy-900">{L("باقات الشركات")} <span className="text-sm font-normal text-subtle">({biz.length})</span></summary>
        <div className="mt-4 flex flex-col gap-5">
      {biz.map((p) => <PlanBlock key={p.id} p={p} used={usedIds.has(p.id)} who={whoBy[p.id] ?? []} />)}
      <details className="card p-5"><summary className="cursor-pointer text-[15px] font-bold text-navy-800">+ {L("إضافة باقة للشركات")}</summary><div className="mt-4"><PlanForm audience="biz" /></div></details>
        </div></details>
      <details className="card p-5"><summary className="cursor-pointer text-xl font-bold text-navy-900">{L("باقة الإدارة الكاملة")} <span className="text-sm font-normal text-subtle">({mp.length})</span></summary>
        <div className="mt-4 flex flex-col gap-5">
          {mp.map((x) => <ManagedBlock key={x.id} pkg={x} only={mp.length <= 1} />)}
          <details className="card p-5"><summary className="cursor-pointer text-[15px] font-bold text-navy-800">+ {L("إضافة باقة إدارة")}</summary><div className="mt-4"><ManagedForm /></div></details>
        </div></details>
      <PriceHistory kind="plan" />
    </div>
  );
}

/** «التجربة المجانية»: settings + how it's going (last 30 days). */
async function TrialCard() {
  const s = await trialSettings();
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: claims, error } = await admin.from("trial_claims").select("user_id,created_at").gte("created_at", since);
  if (error) return <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">التجربة المجانية: شغّل ملف SQL الخاص بالتحديث v81 (v81-trial.sql) بـ Supabase أول.</p>;
  const ids = [...new Set((claims ?? []).map((c) => c.user_id).filter(Boolean))] as string[];
  const { data: paid } = ids.length ? await admin.from("subscriptions").select("user_id").in("user_id", ids) : { data: [] };
  const converted = new Set((paid ?? []).map((p) => p.user_id)).size;
  const rate = ids.length ? Math.round((converted / ids.length) * 100) : 0;
  return (
    <section className="card flex flex-col gap-4 border-2 border-gold-500/50 p-5">
      <div>
        <h2 className="text-lg font-bold text-navy-900">🎁 التجربة المجانية</h2>
        <p className="mt-1 text-[13px] leading-6 text-subtle">العميل الجديد يشوف بالرئيسية «جرّب مجاناً». تجربة وحدة لكل حساب وإيميل ورقم واتساب وجهاز، حتى لو حذف حسابه وسجّل من جديد. لازم يكون مأكد إيميله وحاط رقمه، والإيميلات المؤقتة ممنوعة. ولما يخلص الوقت، ريش التجربة الباقية تنشال لحالها (إلا إذا اشترك).</p>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <span>آخر 30 يوم: <b className="text-navy-900">{claims?.length ?? 0}</b> تجربة</span>
        <span>آخر 24 ساعة: <b className="text-navy-900">{(claims ?? []).filter((c) => (c as { created_at?: string }).created_at && Date.now() - new Date((c as { created_at: string }).created_at).getTime() < 86_400_000).length}</b> من {s.max_per_day}</span>
        <span>اشتركوا بعدها: <b className="text-navy-900">{converted}</b> ({rate}%)</span>
      </div>
      <TrialForm s={s} turnstile={turnstileOn()} />
    </section>
  );
}
