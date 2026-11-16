import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ILLUS_STYLES } from "@/remotion/styles";
import { TEMPLATE_IDEAS } from "@/lib/templates";
import { Generator, TemplateCard } from "./Panel";

export const dynamic = "force-dynamic";

/** «مكتبة قوالب الموشن»: what the customers pick from before they write their own info. */
export default async function TemplatesAdmin({ searchParams }: { searchParams: Promise<{ style?: string }> }) {
  await guardPage("gallery");
  const pick = (await searchParams).style ?? "all";
  const { data, error } = await createAdminClient().from("video_templates").select("*").order("sort_order").order("created_at", { ascending: false });
  const all = data ?? [];
  const have: Record<string, number[]> = {};
  for (const t of all) if (t.source === "auto") (have[t.style] ??= []).push(Math.max(0, TEMPLATE_IDEAS.findIndex((x) => x.title === t.title)));
  const list = pick === "all" ? all : all.filter((t) => t.style === pick);
  const chip = (on: boolean) => `shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold ${on ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink"}`;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/gallery" className="text-sm font-semibold text-navy-700">← رجوع للمعرض</Link>
        <h1 className="mt-2 text-[26px] font-bold text-navy-900">مكتبة قوالب الموشن جرافيك</h1>
        <p className="mt-1 text-sm leading-7 text-subtle">لكل ستايل مجموعة قوالب. العميل يفتح «أعمال صُنعت بشاهين» ← «موشن جرافيك» ويشوف المكتبة كاملة ويفلترها بالستايل، ويختار قالب ويكتب معلوماته، وشاهين يبني له فيديو بنفس بنية القالب.</p>
      </div>
      {error && <p role="alert" className="card p-4 font-semibold text-red-700">شغّل ملف SQL الخاص بالتحديث v90 أول.</p>}
      <Generator have={have} />
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/gallery/templates" className={chip(pick === "all")}>الكل <span className="opacity-60">{all.length}</span></Link>
        {ILLUS_STYLES.map(([k, ar]) => <Link key={k} href={`/admin/gallery/templates?style=${k}`} className={chip(pick === k)}>{ar} <span className="opacity-60">{all.filter((t) => t.style === k).length}</span></Link>)}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
        {list.map((t) => <TemplateCard key={t.id} t={t} />)}
      </div>
      {list.length === 0 && !error && <p className="card p-6 text-center text-muted">ما في قوالب بعد. اضغط «ولّد القوالب الناقصة».</p>}
    </div>
  );
}
