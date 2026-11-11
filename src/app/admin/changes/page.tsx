import { guardPage } from "@/lib/server/auth";
import { CHANGELOG } from "@/lib/changelog";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL, getLang } from "@/lib/server/lang";
import { localize } from "@/lib/server/translate";

export const dynamic = "force-dynamic";

export default async function Changes() {
  const L = await getL();
  await guardPage("changes");
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "changelog_cleared").maybeSingle();
  const hidden = new Set<string>(((data?.value as { versions?: string[] } | null)?.versions) ?? []);
  // In English the changelog is translated once by AI and cached.
  const list = await localize(CHANGELOG.filter((c) => !hidden.has(c.version)), await getLang());
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div><h1 className="text-[26px] font-bold text-navy-900">{L("آخر التعديلات")}</h1><p className="mt-1 text-sm text-subtle">{L("كل تحديث على المنصة، الأحدث أولاً.")}</p></div>
      <ol className="flex flex-col gap-4">
        {list.length === 0 && <li className="card p-6 text-center text-subtle">{L("القائمة فاضية. أول تحديث جاي بيطلع هنا.")}</li>}
        {list.map((c, i) => (
          <li key={c.version} className={`card flex flex-col gap-3 p-5 ${i === 0 ? "border-2 border-gold-500" : ""}`}>
            <div className="flex flex-wrap items-center gap-2.5">
              <span dir="ltr" className="rounded-lg bg-navy-900 px-2.5 py-1 font-latin text-sm font-bold text-white">{c.version}</span>
              <h2 className="text-lg font-bold text-navy-900">{c.title}</h2>
              {i === 0 && <span className="rounded-full bg-gold-500/15 px-2.5 py-0.5 text-xs font-bold text-[#8a6a2a]">{L("الأحدث")}</span>}
              {c.sql && <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-subtle">{L("فيه تعديل بقاعدة البيانات")}</span>}
              <span className="ms-auto text-sm text-subtle">{c.date}</span>
            </div>
            <ul className="list-disc space-y-1 ps-5 text-[15px] leading-7 text-navy-900">{c.items.map((x) => <li key={x}>{x}</li>)}</ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
