import Link from "next/link";
import { L } from "@/lib/i18n/ui";

/** A finished document (presentation…): download it, see what it holds. */
export function DocResult({ title, url, items, again }: { title: string; url?: string; items: string[]; again: string }) {
  return (
    <div className="card flex max-w-2xl flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-[20px] font-bold text-navy-900">{title}</h2>
      {url ? <a href={url} download className="btn btn-gold py-3.5 text-[16px]">⬇ {L("تحميل ملف PowerPoint")}</a> : <p className="text-red-700">{L("ما لقينا الملف.")}</p>}
      <p className="text-[14px] text-subtle">{L("الملف قابل للتعديل بالكامل: افتحه في PowerPoint أو Keynote أو Google Slides وغيّر أي نص أو لون أو صورة. ملاحظات المتحدث موجودة تحت كل شريحة.")}</p>
      {items.length > 0 && (
        <ol className="list-decimal space-y-1 ps-5 text-[15px] text-ink">{items.map((t, i) => <li key={i}>{t}</li>)}</ol>
      )}
      <Link href={again} className="btn btn-outline py-2.5">{L("عرض جديد")}</Link>
    </div>
  );
}
