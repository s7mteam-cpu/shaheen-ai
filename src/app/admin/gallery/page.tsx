import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SHOWCASE_CATS } from "@/lib/showcase";
import { AddShowcase, EditShowcase } from "./Forms";

export const dynamic = "force-dynamic";

/** «معرض شاهين / معرض الأعمال»: works shown inside the platform and/or on the home page. */
export default async function GalleryAdmin() {
  await guardPage("gallery");
  const { data } = await createAdminClient().from("gallery_items").select("*").order("sort_order").order("created_at", { ascending: false });
  const cat = (k: string) => SHOWCASE_CATS.find((c) => c[0] === k)?.[1] ?? k;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">أعمال صنعت بشاهين</h1>
        <p className="mt-1 text-sm leading-7 text-subtle">نماذج من شغل شاهين (بوستات، كاروسيل، ريلز، فيديو، بطاقات، CV…). تطلع للعملاء داخل المنصة بـ «أعمال صنعت بشاهين»، وتقدر تختار بعضها يطلع بصفحة الموقع الرئيسية بعد. استخدم أعمالاً حقيقية وبموافقة أصحابها.</p>
      </div>
      <AddShowcase />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        {(data ?? []).map((g) => (
          <div key={g.id} className="card flex flex-col overflow-hidden">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {g.media_type === "video" ? <video src={g.media_url} muted className="aspect-[4/5] w-full object-cover" /> : <img src={g.media_url} alt="" className="aspect-[4/5] w-full object-cover" />}
              <span className="absolute start-2 top-2 rounded-full bg-navy-900/80 px-2.5 py-1 text-[12px] font-bold text-white">{cat(g.category ?? "design")}</span>
            </div>
            <EditShowcase g={{ id: g.id, title: g.title, description: g.description ?? "", category: g.category ?? "design", sort_order: g.sort_order, is_published: g.is_published, in_app: g.in_app ?? true, on_home: g.on_home ?? true, extra: (g.extra_media ?? []).length }} />
          </div>
        ))}
      </div>
    </div>
  );
}
