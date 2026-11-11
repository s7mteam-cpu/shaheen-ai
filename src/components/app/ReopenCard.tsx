"use client";
import { L, LT } from "@/lib/i18n/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** A finished video: watch, download, or open it again in the studio for more edits. */
export function ReopenCard({ jobId, url, cost, toolId }: { jobId: string; url?: string; cost: number; toolId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function reopen() {
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/jobs/${jobId}/reopen`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.refresh();
    } catch (e) { setError((e as Error).message || L("صار خطأ.")); setBusy(false); }
  }
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-3xl border border-line bg-white p-6 text-center">
      <h2 className="text-[20px] font-bold text-navy-900">{L("✓ الفيديو جاهز")}</h2>
      {url && <video src={url} controls playsInline className="max-h-[60vh] w-full rounded-2xl bg-black" />}
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        {url && <a href={url} download className="btn btn-gold flex-1 py-3">{L("⬇️ تحميل")}</a>}
        <button type="button" disabled={busy} onClick={reopen} className="btn btn-primary flex-1 py-3">{busy ? L("جاري الفتح…") : LT(`✏️ عدّل الفيديو (${cost} ريشة)`, `✏️ Edit video (${cost} credits)`)}</button>
      </div>
      <p className="text-[13px] text-subtle">{L("يرجع الفيديو للاستوديو بكل تعديلاتك، تعدّل اللي تبيه وتصدّره من جديد.")}</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      <Link href={`/app/tools/${toolId}`} className="text-[14px] text-navy-700 underline">{L("إنشاء فيديو جديد")}</Link>
    </div>
  );
}
