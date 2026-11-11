"use client";
import { useState } from "react";
import { L } from "@/lib/i18n/ui";
import { DIcon } from "@/design/icons";
import { INDUSTRIES, industryById } from "@/design/industries";
import { packById } from "@/remotion/packs";

/** «مجالك»: the same field list as the post designer. Each field brings its own pack of scenes and looks. */
export function IndustryPicker({ value, onChange, hint, title = true }: { value: string; onChange: (id: string) => void; hint?: string; title?: boolean }) {
  const ind = industryById(value);
  const [open, setOpen] = useState(!ind);
  const pack = packById(ind?.id);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        {title ? <span className="font-semibold">{L("مجالك")}</span> : <span />}
        {ind && !open && <button type="button" onClick={() => setOpen(true)} className="text-[14px] text-navy-700 underline">{L("تغيير")}</button>}
      </div>
      {ind && !open ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-tint px-4 py-3">
          <DIcon name={ind.icon} size={22} color="#0B2A4A" /><span className="font-semibold text-navy-900">{L(ind.label)}</span>
          {pack && <span className="ms-auto text-[13px] text-subtle">{L("حزمة")} v{pack.version} · {pack.signature.length} {L("مشاهد خاصة")} · {pack.recipes.length} {L("فيديوهات جاهزة")}</span>}
        </div>
      ) : (
        <div className="flex max-h-[340px] flex-col gap-3 overflow-y-auto rounded-2xl border border-line p-3">
          {[...new Set(INDUSTRIES.map((i) => i.group))].map((g) => (
            <div key={g} className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-subtle">{L(g)}</span>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.filter((i) => i.group === g).map((i) => (
                  <button key={i.id} type="button" aria-pressed={value === i.id} onClick={() => { onChange(i.id); setOpen(false); }} className="chip inline-flex items-center gap-1.5">
                    <DIcon name={i.icon} size={16} color="currentColor" />{L(i.label)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {hint && <span className="text-[13px] text-subtle">{L(hint)}</span>}
    </div>
  );
}
