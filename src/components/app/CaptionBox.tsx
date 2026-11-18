"use client";
import { useState } from "react";
import { L } from "@/lib/i18n/ui";

/** The post caption written in the content plan, shown under the finished reel so it can be copied. */
export function CaptionBox({ text }: { text: string }) {
  const [v, setV] = useState(text);
  const [ok, setOk] = useState(false);
  return (
    <section className="card mx-auto mt-5 flex max-w-3xl flex-col gap-2 p-5">
      <label className="flex flex-col gap-1.5"><span className="text-[15px] font-bold">{L("الكابشن")}</span>
        <textarea rows={5} value={v} onChange={(e) => setV(e.target.value)} maxLength={900} className="field leading-7" /></label>
      <button type="button" onClick={() => navigator.clipboard?.writeText(v).then(() => { setOk(true); setTimeout(() => setOk(false), 1800); })} className="btn btn-outline w-fit px-4 py-2 text-[14px]">{ok ? L("تم النسخ ✓") : L("نسخ الكابشن")}</button>
    </section>
  );
}
