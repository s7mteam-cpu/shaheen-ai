"use client";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export type WorkFile = { url: string; type: string; caption?: string };
export type Work = { id: string; title: string | null; tool_id: string; toolName: string; status: string; created_at: string; files: WorkFile[]; error?: string | null };

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

export function WorkCard({ w, onDelete }: { w: Work; onDelete?: (id: string) => void }) {
  const first = w.files[0];
  const [label, cls] = status[w.status] ?? status.queued;
  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="relative aspect-square bg-tint">
        {first ? <Media f={first} className="h-full" /> : <div className="flex h-full items-center justify-center text-sm text-subtle">{label}…</div>}
        <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{label}</span>
      </div>
      <div className="flex flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-1 text-[15px] font-bold text-navy-900">{w.title || w.toolName}</h3>
        <span className="text-[13px] text-subtle">{w.toolName} · {new Date(w.created_at).toLocaleDateString("ar-KW")}{w.files.length > 1 ? ` · ${w.files.length} ملفات` : ""}</span>
        <div className="mt-1.5 flex gap-1.5">
          {first && <a href={first.url} download className="btn btn-primary flex-1 py-2 text-[13px]"><Icon name="download" size={14} />تحميل</a>}
          <Link href={`/app/tools/${w.tool_id}?job=${w.id}`} className="btn btn-outline flex-1 py-2 text-[13px] font-semibold">فتح</Link>
          {onDelete && <button type="button" aria-label="حذف" onClick={() => onDelete(w.id)} className="btn btn-outline px-2.5 py-2 text-red-700"><Icon name="trash" size={14} /></button>}
        </div>
      </div>
    </article>
  );
}
