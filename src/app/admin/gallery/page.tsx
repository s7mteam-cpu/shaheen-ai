import { DeckCover } from "@/components/DeckCover";
import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SHOWCASE_CATS } from "@/lib/showcase";
import { AddShowcase, EditShowcase } from "./Forms";

export const dynamic = "force-dynamic";

/** «معرض شاهين / معرض الأعمال»: works shown inside the platform and/or on the home page. */
export default async function GalleryAdmin({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  await guardPage("gallery");
  const pick = (await searchParams).cat ?? "all";
  const { data: all } = await createAdminClient().from("gallery_items").select("*").order("sort_order").order("created_at", { ascending: false });
  const count = (k: string) => (all ?? []).filter((g) => (g.category ?? "design") === k).length;
  const data = pick === "all" ? all : (all ?? []).filter((g) => (g.category ?? "design") === pick);
  const chip = (on: boolean) => `shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${on ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink"}`;
  const cat = (k: string) => SHOWCASE_CATS.find((c) => c[0] === k)?.[1] ?? k;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">أعمال صُنعت بشاهين</h1>
        <p className="mt-1 text-sm leading-7 text-subtle">نماذج من شغل شاهين (بوستات، كاروسيل، ريلز، فيديو، بطاقات، CV…). تطلع للعملاء داخل المنصة بـ «أعمال صُنعت بشاهين»، وتقدر تختار بعضها يطلع بصفحة الموقع الرئيسية بعد. استخدم أعمالاً حقيقية وبموافقة أصحابها.</p>
      </div>
      <Link href="/admin/gallery/sections" className="card flex items-center justify-between p-4 font-bold text-navy-900">🧭 ترتيب الأقسام وشرحها (وش يشوف الزائر بالصفحة الرئيسية) <span>←</span></Link>
      <Link href="/admin/gallery/templates" className="card flex items-center justify-between p-4 font-bold text-navy-900">🎬 مكتبة قوالب الموشن جرافيك <span>←</span></Link>
      <AddShowcase />
      {/* every section (one per tool); the customer sees only the sections that have works */}
      <div className="flex flex-col gap-2">
        <b className="text-navy-900">الأقسام</b>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/gallery" className={chip(pick === "all")}>الكل <span className="opacity-60">{(all ?? []).length}</span></Link>
          {SHOWCASE_CATS.map(([k, ar]) => <Link key={k} href={`/admin/gallery?cat=${k}`} className={chip(pick === k)}>{ar} <span className="opacity-60">{count(k)}</span></Link>)}
        </div>
        <p className="text-[13px] text-subtle">تغيّر قسم أي عمل من القائمة اللي تحته وتضغط «حفظ». و«الترتيب» يرتّب الأعمال داخل المنصة، و«الترتيب بالصفحة الرئيسية» يرتّبها برا (إذا تركته فاضي يمشي على الأول). الرقم الأصغر يطلع أول. القسم الفاضي ما يطلع للعميل.</p>
      </div>
      {(data ?? []).length === 0 && <p className="card p-6 text-center text-muted">ما في أعمال بهالقسم بعد. أضف عمل من فوق واختر هالقسم من «القسم (الأداة)».</p>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        {(data ?? []).map((g) => (
          <div key={g.id} className="card flex flex-col overflow-hidden">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {g.media_type === "deck" ? <div className="aspect-[4/5] w-full"><DeckCover title={g.title} /></div> : g.media_type === "video" ? <video src={g.media_url} muted className="aspect-[4/5] w-full object-cover" /> : <img src={g.media_url} alt="" className="aspect-[4/5] w-full object-cover" />}
              <span className="absolute start-2 top-2 rounded-full bg-navy-900/80 px-2.5 py-1 text-[12px] font-bold text-white">{cat(g.category ?? "design")}</span>
            </div>
            <EditShowcase g={{ id: g.id, title: g.title, description: g.description ?? "", category: g.category ?? "design", sort_order: g.sort_order, is_published: g.is_published, in_app: g.in_app ?? true, on_home: g.on_home ?? true, home_order: g.home_order ?? null, recipe: g.recipe ?? "", like_on: g.like_on ?? true, extra: (g.extra_media ?? []).length }} />
          </div>
        ))}
      </div>
    </div>
  );
}
