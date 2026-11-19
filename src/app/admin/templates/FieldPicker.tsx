"use client";
import { useState } from "react";
import { L } from "@/lib/i18n/ui";
import { INDUSTRIES } from "@/design/industries";

const GROUPS = [...new Set(INDUSTRIES.map((i) => i.group))];

/** Pick the exact fields («مجالك») a template belongs to — same list the customer picks from. "Whole group" is a shortcut that ticks all of its fields. */
export function FieldPicker({ name, defaultValue = [] }: { name: string; defaultValue?: string[] }) {
  const [sel, setSel] = useState<string[]>(() => defaultValue.filter((x) => INDUSTRIES.some((i) => i.id === x)));
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const group = (g: string) => {
    const ids = INDUSTRIES.filter((i) => i.group === g).map((i) => i.id);
    setSel((s) => (ids.every((id) => s.includes(id)) ? s.filter((x) => !ids.includes(x)) : [...new Set([...s, ...ids])]));
  };
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={sel.join(",")} />
      {GROUPS.map((g) => {
        const items = INDUSTRIES.filter((i) => i.group === g);
        const all = items.every((i) => sel.includes(i.id));
        return (
          <div key={g} className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => group(g)} className={`rounded-full border px-3 py-1 text-[12px] font-bold ${all ? "bg-navy-900 text-white" : "text-subtle"}`}>{L(g)} ({L("الكل")})</button>
            {items.map((i) => (
              <button key={i.id} type="button" aria-pressed={sel.includes(i.id)} onClick={() => toggle(i.id)} className={`rounded-full border px-3 py-1 text-[12px] ${sel.includes(i.id) ? "border-navy-900 bg-navy-900 text-white" : ""}`}>{L(i.label)}</button>
            ))}
          </div>
        );
      })}
      <p className="text-[12px] text-subtle">{sel.length ? `${L("المختار")}: ${sel.length}` : L("ما اخترت مجال (القالب يعتبر عام)")}</p>
    </div>
  );
}
