import { guardPage } from "@/lib/server/auth";
import { getL } from "@/lib/server/lang";
import { INDUSTRIES } from "@/design/industries";
import { PACKS, packReport } from "@/remotion/packs";
import { GRAPHIC_KINDS } from "@/remotion/montage";

export const dynamic = "force-dynamic";

/** Every field's pack: what it has, and what it still lacks. */
export default async function Packs() {
  const L = await getL();
  await guardPage("packs");
  const name = (k: string) => GRAPHIC_KINDS.find((g) => g[0] === k)?.[1] ?? k;
  const groups = [...new Set(INDUSTRIES.map((i) => i.group))];
  const all = PACKS.map((p) => ({ p, r: packReport(p), ind: INDUSTRIES.find((i) => i.id === p.id)! }));
  const totals = { scenes: GRAPHIC_KINDS.length, recipes: all.reduce((a, x) => a + x.r.recipes, 0), gaps: all.filter((x) => x.r.gaps.length).length };
  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">{L("حزم المجالات")}</h1>
        <p className="mt-1 text-sm text-subtle">{L("لكل مجال حزمة خاصة: مشاهد وحركات وستايلات وفيديوهات جاهزة. الذكاء الاصطناعي يستخدم حزمة المجال اللي يختاره العميل (أو يعرفه من وصفه) في الموشن جرافيك والمونتاج والفيديو التعليمي.")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {[[L("مجالات"), PACKS.length], [L("أنواع المشاهد بالمكتبة"), totals.scenes], [L("فيديوهات جاهزة"), totals.recipes], [L("حزم تحتاج تحديث"), totals.gaps]].map(([l, v]) => (
          <div key={String(l)} className="card p-4"><div className="text-[13px] text-subtle">{l}</div><div className="mt-1 text-[26px] font-bold text-navy-900">{v}</div></div>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g} className="flex flex-col gap-3">
          <h2 className="text-[18px] font-bold text-navy-900">{L(g)}</h2>
          {all.filter((x) => x.ind.group === g).map(({ p, r, ind }) => (
            <details key={p.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-2.5">
                <span className="font-bold text-navy-900">{L(ind.label)}</span>
                <span dir="ltr" className="rounded-lg bg-navy-900 px-2 py-0.5 font-latin text-xs font-bold text-white">v{p.version}</span>
                <span className="text-[13px] text-subtle">{r.signature} {L("مشاهد خاصة")} · {r.scenes} {L("مشهد متاح")} · {r.recipes} {L("فيديوهات جاهزة")} · {r.transitions} {L("انتقالات")} · {r.illus} {L("ستايلات رسم")} · {r.boards} {L("خلفيات")}</span>
                {r.gaps.length ? <span className="ms-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">{L("يحتاج تحديث")}</span> : <span className="ms-auto rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">{L("مكتمل")}</span>}
              </summary>
              <div className="mt-3 flex flex-col gap-2 text-[14px] leading-7 text-navy-900">
                <div><b>{L("المشاهد الخاصة:")}</b> {p.signature.map(name).map((x) => L(x)).join("، ")}</div>
                <div><b>{L("الفيديوهات الجاهزة:")}</b><ul className="list-disc ps-5">{p.recipes.map((x) => <li key={x.name}>{x.name}: <span className="text-subtle" dir="ltr">{x.flow}</span></li>)}</ul></div>
                <div><b>{L("الانتقالات:")}</b> <span dir="ltr">{p.transitions.join(", ")}</span> · <b>{L("الألوان:")}</b> <span dir="ltr">{p.grades.join(", ")}</span> · <b>{L("الخلفيات:")}</b> <span dir="ltr">{p.boards.join(", ")}</span> · <b>{L("الرسم:")}</b> <span dir="ltr">{p.illus.join(", ")}</span></div>
                <div><b>{L("النبرة:")}</b> {p.tone} · <b>{L("الموسيقى:")}</b> <span dir="ltr">{p.music}</span></div>
                {r.gaps.length > 0 && <div className="rounded-xl bg-amber-50 p-3 text-amber-900"><b>{L("الناقص:")}</b><ul className="list-disc ps-5">{r.gaps.map((x) => <li key={x}>{x}</li>)}</ul></div>}
              </div>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
