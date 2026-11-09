import { getTools } from "@/lib/data";
import { saveTool } from "../actions";
import { providerInfo, toolProviders, type ProviderId } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";
const icons = ["sparkles", "camera", "megaphone", "film", "user", "scissors", "mic", "waves"];

export default async function ToolsAdmin() {
  const tools = await getTools(true);
  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="text-[26px] font-bold text-navy-900">الأدوات والأسعار</h1><p className="mt-1 text-sm text-subtle">السعر بالريشة لكل وحدة. الريشة الواحدة ≈ 0.06 د.ك في باقاتك الحالية. لكل أداة تختار المزوّد اللي يشغّلها — القائمة تعرض فقط المزودين اللي يقدرون على هذي المهمة. لما تغيّر المزوّد، فرّغ خانة النموذج ليستخدم الافتراضي، وتأكد أن مفتاح المزوّد موجود في إعدادات الاستضافة.</p></div>
      {tools.map((t) => (
        <form key={t.id} action={saveTool} className="card grid gap-4 p-5 md:grid-cols-2">
          <input type="hidden" name="id" value={t.id} />
          <div className="flex flex-col gap-1.5"><label className="label">الاسم</label><input name="name" defaultValue={t.name} className="field" /></div>
          <div className="flex flex-col gap-1.5"><label className="label">الأيقونة</label><select name="icon" defaultValue={t.icon} className="field">{icons.map((i) => <option key={i}>{i}</option>)}</select></div>
          <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">الوصف</label><textarea name="description" defaultValue={t.description} rows={2} className="field" /></div>
          <div className="flex flex-col gap-1.5"><label className="label">السعر (ريشة)</label><input name="credit_cost" type="number" min={0} defaultValue={t.credit_cost} className="field" /></div>
          <div className="flex flex-col gap-1.5"><label className="label">سعر «تعديل» النتيجة (ريشة)</label><input name="edit_cost" type="number" min={0} defaultValue={t.edit_cost} className="field" /></div>
          <div className="flex flex-col gap-1.5"><label className="label">لكل</label><input name="cost_unit" defaultValue={t.cost_unit} className="field" /></div>
          <div className="flex flex-col gap-1.5">
            <label className="label">المزوّد اللي يشغّل الأداة</label>
            <select name="provider" defaultValue={t.provider ?? ""} className="field">
              {(Object.keys(toolProviders[t.id] ?? {}) as ProviderId[]).map((p) => <option key={p} value={p}>{providerInfo[p].name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="label">النموذج (اتركه فاضي للافتراضي)</label>
            <input name="provider_model" defaultValue={t.provider_model ?? ""} dir="ltr" className="field text-right" placeholder={Object.entries(toolProviders[t.id] ?? {}).map(([p, m]) => `${p}: ${m}`).join(" | ")} />
          </div>
          <div className="flex flex-col gap-1.5"><label className="label">الترتيب</label><input name="sort_order" type="number" defaultValue={t.sort_order} className="field" /></div>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_enabled" defaultChecked={t.is_enabled} className="h-5 w-5 accent-navy-700" />الأداة مفعّلة</label>
          <button className="btn btn-primary justify-self-end px-6 py-2.5">حفظ</button>
        </form>
      ))}
    </div>
  );
}
