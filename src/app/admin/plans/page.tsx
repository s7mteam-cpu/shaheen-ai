import { getPlans } from "@/lib/data";
import type { Plan } from "@/lib/defaults";
import { savePlan } from "../actions";

export const dynamic = "force-dynamic";

function PlanForm({ p }: { p?: Plan }) {
  return (
    <form action={savePlan} className="card grid gap-4 p-5 md:grid-cols-2">
      <div className="flex flex-col gap-1.5"><label className="label">المعرّف (بالإنجليزي)</label><input name="id" defaultValue={p?.id} readOnly={Boolean(p)} required dir="ltr" className="field text-right" /></div>
      <div className="flex flex-col gap-1.5"><label className="label">الاسم</label><input name="name" defaultValue={p?.name} required className="field" /></div>
      <div className="flex flex-col gap-1.5"><label className="label">الوصف القصير</label><input name="subtitle" defaultValue={p?.subtitle ?? ""} className="field" /></div>
      <div className="flex flex-col gap-1.5"><label className="label">السعر الشهري (د.ك)</label><input name="price_kwd" type="number" step="0.001" defaultValue={p?.price_kwd} required className="field" /></div>
      <div className="flex flex-col gap-1.5"><label className="label">الريش الشهرية</label><input name="credits" type="number" defaultValue={p?.credits} required className="field" /></div>
      <div className="flex flex-col gap-1.5"><label className="label">الترتيب</label><input name="sort_order" type="number" defaultValue={p?.sort_order ?? 0} className="field" /></div>
      <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">المميزات (كل سطر ميزة)</label><textarea name="features" rows={3} defaultValue={p?.features.join("\n")} className="field" /></div>
      <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">Stripe Price ID (يبدأ بـ price_)</label><input name="stripe_price_id" defaultValue={p?.stripe_price_id ?? ""} dir="ltr" className="field text-right" placeholder="price_..." /><span className="text-xs text-subtle">أنشئ السعر في Stripe بعملة KWD وبتكرار شهري، ثم الصق المعرّف هنا. إذا غيّرت السعر، أنشئ Price جديد في Stripe.</span></div>
      <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={p?.is_featured} className="h-5 w-5 accent-navy-700" />«الأكثر اختياراً»</label>
      <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={p?.is_active ?? true} className="h-5 w-5 accent-navy-700" />ظاهرة للعملاء</label>
      <button className="btn btn-primary justify-self-start px-6 py-2.5">{p ? "حفظ" : "إضافة الباقة"}</button>
    </form>
  );
}

export default async function PlansAdmin() {
  const plans = await getPlans(true);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-bold text-navy-900">الباقات</h1>
      {plans.map((p) => <PlanForm key={p.id} p={p} />)}
      <h2 className="text-lg font-bold">باقة جديدة</h2>
      <PlanForm />
    </div>
  );
}
