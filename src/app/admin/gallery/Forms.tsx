"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { SHOWCASE_CATS } from "@/lib/showcase";
import { addShowcase, updateShowcase } from "./actions";

type Res = { ok?: string; error?: string } | undefined;
type Up = { url: string; kind: "image" | "video"; name: string };
const Msg = ({ r }: { r: Res }) => (r?.error ? <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span> : r?.ok ? <span className="text-sm font-semibold text-green-700">{r.ok}</span> : null);
function Save({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending || disabled} className="btn btn-primary px-6 py-2.5 disabled:opacity-50">{pending ? "…" : label}</button>;
}
const Cats = ({ value }: { value?: string }) => (
  <select name="category" defaultValue={value ?? "post"} className="field">{SHOWCASE_CATS.map(([k, ar]) => <option key={k} value={k}>{ar}</option>)}</select>
);

/** Add a work: upload one file (post / reel) or several (carousel: the first is the cover), straight to storage (up to 50 MB each). */
export function AddShowcase() {
  const [r, act] = useActionState(addShowcase, undefined);
  const [files, setFiles] = useState<Up[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setErr("");
    for (const file of Array.from(list)) {
      setBusy(`جاري رفع ${file.name}…`);
      try {
        const res = await fetch("/api/admin/gallery-upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: file.type, size: file.size, name: file.name }) });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error);
        const { error } = await createClient().storage.from("site").uploadToSignedUrl(d.path, d.token, file);
        if (error) throw new Error("تعذّر رفع الملف.");
        setFiles((f) => [...f, { url: d.url, kind: d.video ? "video" : "image", name: file.name }]);
      } catch (e) { setErr(e instanceof Error ? e.message : "تعذّر رفع الملف."); }
    }
    setBusy("");
  }
  if (r?.ok && files.length) setFiles([]);
  return (
    <form action={act} className="card flex flex-col gap-4 p-5">
      <h2 className="text-lg font-bold text-navy-900">+ إضافة عمل للمعرض</h2>
      {files.map((f) => <span key={f.url}><input type="hidden" name="url" value={f.url} /><input type="hidden" name="kind" value={f.kind} /></span>)}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5"><span className="label">العنوان</span><input name="title" required maxLength={120} placeholder="مثلاً: ريلز افتتاح مقهى" className="field" /></label>
        <label className="flex flex-col gap-1.5"><span className="label">النوع</span><Cats /></label>
      </div>
      <label className="flex flex-col gap-1.5"><span className="label">وصف قصير (اختياري)</span><textarea name="description" rows={2} maxLength={600} placeholder="شنو سوّينا وبأي أداة" className="field" /></label>
      <div className="flex flex-col gap-2">
        <span className="label">الملفات (صورة أو فيديو، لين 50 ميجا لكل ملف). للكاروسيل اختر كل الصور، وأول وحدة تصير الغلاف.</span>
        <label className={`btn btn-outline w-fit cursor-pointer px-4 py-2.5 text-sm ${busy ? "pointer-events-none opacity-50" : ""}`}>
          {busy || "⬆️ اختر الملفات"}
          <input type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} />
        </label>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={f.url} className="relative h-20 w-16 overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {f.kind === "video" ? <video src={f.url} muted className="h-full w-full object-cover" /> : <img src={f.url} alt="" className="h-full w-full object-cover" />}
                {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-navy-900/80 text-center text-[10px] text-white">الغلاف</span>}
                <button type="button" aria-label="شيل" onClick={() => setFiles((x) => x.filter((y) => y.url !== f.url))} className="absolute end-0.5 top-0.5 rounded-full bg-white/90 px-1.5 text-xs text-red-700">×</button>
              </div>
            ))}
          </div>
        )}
        {err && <span role="alert" className="text-sm font-semibold text-red-700">{err}</span>}
      </div>
      <div className="flex flex-wrap gap-5 text-sm font-semibold">
        <label className="flex items-center gap-2"><input type="checkbox" name="in_app" defaultChecked className="h-4 w-4" />يطلع بـ «أعمال صنعت بشاهين» داخل المنصة</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="on_home" className="h-4 w-4" />يطلع بصفحة الموقع الرئيسية</label>
        <label className="flex items-center gap-2">الترتيب <input name="sort_order" type="number" defaultValue={0} className="field w-20 py-1.5" /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3"><Save label="إضافة" disabled={!files.length || !!busy} /><Msg r={r} /></div>
    </form>
  );
}

export function EditShowcase({ g }: { g: { id: string; title: string; description: string; category: string; sort_order: number; is_published: boolean; in_app: boolean; on_home: boolean; extra: number } }) {
  const [r, act] = useActionState(updateShowcase, undefined);
  return (
    <form action={act} className="flex flex-col gap-2 p-3">
      <input type="hidden" name="id" value={g.id} />
      <input name="title" defaultValue={g.title} className="field py-2 text-sm" aria-label="العنوان" />
      <Cats value={g.category} />
      <textarea name="description" defaultValue={g.description} rows={2} className="field py-2 text-sm" aria-label="الوصف" placeholder="الوصف" />
      {g.extra > 0 && <span className="text-[12px] text-subtle">كاروسيل: {g.extra + 1} ملفات</span>}
      <div className="flex flex-col gap-1 text-[13px]">
        <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={g.is_published} />منشور</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="in_app" defaultChecked={g.in_app} />داخل المنصة</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="on_home" defaultChecked={g.on_home} />الصفحة الرئيسية</label>
        <label className="flex items-center gap-2">الترتيب <input name="sort_order" type="number" defaultValue={g.sort_order} className="field w-20 py-1" /></label>
      </div>
      <div className="flex gap-2"><Save label="حفظ" /><button name="delete" value="1" onClick={(e) => { if (!confirm("تحذف هالعمل وملفاته؟")) e.preventDefault(); }} className="btn btn-outline flex-1 py-2 text-sm text-red-700">حذف</button></div>
      <Msg r={r} />
    </form>
  );
}
