import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultContent } from "@/lib/defaults";
import { ARAB_DIALECTS } from "@/lib/countries";
import { VoiceDesigner } from "./designer";

export const dynamic = "force-dynamic";

/** Narrator voices: design a new one by describing it, and see which dialects are covered. */
export default async function Voices() {
  await guardPage("voices");
  const cur = await createAdminClient().from("site_content").select("value").eq("key", "voices").maybeSingle();
  const items = ((cur.data?.value as { items?: { id: string; name: string; note?: string; gender?: string; age?: string; dialects?: string[] }[] } | null)?.items ?? defaultContent.voices.items) as { id: string; name: string; note?: string; gender?: string; age?: string; dialects?: string[] }[];
  const name = (d: string) => ARAB_DIALECTS.find((x) => x[0] === d)?.[1] ?? d;
  const covered = new Set(items.flatMap((v) => v.dialects ?? []));
  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-bold">تصميم الأصوات</h1>
        <p className="mt-1 text-muted">اختر اللهجة والجنس والعمر والنبرة، ويسمعك شاهين 3 نسخ. اختر واحد ينحفظ ويطلع للعملاء حسب اللهجة.</p></div>
      <VoiceDesigner />
      <div className="card p-5">
        <h2 className="mb-2 font-bold">الأصوات المسجّلة ({items.length})</h2>
        <p className="mb-3 text-[14px] text-muted">لهجات فيها صوت: {covered.size ? [...covered].map(name).join("، ") : "ما فيه لهجة محددة بعد"}</p>
        <ul className="flex flex-col gap-1.5 text-[14px]">{items.map((v) => <li key={v.id}>{v.name}{v.note ? ` — ${v.note}` : ""}{v.dialects?.length ? ` · ${v.dialects.map(name).join("، ")}` : ""}</li>)}</ul>
      </div>
    </div>
  );
}
