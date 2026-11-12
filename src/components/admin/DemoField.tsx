"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { L } from "@/lib/i18n/ui";

/** «فيديو المثال»: paste a YouTube link, or upload a video (straight to storage), or remove it. Saved with the tool's «حفظ». */
export function DemoField({ tool, initial, name = "demo_url" }: { tool: string; initial: string; name?: string }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok?: string; error?: string }>({});

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setNote({});
    try {
      const r = await fetch("/api/admin/demo-upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool, type: file.type, size: file.size, name: file.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      const { error } = await createClient().storage.from("site").uploadToSignedUrl(d.path, d.token, file);
      if (error) throw new Error(L("تعذّر رفع الملف."));
      setUrl(d.url);
      setNote({ ok: L("✓ انرفع الفيديو. اضغط «حفظ» تحت عشان يطلع بالموقع.") });
    } catch (e) {
      setNote({ error: e instanceof Error ? L(e.message) : L("تعذّر رفع الملف.") });
    } finally { setBusy(false); }
  }

  const uploaded = url && !/youtu/.test(url);
  return (
    <div className="flex flex-col gap-2">
      <span className="label">{L("رابط يوتيوب")}</span>
      <input name={name} value={url} onChange={(e) => setUrl(e.target.value)} dir="ltr" placeholder="https://youtube.com/shorts/…" className="field text-left" />
      <span className="text-[12px] text-subtle">{L("نصيحة: ارفعه على يوتيوب «غير مدرج» (Unlisted)، فما يطلع بالبحث ويطلع بس بموقعك. روابط Shorts تطلع طولية 9:16.")}</span>
      <div className="flex flex-wrap items-center gap-2">
        <label className={`btn btn-outline cursor-pointer px-4 py-2 text-[13px] ${busy ? "pointer-events-none opacity-50" : ""}`}>
          {busy ? L("جاري الرفع…") : L("⬆️ أو ارفع فيديو من جهازك (لين 50 ميجا)")}
          <input type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
        {url && <button type="button" onClick={() => { setUrl(""); setNote({ ok: L("انشال الفيديو. اضغط «حفظ» تحت.") }); }} className="btn border border-red-300 px-4 py-2 text-[13px] font-semibold text-red-700 hover:bg-red-50">{L("🗑 احذف الفيديو")}</button>}
        {uploaded && <a href={url} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-navy-700 underline">{L("شوف الفيديو المرفوع")}</a>}
      </div>
      {note.ok && <p role="status" className="text-[13px] font-semibold text-emerald-700">{note.ok}</p>}
      {note.error && <p role="alert" className="text-[13px] font-semibold text-red-700">{note.error}</p>}
    </div>
  );
}
