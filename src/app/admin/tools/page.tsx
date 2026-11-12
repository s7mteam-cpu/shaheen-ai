import { guardPage } from "@/lib/server/auth";
import { getTools } from "@/lib/data";
import { saveTool } from "../actions";
import { providerInfo, toolProviders, type ProviderId } from "@/lib/providers/registry";
import { getL } from "@/lib/server/lang";
import { demoThumb } from "@/lib/video";
import { DemoField } from "@/components/admin/DemoField";

export const dynamic = "force-dynamic";
const icons = ["sparkles", "camera", "megaphone", "film", "user", "scissors", "mic", "waves"];

export default async function ToolsAdmin() {
  const L = await getL();
  await guardPage("tools");
  const tools = await getTools(true);
  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="text-[26px] font-bold text-navy-900">{L("الأدوات والأسعار")}</h1><p className="mt-1 text-sm text-subtle">{L("السعر بالريشة لكل وحدة. الريشة الواحدة ≈ 0.06 د.ك في باقاتك الحالية. لكل أداة تختار المزوّد اللي يشغّلها — القائمة تعرض فقط المزودين اللي يقدرون على هذي المهمة. لما تغيّر المزوّد، فرّغ خانة النموذج ليستخدم الافتراضي، وتأكد أن مفتاح المزوّد موجود في إعدادات الاستضافة.")}</p></div>
      {tools.map((t) => (
        <form key={t.id} action={saveTool} className="card grid gap-4 p-5 md:grid-cols-2">
          <input type="hidden" name="id" value={t.id} />
          <div className="flex flex-col gap-1.5"><label className="label">{L("الاسم")}</label><input name="name" defaultValue={t.name} className="field" /></div>
          <div className="flex flex-col gap-1.5"><label className="label">{L("الأيقونة")}</label><select name="icon" defaultValue={t.icon} className="field">{icons.map((i) => <option key={i}>{i}</option>)}</select></div>
          <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">{L("الوصف")}</label><textarea name="description" defaultValue={t.description} rows={2} className="field" /></div>
          <div className="flex flex-col gap-1.5"><label className="label">{L("السعر (ريشة)")}</label><input name="credit_cost" type="number" min={0} defaultValue={t.credit_cost} className="field" /></div>
          <div className="flex flex-col gap-1.5"><label className="label">{L("سعر «تعديل» النتيجة (ريشة)")}</label><input name="edit_cost" type="number" min={0} defaultValue={t.edit_cost} className="field" /></div>
          <div className="flex flex-col gap-1.5"><label className="label">{L("لكل")}</label><input name="cost_unit" defaultValue={t.cost_unit} className="field" /></div>
          <div className="flex flex-col gap-1.5">
            <label className="label">{L("المزوّد اللي يشغّل الأداة")}</label>
            <select name="provider" defaultValue={t.provider ?? ""} className="field">
              {(Object.keys(toolProviders[t.id] ?? {}) as ProviderId[]).map((p) => <option key={p} value={p}>{providerInfo[p].name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label">{L("النموذج (اتركه فاضي للافتراضي)")}</label>
            <input name="provider_model" defaultValue={t.provider_model ?? ""} dir="ltr" className="field text-right" placeholder={Object.entries(toolProviders[t.id] ?? {}).map(([p, m]) => `${p}: ${m}`).join(" | ")} />
          </div>
          <div className="flex flex-col gap-1.5"><label className="label">{L("الترتيب")}</label><input name="sort_order" type="number" defaultValue={t.sort_order} className="field" /></div>
          <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-canvas p-4 md:col-span-2">
            <legend className="px-1 text-sm font-bold text-navy-900">{L("فيديو المثال (يطلع ببطاقة الأداة بالصفحة الرئيسية وداخل الأداة)")}</legend>
            <div className="flex flex-wrap items-start gap-4">
              {demoThumb(t) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={demoThumb(t)!} alt="" className="aspect-[9/16] w-[72px] shrink-0 rounded-lg object-cover ring-1 ring-line" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <DemoField tool={t.id} initial={t.demo_url ?? ""} />
                <div className="grid gap-3">
                  <label className="flex flex-col gap-1.5 text-sm"><span className="label">{L("صورة البطاقة 9:16 (اختياري)")}</span>
                    <input name="demo_thumb_file" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
                    <span className="text-[12px] text-subtle">{L("إذا ما رفعت صورة، تطلع صورة الفيديو من يوتيوب.")}</span></label>
                </div>
                {t.demo_thumb && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="demo_thumb_clear" className="h-4 w-4 accent-red-700" />{L("احذف صورة البطاقة")}</label>}
              </div>
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-3 rounded-2xl border border-line bg-canvas p-4 md:col-span-2">
            <legend className="px-1 text-sm font-bold text-navy-900">{L("بطاقة الأداة بصفحة «الأدوات» عند العميل")}</legend>
            <div className="flex flex-wrap items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.cover_url || `/covers/${t.id}.svg`} alt="" className="aspect-[4/3] w-[110px] shrink-0 rounded-lg bg-navy-800 object-cover ring-1 ring-line" />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-sm"><span className="label">{L("الصورة التوضيحية (مقاس 4:3)")}</span>
                  <input name="cover_file" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm" />
                  <span className="text-[12px] text-subtle">{L("إذا ما رفعت صورة، تطلع الصورة التوضيحية الجاهزة اللي بالمعاينة. ارفع صورتك لتستبدلها.")}</span></label>
                {t.cover_url && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cover_clear" className="h-4 w-4 accent-red-700" />{L("احذف الصورة التوضيحية")}</label>}
                <span className="label">{L("فيديو «علّمني الطريقة»")}</span>
                <DemoField tool={t.id} initial={t.tutorial_url ?? ""} name="tutorial_url" />
                <span className="text-[12px] text-subtle">{L("رابط يوتيوب يفتح يوتيوب على طول، والفيديو المرفوع يشتغل داخل الموقع. إذا ما حطيت شي، الزر يطلع «الشرح قريباً».")}</span>
              </div>
            </div>
          </fieldset>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_enabled" defaultChecked={t.is_enabled} className="h-5 w-5 accent-navy-700" />{L("الأداة مفعّلة")}</label>
          <button className="btn btn-primary justify-self-end px-6 py-2.5">{L("حفظ")}</button>
        </form>
      ))}
    </div>
  );
}
