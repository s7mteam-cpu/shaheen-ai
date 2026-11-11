import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL } from "@/lib/server/lang";
import { INDUSTRIES } from "@/design/industries";
import { DECO_IDS, FRAME_IDS, LAYOUT_IDS, STICKER_IDS } from "@/design/spec";
import { DESIGN_PACKS, DESIGN_TARGET, designReport } from "@/design/packs";
import { PACKS, packReport } from "@/remotion/packs";
import { BOARD_STYLES, CAPTION_STYLES, GRADES, GRAPHIC_KINDS, LAYOUTS, TRANSITIONS } from "@/remotion/montage";
import { ILLUS_STYLES } from "@/remotion/styles";
import { PLAYBOOK } from "@/remotion/playbook";

export const dynamic = "force-dynamic";

const TOOLS = [
  { id: "post", label: "البوستات", kind: "design" },
  { id: "carousel", label: "الكاروسيل", kind: "design" },
  { id: "ad-design", label: "الإعلانات", kind: "design" },
  { id: "motion-video", label: "الموشن جرافيك", kind: "video" },
  { id: "video-editing", label: "المونتاج", kind: "video" },
  { id: "lesson-video", label: "الفيديو التعليمي", kind: "video" },
] as const;

// What "complete" means for one field, per kind of tool
const VIDEO_TARGET = { signature: 6, recipes: 3, transitions: 4, illus: 3, boards: 3 };

type Row = { id: string; label: string; group: string; cells: (string | number)[]; gaps: string[] };

