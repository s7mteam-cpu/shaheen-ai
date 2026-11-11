"use client";
import { L, LT } from "@/lib/i18n/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { Icon } from "@/components/Icon";

export type WorkFile = { url: string; type: string; caption?: string };
export type Work = { id: string; title: string | null; tool_id: string; toolName: string; status: string; created_at: string; files: WorkFile[]; error?: string | null; progress?: number };

export function Media({ f, className = "" }: { f: WorkFile; className?: string }) {
  if (f.type.startsWith("video")) return <video src={f.url} controls playsInline className={`w-full bg-black ${className}`} />;
  if (f.type.startsWith("audio")) return <div className={`flex items-center bg-tint p-4 ${className}`}><audio src={f.url} controls className="w-full" /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={f.url} alt="" className={`w-full object-cover ${className}`} />;
}

const status: Record<string, [string, string]> = {
  draft: ["مسودة — كمّل التعديل", "bg-tint text-navy-700"],
  queued: ["في الانتظار", "bg-gold-100 text-navy-900"],
  running: ["قيد التنفيذ", "bg-tint text-navy-700"],
  done: ["جاهز", "bg-emerald-50 text-emerald-800"],
  failed: ["فشل — رجعت الريش", "bg-red-50 text-red-800"],
};

export function WorkCard({ w: initial, onDelete }: { w: Work; onDelete?: (id: string) => void }) {
  const [w, setW] = useState(initial);
  const pending = w.status === "queued" || w.status === "running";
  // Live progress while it is being made.
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/jobs/${w.id}`).catch(() => null);
      if (!r?.ok) return;
      const d = await r.json();
      setW((x) => ({ ...x, status: d.status, progress: d.progress ?? x.progress, error: d.error, files: (d.files ?? []).map((f: WorkFile) => ({ url: f.url, type: f.type, caption: f.caption })) }));
    }, 4000);
    return () => clearInterval(t);
  }, [pending, w.id]);
  const first = w.files[0];
  const [label, cls] = status[w.status] ?? status.queued;
  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="relative aspect-square bg-tint">
        {first ? <Media f={first} className="h-full" /> : pending ? <div className="flex h-full items-center p-5"><Progress value={w.progress ?? 0} label={w.status === "queued" && !w.progress ? L("في الطابور…") : L("جاري المعالجة…")} /></div> : <div className="flex h-full items-center justify-center text-sm text-subtle">{L(label)}…</div>}
        <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{L(label)}</span>
      </div>
      <div className="flex flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-1 text-[15px] font-bold text-navy-900">{w.title || w.toolName}</h3>
        <span className="text-[13px] text-subtle">{w.toolName} · {new Date(w.created_at).toLocaleDateString(LT("ar-KW", "en-GB"))}{w.files.length > 1 ? LT(` · ${w.files.length} ملفات`, ` · ${w.files.length} files`) : ""}</span>
        <div className="mt-1.5 flex gap-1.5">
          {first && <a href={first.url} download className="btn btn-primary flex-1 py-2 text-[13px]"><Icon name="download" size={14} />{L("تحميل")}</a>}
          <Link href={`/app/tools/${w.tool_id}?job=${w.id}`} className="btn btn-outline flex-1 py-2 text-[13px] font-semibold">{L("فتح")}</Link>
          {onDelete && <button type="button" aria-label={L("حذف")} onClick={() => onDelete(w.id)} className="btn btn-outline px-2.5 py-2 text-red-700"><Icon name="trash" size={14} /></button>}
        </div>
      </div>
    </article>
  );
}
