import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL } from "@/lib/server/lang";
import Link from "next/link";
import { approveTemplate, createTemplate, deleteTemplate, retryTemplate, setTags } from "./actions";

export const dynamic = "force-dynamic";
const STATUS: Record<string, string> = { converting: "⏳ يتحوّل…", review: "👀 بانتظار اعتمادك", approved: "✅ معتمد", failed: "⚠️ فشل التحويل" };

export default async function TemplatesAdmin({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const L = await getL();
  await guardPage("templates");
  const job = String((await searchParams).job ?? "").slice(0, 24);
  const admin = createAdminClient();
  const { data: rows } = await admin.from("free_templates").select("id,name,tags,status,thumb_path,error,fields,assets,created_at").order("created_at", { ascending: false }).limit(60);
  const paths = (rows ?? []).map((r) => r.thumb_path).filter(Boolean) as string[];
  const signed = paths.length ? (await admin.storage.from("results").createSignedUrls(paths, 60 * 60)).data ?? [] : [];
  const url = (p?: string | null) => (p ? signed.find((s) => s.path === p)?.signedUrl ?? "" : "");
  const allTags = [...new Set((rows ?? []).flatMap((r) => r.tags ?? []))].sort();
  const shown = (rows ?? []).filter((r) => !job || (r.tags ?? []).includes(job));
  const converting = (rows ?? []).some((r) => r.status === "converting");
  return (
    <div className="flex flex-col gap-5">
      {converting && <meta httpEquiv="refresh" content="20" />}
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">{L("مكتبة الأساليب")}</h1>
        <p className="mt-1 text-sm text-subtle">{L("ارفع كود تصميم موشن. إذا كان كود Remotion جاهز بصيغة شاهين (من جيميناي بالرسالة الثابتة) يدخل مباشرة: شاهين ينظّف الأخطاء الصغيرة تلقائيًا ثم يفحصه فحصًا حقيقيًا ويسوّي صورة، وهذا بدون أي تكلفة. وإذا كان غير كذا (صفحة HTML مثلًا) يحوّله Claude ويكلّف سنتات للقالب. بعد الفحص تشوف صورة منه وتعتمده. المكتبة داخلية ولا تظهر للعملاء.")}</p>
      </div>
      <form action={createTemplate} className="card grid gap-3 p-5 md:grid-cols-2">
        <div className="flex flex-col gap-1.5"><label className="label">{L("اسم القالب")}</label><input name="name" required maxLength={60} className="field" placeholder={L("مثال: شرح طبي بخمس نقاط")} /></div>
        <div className="flex flex-col gap-1.5"><label className="label">{L("المهن (مفصولة بفاصلة)")}</label><input name="tags" className="field" placeholder={L("طبي، شرح، داكن")} /></div>
        <div className="flex flex-col gap-1.5 md:col-span-2"><label className="label">{L("الكود (الصقه هنا)")}</label><textarea name="code" rows={8} dir="ltr" className="field font-mono text-[12px]" placeholder="<!DOCTYPE html> ..." /></div>
        <div className="flex flex-col gap-1.5"><label className="label">{L("أو ملف الكود")}</label><input name="file" type="file" accept=".html,.htm,.txt,.ts,.tsx,.jsx,.js" className="field" /></div>
        <div className="flex items-end"><button className="btn btn-gold px-6 py-3">{L("أضف للمكتبة")}</button></div>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] text-subtle">{L("المهنة")}:</span>
        <Link href="/admin/templates" className={`rounded-full border px-3 py-1 text-[13px] ${!job ? "bg-navy-900 text-white" : ""}`}>{L("الكل")} ({rows?.length ?? 0})</Link>
        {allTags.map((t) => <Link key={t} href={`/admin/templates?job=${encodeURIComponent(t)}`} className={`rounded-full border px-3 py-1 text-[13px] ${job === t ? "bg-navy-900 text-white" : ""}`}>{t} ({(rows ?? []).filter((r) => (r.tags ?? []).includes(t)).length})</Link>)}
      </div>
      {shown.map((r) => (
        <div key={r.id} className="card flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-bold text-navy-900">{r.name}</p><p className="text-[12px] text-subtle">{(r.tags ?? []).join(" · ")} {Array.isArray(r.fields) ? `· ${r.fields.length} ${L("حقل نص")}` : ""}</p></div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-[13px]">{L(STATUS[r.status] ?? r.status)}</span>
          </div>
          <form action={setTags} className="flex flex-wrap items-center gap-2"><input type="hidden" name="id" value={r.id} /><label className="text-[12px] text-subtle">{L("المهن")}</label><input name="tags" defaultValue={(r.tags ?? []).join("، ")} dir="auto" placeholder={L("طبيب، مطعم، عقارات")} className="field min-w-[220px] flex-1 py-1.5 text-[13px]" /><button className="btn btn-outline px-4 py-1.5 text-[13px]">{L("حفظ المهن")}</button></form>
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
