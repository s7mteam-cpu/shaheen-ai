import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL } from "@/lib/server/lang";
import Link from "next/link";
import { INDUSTRIES } from "@/design/industries";
import { FieldPicker } from "./FieldPicker";
import { approveTemplate, createTemplate, deleteTemplate, retryTemplate, setTags } from "./actions";

export const dynamic = "force-dynamic";
const STATUS: Record<string, string> = { converting: "⏳ يتحوّل…", review: "👀 بانتظار اعتمادك", approved: "✅ معتمد", failed: "⚠️ فشل التحويل" };

export default async function TemplatesAdmin({ searchParams }: { searchParams: Promise<{ f?: string; g?: string }> }) {
  const L = await getL();
  await guardPage("templates");
  const sp = await searchParams;
  const fid = INDUSTRIES.some((i) => i.id === sp.f) ? String(sp.f) : "";
  const gid = INDUSTRIES.some((i) => i.group === sp.g) ? String(sp.g) : "";
  const admin = createAdminClient();
  const { data: rows } = await admin.from("free_templates").select("id,name,tags,status,thumb_path,error,fields,assets,created_at").order("created_at", { ascending: false }).limit(60);
  const paths = (rows ?? []).map((r) => r.thumb_path).filter(Boolean) as string[];
  const signed = paths.length ? (await admin.storage.from("results").createSignedUrls(paths, 60 * 60)).data ?? [] : [];
  const url = (p?: string | null) => (p ? signed.find((s) => s.path === p)?.signedUrl ?? "" : "");
  const has = (r: { tags: string[] | null }, ids: string[]) => (r.tags ?? []).some((t) => ids.includes(t));
  const groups = [...new Set(INDUSTRIES.map((i) => i.group))];
  const idsOf = (g: string) => INDUSTRIES.filter((i) => i.group === g).map((i) => i.id);
  const known = INDUSTRIES.map((i) => i.id);
  const noField = (rows ?? []).filter((r) => !has(r, known)).length;
  const shown = (rows ?? []).filter((r) => (fid ? has(r, [fid]) : gid ? has(r, idsOf(gid)) : true));
  const converting = (rows ?? []).some((r) => r.status === "converting");
  return (
    <div className="flex flex-col gap-5">
      {converting && <meta httpEquiv="refresh" content="20" />}
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">{L("مكتبة الأساليب")}</h1>
        <p className="mt-1 text-sm text-subtle">{L("الصق كود HTML الأصلي من جيميناي: نحتفظ به كما هو بالضبط (نفس الشكل والحركة والقوة) ونعرضه ونسجّله فيديو بدون Claude وبدون تكلفة. كود Remotion الجاهز يدخل بالرفع المباشر. زر «حوّل بClaude» فقط لمن يبي يتحوّل لصيغة قابلة للتعديل الكامل.")}</p>
      </div>
      <form action={createTemplate} className="card grid gap-3 p-5 md:grid-cols-2">
        <div className="flex flex-col gap-1.5"><label className="label">{L("اسم القالب")}</label><input name="name" required maxLength={60} className="field" placeholder={L("مثال: شرح طبي بخمس نقاط")} /></div>
        <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">{L("المجالات (اختر مجال أو أكثر، أو «الكل» للمجموعة)")}</label><FieldPicker name="tags" /></div>
        <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">{L("الكود (الصقه هنا)")}</label><textarea name="code" rows={8} dir="ltr" className="field font-mono text-[12px]" placeholder="<!DOCTYPE html> ..." /></div>
        <div className="flex flex-col gap-1.5"><label className="label">{L("أو ملف الكود")}</label><input name="file" type="file" accept=".html,.htm,.txt,.ts,.tsx,.jsx,.js" className="field" /></div>
        <div className="flex items-end"><button className="btn btn-gold px-6 py-3">{L("أضف للمكتبة")}</button></div>
      </form>
      <div className="card flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/templates/flow" className="btn btn-gold px-4 py-1.5 text-[13px]">🧪 {L("جرّب المسار الكامل")}</Link>
          <Link href="/admin/templates/gemini" className="btn btn-gold px-4 py-1.5 text-[13px]">🚀 {L("التجربة الكبرى (جيميناي)")}</Link>
          <Link href="/admin/templates" className={`rounded-full border px-3 py-1 text-[13px] ${!fid && !gid ? "bg-navy-900 text-white" : ""}`}>{L("الكل")} ({rows?.length ?? 0})</Link>
          <span className="text-[12px] text-subtle">{L("بدون مجال")}: {noField}</span>
        </div>
        {groups.map((g) => (
          <div key={g} className="flex flex-wrap items-center gap-1.5">
            <Link href={`/admin/templates?g=${encodeURIComponent(g)}`} className={`rounded-full border px-3 py-1 text-[12px] font-bold ${gid === g && !fid ? "bg-navy-900 text-white" : ""}`}>{L(g)} ({(rows ?? []).filter((r) => has(r, idsOf(g))).length})</Link>
            {INDUSTRIES.filter((i) => i.group === g).map((i) => {
              const n = (rows ?? []).filter((r) => has(r, [i.id])).length;
              return <Link key={i.id} href={`/admin/templates?f=${i.id}`} className={`rounded-full border px-3 py-1 text-[12px] ${fid === i.id ? "bg-navy-900 text-white" : n === 0 ? "text-subtle" : ""}`}>{L(i.label)} ({n})</Link>;
            })}
          </div>
        ))}
      </div>
      {shown.map((r) => (
        <div key={r.id} className="card flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-bold text-navy-900">{r.name}</p><p className="text-[12px] text-subtle">{Array.isArray(r.fields) ? `· ${r.fields.length} ${L("حقل نص")}` : ""}</p></div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-[13px]">{L(STATUS[r.status] ?? r.status)}</span>
          </div>
          <details className="rounded-xl border p-2"><summary className="cursor-pointer text-[13px]">{(r.tags ?? []).filter((t: string) => known.includes(t)).map((t: string) => INDUSTRIES.find((i) => i.id === t)?.label).join(" · ") || L("بدون مجال (عام)")} — {L("غيّر المجالات")}</summary><form action={setTags} className="mt-2 flex flex-col gap-2"><input type="hidden" name="id" value={r.id} /><FieldPicker name="tags" defaultValue={r.tags ?? []} /><button className="btn btn-outline w-fit px-4 py-1.5 text-[13px]">{L("حفظ المجالات")}</button></form></details>
          {url(r.thumb_path) && <img src={url(r.thumb_path)} alt={r.name} className="w-full max-w-[900px] rounded-xl border" />}
          {Array.isArray((r.assets as { _notes?: string[] } | null)?._notes) && ((r.assets as { _notes: string[] })._notes).length > 0 && <p className="rounded-lg bg-amber-50 p-2 text-[12px] text-amber-900">🧹 {L("صلّحنا تلقائيًا")}: {((r.assets as { _notes: string[] })._notes).join(" · ")}</p>}
          {r.error && <p dir="auto" className="rounded-lg bg-red-50 p-2 text-start text-[12px] text-red-800">{r.error}</p>}
          <div className="flex flex-wrap gap-2">
            {(r.status === "review" || r.status === "approved") && <Link href={`/admin/templates/${r.id}`} className="btn btn-gold px-5 py-2.5">🎬 {L("جرّب القالب")}</Link>}
            {r.status === "review" && <form action={approveTemplate}><input type="hidden" name="id" value={r.id} /><button className="btn btn-gold px-5 py-2.5">✅ {L("اعتمد")}</button></form>}
            {(r.status === "failed" || r.status === "review" || r.status === "converting") && <form action={retryTemplate}><input type="hidden" name="id" value={r.id} /><button className="btn btn-outline px-5 py-2.5">🔁 {L("أعد الفحص")}</button></form>}
            {(r.status === "failed" || r.status === "review") && <form action={retryTemplate}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="via" value="claude" /><button className="btn btn-outline px-5 py-2.5">🤖 {L("حوّل بClaude")}</button></form>}
            <form action={deleteTemplate}><input type="hidden" name="id" value={r.id} /><button className="btn btn-outline px-5 py-2.5 text-red-700">🗑 {L("احذف")}</button></form>
          </div>
        </div>
      ))}
      {!shown.length && <p className="text-sm text-subtle">{L("ما في قوالب بعد.")}</p>}
    </div>
  );
}
