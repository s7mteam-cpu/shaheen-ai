"use client";
import { useState } from "react";

/** "المزيد": a collapsible group, so the side panel shows the basics and the rest opens on demand. */
export function More({ label, children, open: open0 = false }: { label: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(open0);
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-tint/50 p-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 text-[14px] font-semibold text-navy-900">
        <span>{label}</span>
        <span aria-hidden className={`inline-block text-[16px] transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {open && <div className="flex flex-col gap-4">{children}</div>}
    </div>
  );
}

/** A card. With `more` it starts folded (header only) and opens with its arrow. */
export function Card({ title, icon, children, more = false }: { title: string; icon?: string; children: React.ReactNode; more?: boolean }) {
  const [open, setOpen] = useState(!more);
  return (
    <section className="card flex flex-col gap-4 p-5">
      {more ? (
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 text-[18px] font-bold text-navy-900">
          <span className="flex items-center gap-2">{icon && <span aria-hidden>{icon}</span>}{title}</span>
          <span aria-hidden className={`inline-block text-[20px] transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
        </button>
      ) : (
        <h2 className="flex items-center gap-2 text-[18px] font-bold text-navy-900">{icon && <span aria-hidden>{icon}</span>}{title}</h2>
      )}
      {open && children}
    </section>
  );
}