/** Library dashboard: for every tool, every field and what it has — and what's still missing. */
export default async function Packs({ searchParams }: { searchParams: Promise<{ tool?: string }> }) {
  const L = await getL();
  await guardPage("packs");
  const { tool: t } = await searchParams;
  const tool = TOOLS.find((x) => x.id === t) ?? TOOLS[0];
  const groups = [...new Set(INDUSTRIES.map((i) => i.group))];

  // what each field borrows most from other packs (a hint for its next update)
  const borrowedBy: Record<string, Record<string, number>> = {};
  if (tool.kind === "video") {
    const { data } = await createAdminClient().from("jobs").select("domain:input->spec->>domain, borrowed:input->spec->borrowed").eq("tool_id", tool.id).order("created_at", { ascending: false }).limit(1000);
    for (const j of (data ?? []) as { domain: string | null; borrowed: string[] | null }[]) {
      if (!j.domain || !Array.isArray(j.borrowed)) continue;
      const m = (borrowedBy[j.domain] ??= {});
      for (const k of j.borrowed) m[k] = (m[k] ?? 0) + 1;
    }
  }
  const sceneName = (k: string) => GRAPHIC_KINDS.find((g) => g[0] === k)?.[1] ?? k;
  const topBorrowed = (id: string) => Object.entries(borrowedBy[id] ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, n]) => `${sceneName(k)} ×${n}`).join("، ") || "—";

  let head: string[] = [];
  let rows: Row[] = [];
  let lib: [string, number][] = [];
  if (tool.kind === "design") {
    head = ["الإصدار", "مجموعات ألوان", "تخطيطات", "زخارف", "إطارات", "ملصقات", "خطوط", "أيقونات", "ستايلات صور", "أفكار جاهزة"];
    rows = INDUSTRIES.map((i) => {
      const p = DESIGN_PACKS[i.id];
      const r = designReport(p);
      return { id: i.id, label: i.label, group: i.group, cells: [`v${p.version}`, r.palettes, r.layouts, r.decos, r.frames, r.stickers, r.fonts, r.icons, r.photo, r.recipes], gaps: r.gaps };
    });
    lib = [["تخطيطات بالمكتبة", LAYOUT_IDS.length], ["زخارف", DECO_IDS.length], ["إطارات", FRAME_IDS.length - 1], ["أنواع الملصقات", STICKER_IDS.length], ["مجالات", INDUSTRIES.length]];
  } else {
    head = ["الإصدار", "مشاهد خاصة", "مشاهد متاحة", "فيديوهات جاهزة", "انتقالات", "ألوان", "ترجمة", "خلفيات", "ستايلات رسم", "يستعير أكثر"];
    const list = tool.id === "lesson-video" ? INDUSTRIES.filter((i) => i.group === "تعليم وتدريب" || ["clinic", "nutrition", "tech", "law"].includes(i.id)) : INDUSTRIES;
    rows = list.map((i) => {
      const p = PACKS.find((x) => x.id === i.id)!;
      const r = packReport(p);
      const gaps: string[] = [];
      if (r.signature < VIDEO_TARGET.signature) gaps.push(`مشاهد خاصة ${r.signature}/${VIDEO_TARGET.signature}`);
      if (r.recipes < VIDEO_TARGET.recipes) gaps.push(`فيديوهات ${r.recipes}/${VIDEO_TARGET.recipes}`);
      if (r.transitions < VIDEO_TARGET.transitions) gaps.push(`انتقالات ${r.transitions}/${VIDEO_TARGET.transitions}`);
      if (r.illus < VIDEO_TARGET.illus) gaps.push(`رسم ${r.illus}/${VIDEO_TARGET.illus}`);
      if (r.boards < VIDEO_TARGET.boards) gaps.push(`خلفيات ${r.boards}/${VIDEO_TARGET.boards}`);
      return { id: i.id, label: i.label, group: i.group, cells: [`v${p.version}`, r.signature, r.scenes, r.recipes, r.transitions, r.grades, r.captions, r.boards, r.illus, topBorrowed(i.id)], gaps };
    });
    lib = [["أنواع المشاهد", GRAPHIC_KINDS.length], ["انتقالات", TRANSITIONS.length], ["ستايلات ألوان", GRADES.length], ["ستايلات ترجمة", CAPTION_STYLES.length], ["خلفيات", BOARD_STYLES.length], ["ستايلات رسم", ILLUS_STYLES.length], ...(tool.id === "video-editing" ? [["أشكال المتكلم", LAYOUTS.length] as [string, number]] : []), ["أدلة المجالات للذكاء", PLAYBOOK.length]];
  }
  const done = rows.filter((r) => !r.gaps.length).length;

  return (
    <div className="flex max-w-6xl flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">{L("مكتبة المجالات")}</h1>
        <p className="mt-1 text-sm text-subtle">{L("لكل أداة: كل مجال ووش عنده بالضبط، ووش الناقص. تشوف منها وين نضيف بالتحديث الجاي.")}</p>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label={L("الأدوات")}>
        {TOOLS.map((x) => <Link key={x.id} href={`/admin/packs?tool=${x.id}`} aria-current={x.id === tool.id ? "page" : undefined} className={`chip ${x.id === tool.id ? "!border-navy-800 !bg-navy-800 !text-white" : ""}`}>{L(x.label)}</Link>)}
      </nav>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="card p-4"><div className="text-[13px] text-subtle">{L("مجالات مكتملة")}</div><div className="mt-1 text-[26px] font-bold text-emerald-700">{done} / {rows.length}</div></div>
        {lib.map(([l, v]) => <div key={l} className="card p-4"><div className="text-[13px] text-subtle">{L(l)}</div><div className="mt-1 text-[26px] font-bold text-navy-900">{v}</div></div>)}
      </div>
      <p className="text-[13px] text-subtle">{tool.kind === "design"
        ? L(`الهدف لكل مجال: ${DESIGN_TARGET.palettes} مجموعات ألوان، ${DESIGN_TARGET.layouts} تخطيطات، ${DESIGN_TARGET.decos} زخارف، ${DESIGN_TARGET.frames} إطارات، ${DESIGN_TARGET.stickers} ملصقات، ${DESIGN_TARGET.photo} ستايلات صور، ${DESIGN_TARGET.recipes} أفكار جاهزة. كل عميل ياخذ تشكيلة مختلفة منها.`)
        : L(`الهدف لكل مجال: ${VIDEO_TARGET.signature} مشاهد خاصة، ${VIDEO_TARGET.recipes} فيديوهات جاهزة، ${VIDEO_TARGET.transitions} انتقالات، ${VIDEO_TARGET.illus} ستايلات رسم، ${VIDEO_TARGET.boards} خلفيات. «يستعير أكثر» = المشاهد اللي يجيبها الذكاء الاصطناعي من حزم ثانية لهالمجال — إذا تكررت، نضيف لهالمجال مشهد خاص بالتحديث الجاي.`)}</p>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-[14px]">
          <thead className="bg-tint text-navy-900"><tr><th className="p-3 text-start">{L("المجال")}</th>{head.map((h) => <th key={h} className="p-3 text-center font-semibold">{L(h)}</th>)}<th className="p-3 text-start">{L("الحالة")}</th></tr></thead>
          <tbody>
            {groups.map((g) => {
              const list = rows.filter((r) => r.group === g);
              if (!list.length) return null;
              return [
                <tr key={g} className="bg-canvas"><td colSpan={head.length + 2} className="px-3 py-2 text-[13px] font-bold text-subtle">{L(g)}</td></tr>,
                ...list.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="p-3 font-semibold text-navy-900">{L(r.label)}</td>
                    {r.cells.map((c, i) => <td key={i} className={`p-3 text-center ${typeof c === "number" ? "font-latin" : "text-[13px]"}`}>{typeof c === "string" && c !== "—" && !c.startsWith("v") ? L(c) : c}</td>)}
                    <td className="p-3">{r.gaps.length
                      ? <span className="inline-flex flex-wrap gap-1">{r.gaps.map((x) => <span key={x} className="rounded-full bg-amber-100 px-2 py-0.5 text-[12px] font-semibold text-amber-800">{L(x)}</span>)}</span>
                      : <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[12px] font-bold text-emerald-800">{L("مكتمل")}</span>}</td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>

      {tool.kind === "video" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[18px] font-bold text-navy-900">{L("تفاصيل كل حزمة")}</h2>
          {rows.map((row) => {
            const p = PACKS.find((x) => x.id === row.id)!;
            const name = (k: string) => GRAPHIC_KINDS.find((g) => g[0] === k)?.[1] ?? k;
            return (
              <details key={p.id} className="card p-4">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2.5"><span className="font-bold text-navy-900">{L(row.label)}</span><span dir="ltr" className="rounded-lg bg-navy-900 px-2 py-0.5 font-latin text-xs font-bold text-white">v{p.version}</span><span className="text-[13px] text-subtle">{p.updated}</span></summary>
                <div className="mt-3 flex flex-col gap-2 text-[14px] leading-7 text-navy-900">
                  <div><b>{L("المشاهد الخاصة:")}</b> {p.signature.map((k) => L(name(k))).join("، ")}</div>
                  <div><b>{L("الفيديوهات الجاهزة:")}</b><ul className="list-disc ps-5">{p.recipes.map((x) => <li key={x.name}>{x.name}: <span className="text-subtle" dir="ltr">{x.flow}</span></li>)}</ul></div>
                  <div><b>{L("الانتقالات:")}</b> <span dir="ltr">{p.transitions.join(", ")}</span> · <b>{L("الألوان:")}</b> <span dir="ltr">{p.grades.join(", ")}</span> · <b>{L("الخلفيات:")}</b> <span dir="ltr">{p.boards.join(", ")}</span> · <b>{L("الرسم:")}</b> <span dir="ltr">{p.illus.join(", ")}</span></div>
                  <div><b>{L("النبرة:")}</b> {p.tone}</div>
                </div>
              </details>
            );
          })}
        </section>
      )}
    </div>
  );
}
