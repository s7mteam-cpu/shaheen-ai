"use client";
import { useEffect, useRef, useState } from "react";
import { L } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/client";

export type Photo = { path: string; bucket: "uploads" | "results"; url: string; label: string; dev?: "phone" | "desktop" };

/** Photos of the customer's own product / dish / property… added from the device or from their earlier works. */
export function PhotoPicker({ photos, onChange, title, hint, max = 6, devChoice = false }: { devChoice?: boolean; photos: Photo[]; onChange: (p: Photo[]) => void; title: string; hint?: string; max?: number }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mine, setMine] = useState<{ path: string; url: string }[] | null>(null);
  const [open, setOpen] = useState(false);
  const room = max - photos.length;

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true); setErr(null);
    try {
      const supabase = createClient();
      const added: Photo[] = [];
      for (const f of Array.from(list).slice(0, room)) {
        const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "image", type: f.type, size: f.size, name: f.name }) });
        const d = await r.json();
        if (!r.ok) throw new Error(L(d.error));
        const up = await supabase.storage.from("uploads").uploadToSignedUrl(d.path, d.token, f);
        if (up.error) throw new Error(L("تعذّر رفع الصورة."));
        const signed = await supabase.storage.from("uploads").createSignedUrl(d.path, 60 * 60 * 3);
        added.push({ path: d.path, bucket: "uploads", url: signed.data?.signedUrl ?? "", label: "" });
      }
      onChange([...photos, ...added]);
    } catch (e) { setErr((e as Error).message || L("تعذّر رفع الصورة.")); } finally { setBusy(false); if (file.current) file.current.value = ""; }
  }
  useEffect(() => {
    if (!open || mine) return;
    fetch("/api/my-images").then((r) => r.json()).then((d) => setMine(d.items ?? [])).catch(() => setMine([]));
  }, [open, mine]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1"><span className="font-semibold">{L(title)} <span className="font-normal text-subtle">{L("(اختياري)")}</span></span>
        {hint && <span className="text-[13px] text-subtle">{L(hint)}</span>}</div>
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p, i) => (
            <div key={p.path} className="flex flex-col gap-1.5 rounded-2xl border border-line p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
              <input value={p.label} maxLength={60} onChange={(e) => onChange(photos.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="field !py-1.5 text-[13px]" placeholder={L("وش هذي؟ مثال: منسف، ٣ دنانير")} />
              {devChoice && <div className="flex gap-1.5 text-[12.5px]">{([[undefined, "تلقائي"], ["phone", "📱 جوال"], ["desktop", "💻 كمبيوتر"]] as const).map(([v, l]) => <button key={l} type="button" aria-pressed={p.dev === v} onClick={() => onChange(photos.map((x, j) => (j === i ? { ...x, dev: v } : x)))} className={`rounded-full border px-2.5 py-1 font-semibold ${p.dev === v ? "border-navy-800 bg-navy-800 text-white" : "border-field bg-white"}`}>{L(l)}</button>)}</div>}
              <button type="button" onClick={() => onChange(photos.filter((_, j) => j !== i))} className="text-[13px] text-red-700 underline">{L("حذف")}</button>
            </div>
          ))}
        </div>
      )}
      {room > 0 && (
        <div className="flex flex-wrap gap-2">
          <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button type="button" disabled={busy} onClick={() => file.current?.click()} className="btn btn-outline px-4 py-2 text-[14px]">{busy ? L("جاري الرفع…") : `📷 ${L("من جهازي")}`}</button>
          <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-outline px-4 py-2 text-[14px]">🖼️ {L("من أعمالي")}</button>
        </div>
      )}
      {open && room > 0 && (
        <div className="rounded-2xl border border-line p-3">
          {!mine ? <span className="text-[13px] text-subtle">{L("جاري التحميل…")}</span>
            : !mine.length ? <span className="text-[13px] text-subtle">{L("ما عندك صور سابقة بعد.")}</span>
            : <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{mine.map((m) => (
              <button key={m.path} type="button" disabled={photos.length >= max || photos.some((p) => p.path === m.path)} onClick={() => onChange([...photos, { path: m.path, bucket: "results", url: m.url, label: "" }])} className="overflow-hidden rounded-xl border border-line disabled:opacity-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="aspect-square w-full object-cover" />
              </button>))}</div>}
        </div>
      )}
      <span className="text-[12px] text-subtle">{L("حتى")} {max} {L("صور. اكتب لكل صورة اسمها أو سعرها، وشاهين يحطها بالمشهد المناسب.")}</span>
      {err && <p role="alert" className="text-[13px] text-red-700">{err}</p>}
    </div>
  );
}
