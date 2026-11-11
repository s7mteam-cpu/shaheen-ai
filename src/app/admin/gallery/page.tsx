import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addGalleryItem, updateGalleryItem } from "../actions";
import { getL } from "@/lib/server/lang";

export const dynamic = "force-dynamic";

export default async function GalleryAdmin() {
  const L = await getL();
  await guardPage("gallery");
  const { data } = await createAdminClient().from("gallery_items").select("*").order("sort_order");
  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="text-[26px] font-bold text-navy-900">{L("معرض الأعمال")}</h1><p className="mt-1 text-sm text-subtle">{L("الأعمال هنا تظهر في صفحة الهبوط. القسم يختفي تلقائياً إذا ما فيه أعمال منشورة. استخدم أعمالاً حقيقية وبموافقة أصحابها.")}</p></div>
      <form action={addGalleryItem} className="card flex flex-wrap items-end gap-3 p-5">
        <div className="flex flex-col gap-1.5"><label className="label" htmlFor="gt">{L("العنوان")}</label><input id="gt" name="title" required className="field" /></div>
        <div className="flex flex-col gap-1.5"><label className="label" htmlFor="gf">{L("صورة أو فيديو")}</label><input id="gf" name="file" type="file" accept="image/*,video/mp4" required className="text-sm" /></div>
        <div className="flex w-24 flex-col gap-1.5"><label className="label" htmlFor="go">{L("الترتيب")}</label><input id="go" name="sort_order" type="number" defaultValue={0} className="field" /></div>
        <button className="btn btn-primary px-6 py-3">{L("إضافة")}</button>
      </form>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {(data ?? []).map((g) => (
          <form key={g.id} action={updateGalleryItem} className="card flex flex-col gap-2 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {g.media_type === "video" ? <video src={g.media_url} muted className="aspect-[4/5] w-full object-cover" /> : <img src={g.media_url} alt="" className="aspect-[4/5] w-full object-cover" />}
            <div className="flex flex-col gap-2 p-3">
              <input type="hidden" name="id" value={g.id} />
              <input name="title" defaultValue={g.title} className="field py-2 text-sm" aria-label={L("العنوان")} />
              <input name="sort_order" type="number" defaultValue={g.sort_order} className="field py-2 text-sm" aria-label={L("الترتيب")} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_published" defaultChecked={g.is_published} className="accent-navy-700" />{L("منشور")}</label>
              <div className="flex gap-2"><button className="btn btn-primary flex-1 py-2 text-sm">{L("حفظ")}</button><button name="delete" value="1" className="btn btn-outline flex-1 py-2 text-sm text-red-700">{L("حذف")}</button></div>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
