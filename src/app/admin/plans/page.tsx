import { guardPage } from "@/lib/server/auth";
import { getPlans } from "@/lib/data";
import type { Plan } from "@/lib/defaults";
import { savePlan } from "../actions";
import { getL } from "@/lib/server/lang";
import { PriceHistory } from "@/components/admin/PriceHistory";
import { L } from "@/lib/i18n/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { trialSettings, turnstileOn } from "@/lib/server/trial";
import { TrialForm } from "./TrialForm";

export const dynamic = "force-dynamic";

async function PlanForm({ p }: { p?: Plan }) {
  const L = await getL();
  return (
    <form action={savePlan} className="card grid gap-4 p-5 md:grid-cols-2">
      <div className="flex flex-col gap-1.5"><label className="label">{L("المعرّف (بالإنجليزي)")}</label><input name="id" defaultValue={p?.id} readOnly={Boolean(p)} required dir="ltr" className="field text-right" /></div>
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

export default async function PlansAdmin() {
  const L = await getL();
  await guardPage("plans");
  const plans = await getPlans(true);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-bold text-navy-900">{L("الباقات")}</h1>
      <TrialCard />
      {plans.map((p) => <PlanForm key={p.id} p={p} />)}
      <h2 className="text-lg font-bold">{L("باقة جديدة")}</h2>
      <PlanForm />
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
