"use client";
import { L } from "@/lib/i18n/ui";
import Link from "next/link";
import { useState } from "react";
import { Progress } from "@/components/app/Progress";
import type { StudioData } from "@/components/app/FreeStudio";

/** After «تصدير»: the same screen as the other motion tool. The customer can leave; editing again costs the edit price. */
export function FreeSent({ data, busy, editCost, balance, onUnlock }: { data: StudioData; busy: StudioData["busy"]; editCost: number; balance: number; onUnlock: () => Promise<string | null> }) {
  const [working, setWorking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const exporting = !!busy && busy.kind === "export";
  const poor = balance < editCost;
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
      {exporting || !data.exportUrl ? (
        <>
          <h2 className="text-[22px] font-bold text-emerald-900">{L("✓ تم إرسال الفيديو للمعالجة")}</h2>
          <Progress value={busy?.progress || 5} label={L("جاري تجهيز الفيديو…")} />
          <p className="text-[14px] text-emerald-900/80">{L("تقدر تطلع من الصفحة، وبيوصلك الفيديو في «أعمالي» أول ما يخلص.")}</p>
        </>
      ) : (
        <>
          <h2 className="text-[22px] font-bold text-emerald-900">{L("✓ الفيديو جاهز")}</h2>
          <video src={data.exportUrl} controls playsInline className="max-h-[60vh] w-full rounded-2xl bg-black" />
          <a href={data.exportUrl} download className="btn btn-gold w-full py-3.5">{L("⬇️ تحميل الفيديو")}</a>
        </>
      )}
      {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{err}</p>}
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/app/works" className="btn btn-primary px-6 py-3">{L("روح لأعمالي")}</Link>
        <Link href="/app/tools/free-motion" className="btn border border-line bg-white px-6 py-3">{L("تصميم جديد")}</Link>
      </div>
      {!exporting && data.exportUrl && (
        <div className="flex w-full flex-col items-center gap-2 border-t border-emerald-200 pt-4">
          <button type="button" disabled={working || poor} onClick={async () => { setWorking(true); setErr(null); const e = await onUnlock(); setWorking(false); if (e) setErr(e); }} className="btn btn-outline px-6 py-3">
            {working ? L("لحظات…") : `✏️ ${L("تعديل التصميم")} (${editCost} ${L("ريشة")})`}
          </button>
          <span className="text-[12px] text-emerald-900/70">{poor ? L("رصيدك ما يكفي للتعديل.") : L("التعديل بعد التصدير يكلّف ريش، ثم تصدّر من جديد بدون رسوم إضافية.")}</span>
        </div>
      )}
    </div>
  );
}
