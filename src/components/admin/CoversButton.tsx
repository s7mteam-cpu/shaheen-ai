"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { L, LT } from "@/lib/i18n/ui";

/** «ولّد صور واقعية»: one click → realistic AI pictures for the tool cards (only those without a picture, unless «استبدل» is ticked). */
export function CoversButton({ id }: { id?: string }) {
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState(!!id);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  async function run() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/covers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ids: id ? [id] : [], replace }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || L("صار خطأ، حاول مرة ثانية."));
      setMsg(LT(`✓ تجهزت ${d.done.length} صورة${d.failed.length ? ` · ما ضبطت ${d.failed.length}` : ""}`, `✓ ${d.done.length} pictures ready${d.failed.length ? ` · ${d.failed.length} failed` : ""}`));
      router.refresh();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={busy} onClick={run} className={id ? "btn btn-outline px-4 py-2 text-[13px]" : "btn btn-gold px-5 py-2.5"}>
        {busy ? L("جاري التوليد… (لين دقيقتين)") : id ? L("✨ ولّد صورة واقعية") : L("✨ ولّد صور واقعية لكل الأدوات")}
      </button>
      {!id && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="h-4 w-4" />{L("استبدل الصور اللي رفعتها بعد")}</label>}
      {msg && <span role="status" className="text-[13px] font-semibold text-emerald-700">{msg}</span>}
    </div>
  );
}
