"use client";
import { useState } from "react";

type Labels = { ind: string; biz: string; indSub: string; bizSub: string; from: string; all: string; hide: string; count: [number, number] };

/** Home page pricing: two cards (individuals / companies); each opens its own plans below, and one button opens both. */
export function PricingTabs({ labels, minInd, minBiz, individuals, companies }: { labels: Labels; minInd: string; minBiz: string; individuals: React.ReactNode; companies: React.ReactNode }) {
  const [open, setOpen] = useState<"ind" | "biz" | "all" | null>(null);
  const showInd = open === "ind" || open === "all", showBiz = open === "biz" || open === "all";
  const card = (k: "ind" | "biz", title: string, sub: string, min: string, n: number) => {
    const on = open === k;
    return (
      <button type="button" onClick={() => setOpen(on ? null : k)} aria-expanded={on}
        className={`flex flex-col items-center gap-2 rounded-3xl border-2 p-8 text-center transition ${on ? "border-gold-500 bg-navy-800 text-white" : "card hover:border-gold-500"}`}>
        <span className={`text-2xl font-bold ${on ? "text-gold-500" : "text-navy-900"}`}>{title}</span>
        <span className={`text-[15px] ${on ? "text-white/80" : "text-muted"}`}>{sub}</span>
        <span className={`mt-2 text-[15px] ${on ? "text-white/80" : "text-subtle"}`}>{labels.from} <b className="font-latin text-2xl">{min}</b></span>
        <span className={`text-[13px] ${on ? "text-white/70" : "text-subtle"}`}>{n} {n > 2 ? "باقات" : "باقتين"}</span>
      </button>
    );
  };
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-5 md:grid-cols-2">
        {card("ind", labels.ind, labels.indSub, minInd, labels.count[0])}
        {card("biz", labels.biz, labels.bizSub, minBiz, labels.count[1])}
      </div>
      <div className="text-center">
        <button type="button" onClick={() => setOpen(open === "all" ? null : "all")} className="btn btn-outline px-8 py-3 text-[15px] font-bold">{open === "all" ? labels.hide : labels.all}</button>
      </div>
      {showInd && <div className="flex flex-col gap-4"><h3 className="text-xl font-bold text-navy-900">{labels.ind}</h3>{individuals}</div>}
      {showBiz && <div className="flex flex-col gap-4"><h3 className="text-xl font-bold text-navy-900">{labels.biz}</h3>{companies}</div>}
    </div>
  );
}
