"use client";
import { useState } from "react";
import { FONT_CATS, FONT_LIBRARY, type FontCat } from "@/lib/fonts";
import { L } from "@/lib/i18n/ui";

/** The font library (48 Arabic fonts) as a compact picker: category chips, then every font written in its own face. */
export function FontPicker({ value, onChange, none }: { value?: string; onChange: (id: string) => void; none?: { label: string; active: boolean; onPick: () => void } }) {
  const [cat, setCat] = useState<FontCat | "all">(() => FONT_LIBRARY.find((f) => f.id === value)?.cat ?? "all");
  const list = FONT_LIBRARY.filter((f) => cat === "all" || f.cat === cat);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")} className="chip">{L("الكل")} ({FONT_LIBRARY.length})</button>
        {FONT_CATS.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className="chip">{L(c)}</button>)}
      </div>
      <div className="grid max-h-60 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-line bg-white p-1.5 sm:grid-cols-3" aria-label={L("الخط")}>
        {none && <button type="button" aria-pressed={none.active} onClick={none.onPick} className="chip justify-center">{none.label}</button>}
        {list.map((f) => (
          <button key={f.id} type="button" aria-pressed={value === f.id} onClick={() => onChange(f.id)} title={f.id}
            className={`truncate rounded-lg border px-2 py-2 text-[17px] leading-tight ${value === f.id ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-ink hover:border-gold-500"}`} style={{ fontFamily: `"${f.id}", "Cairo", sans-serif` }}>{L(f.label)}</button>
        ))}
      </div>
    </div>
  );
}
