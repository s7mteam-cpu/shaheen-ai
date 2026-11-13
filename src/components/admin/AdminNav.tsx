"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { href: string; label: string };

/**
 * Admin menu. Desktop: a sidebar whose links scroll on their own, so the last sections («كلمات السر»,
 * «فريق الإدارة») and the «العودة للمنصة» button are always reachable. Phone: a top bar with a big back
 * button and a «القائمة» button that opens the sections as a grid (closes itself after you pick one).
 */
export function AdminNav({ items, labels, leads, toggles }: { items: Item[]; labels: { title: string; sub: string; back: string; menu: string; newLeads: string }; leads: number; toggles: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  const isOn = (h: string) => (h === "/admin" ? path === "/admin" : path === h || path.startsWith(h + "/"));
  const current = [...items].sort((a, b) => b.href.length - a.href.length).find((i) => isOn(i.href));
  const badge = (h: string) => h === "/admin/leads" && leads > 0
    ? <span aria-label={`${leads} ${labels.newLeads}`} className="min-w-6 rounded-full bg-red-600 px-2 py-0.5 text-center text-xs font-bold text-white">{leads}</span> : null;
  const link = (i: Item) => (
    <Link key={i.href} href={i.href} aria-current={isOn(i.href) ? "page" : undefined}
      className={`flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-[15px] ${isOn(i.href) ? "bg-white/15 font-bold text-white" : "text-white/85 hover:bg-white/10"}`}>
      {i.label}{badge(i.href)}
    </Link>
  );
  const back = (
    <Link href="/app" className="flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-[15px] font-bold text-navy-950 hover:brightness-105">
      <span aria-hidden>→</span>{labels.back}
    </Link>
  );
  return (
    <nav aria-label={labels.title} className="bg-navy-950 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[250px] lg:shrink-0 lg:flex-col">
      {/* top: logo (+ on phones: back button and menu button) */}
      <div className="flex items-center justify-between gap-2 p-4">
        <Link href="/admin" className="flex items-center gap-2.5"><Image src="/brand/eagle.png" alt="" width={34} height={34} /><span className="flex flex-col leading-tight"><span className="text-lg font-bold text-gold-500">{labels.sub}</span><span className="text-xs text-white/60">{labels.title}</span></span></Link>
        <div className="flex items-center gap-2 lg:hidden">{back}</div>
      </div>
      <div className="flex items-center gap-2 px-4 pb-3 lg:hidden">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
          className="flex flex-1 items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-[15px] font-semibold text-white">
          <span>☰ {labels.menu}{current ? `: ${current.label}` : ""}</span><span aria-hidden>{open ? "▲" : "▼"}</span>
        </button>
        <span className="flex items-center">{toggles}</span>
      </div>
      {open && <div className="grid grid-cols-2 gap-1 px-4 pb-4 lg:hidden">{items.map(link)}</div>}

      {/* desktop: links scroll, footer stays */}
      <div className="hidden min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 lg:flex">{items.map(link)}</div>
      <div className="hidden flex-col gap-3 border-t border-white/10 p-4 lg:flex">
        {back}
        <span className="flex items-center justify-center">{toggles}</span>
      </div>
    </nav>
  );
}
