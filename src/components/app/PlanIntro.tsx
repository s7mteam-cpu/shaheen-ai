"use client";
import { useState, type ReactNode } from "react";
import { L } from "@/lib/i18n/ui";
import { markPlanIntro } from "@/app/app/brand/actions";

/** First visit: the intro card (texts editable from the admin panel). Afterwards the board, with a small «ما هي هذي الميزة؟» button that brings the card back. */
export function PlanIntro({ seen, content, children }: { seen: boolean; content: { title: string; subtitle: string; points: string[]; button: string }; children: ReactNode }) {
  const [show, setShow] = useState(!seen);
  async function start() { setShow(false); if (!seen) await markPlanIntro(); }
  if (show) {
    return (
      <div className="card flex max-w-2xl flex-col gap-4 p-6">
        <div><h2 className="text-[22px] font-bold text-navy-900">{L(content.title)}</h2><p className="mt-1 text-muted">{L(content.subtitle)}</p></div>
        <ul className="flex flex-col gap-2.5 leading-7">{content.points.map((x, i) => <li key={i} className="flex gap-2"><span aria-hidden className="mt-1 text-gold-600">●</span><span>{L(x)}</span></li>)}</ul>
        <button type="button" onClick={start} className="btn btn-gold w-fit px-8 py-3 font-bold">{L(content.button)}</button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={() => setShow(true)} className="w-fit text-sm font-semibold text-navy-700 underline">❓ {L("ما هي هذي الميزة؟")}</button>
      {children}
    </div>
  );
}
