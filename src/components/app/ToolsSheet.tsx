"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

export type NavTool = { id: string; name: string; icon: string; category: "image" | "video" | "audio" };
const groups: [NavTool["category"], string][] = [["image", "صور"], ["video", "فيديو"], ["audio", "صوت"]];

/** "إنشاء" sheet: bottom sheet on phones, side panel on desktop. */
export function ToolsSheet({ tools, open, onClose }: { tools: NavTool[]; open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = setTimeout(() => search.current?.focus({ preventScroll: true }), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;
  const term = q.trim();
  const shown = term ? tools.filter((t) => t.name.includes(term)) : tools;

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="إغلاق" onClick={onClose} className="absolute inset-0 bg-navy-900/45" />
      <div role="dialog" aria-modal="true" aria-labelledby="ts-title"
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[28px] bg-[#F5F6F8] shadow-2xl animate-[sheetUp_.22s_ease-out] lg:inset-y-0 lg:bottom-auto lg:right-0 lg:left-auto lg:h-full lg:max-h-none lg:w-[420px] lg:rounded-none lg:rounded-l-[28px]">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 id="ts-title" className="text-[22px] font-bold text-navy-900">إنشاء</h2>
          <button onClick={onClose} aria-label="إغلاق" className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-navy-900 hover:bg-white">×</button>
        </div>
        <div className="overflow-y-auto px-6 pb-8">
          <button onClick={onClose} className="mt-4 text-[15px] text-subtle hover:text-navy-800">رجوع</button>
          <label className="mt-4 flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-line focus-within:ring-gold-500">
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-subtle"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن أداة" aria-label="ابحث عن أداة" className="w-full bg-transparent text-[16px] outline-none placeholder:text-subtle" />
          </label>

          {groups.map(([cat, label]) => {
            const list = shown.filter((t) => t.category === cat);
            if (!list.length) return null;
            return (
              <section key={cat} className="mt-7">
                <h3 className="mb-1 text-[17px] font-bold text-navy-900">{label}</h3>
                <ul>
                  {list.map((t) => (
                    <li key={t.id} className="border-b border-line/70 last:border-0">
                      <Link href={`/app/tools/${t.id}`} onClick={onClose} className="flex items-center gap-4 py-4.5 py-[18px] text-[17px] text-ink hover:text-navy-800">
                        <Icon name={t.icon} size={24} className="text-navy-700" />
                        <span className="flex-1">{t.name}</span>
                        <span aria-hidden className="text-xl text-navy-900">‹</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {!shown.length && <p className="mt-8 text-center text-subtle">ما لقينا أداة بهالاسم.</p>}
        </div>
      </div>
    </div>
  );
}
