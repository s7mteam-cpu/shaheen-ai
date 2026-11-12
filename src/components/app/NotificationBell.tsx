"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { markNotificationsRead } from "@/app/app/notificationActions";
import { useT } from "@/components/LangProvider";

export type Note = { id: number; kind: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string };

const dot: Record<string, string> = { done: "bg-emerald-500", failed: "bg-red-500", credits: "bg-gold-500", access: "bg-navy-700", payment: "bg-emerald-600", warn: "bg-red-600", lead: "bg-gold-500", info: "bg-subtle" };

function ago(iso: string, T: (ar: string, en: string) => string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return T("الآن", "now");
  if (m < 60) return T(`قبل ${m} د`, `${m}m ago`);
  const h = Math.round(m / 60);
  if (h < 24) return T(`قبل ${h} س`, `${h}h ago`);
  const d = Math.round(h / 24);
  return d < 30 ? T(`قبل ${d} يوم`, `${d}d ago`) : new Date(iso).toLocaleDateString(T("ar-KW", "en-GB"));
}

export function NotificationBell({ notes }: { notes: Note[] }) {
  const T = useT();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const unread = seen ? 0 : notes.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) { setSeen(true); markNotificationsRead(); }
  }

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={unread ? T(`الإشعارات، ${unread} جديدة`, `Notifications, ${unread} new`) : T("الإشعارات", "Notifications")}
        className="relative flex h-9 w-9 shrink-0 items-center sm:h-10 sm:w-10 justify-center rounded-full border border-white/20 bg-navy-700 text-white hover:bg-navy-600">
        <Icon name="bell" size={19} />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 font-latin text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="card fixed inset-x-3 top-16 z-40 flex max-h-[75vh] flex-col overflow-hidden shadow-lg sm:absolute sm:inset-x-auto sm:left-0 sm:top-12 sm:w-[360px]">
          <div className="border-b border-line px-4 py-3 font-bold text-navy-900">{T("الإشعارات", "Notifications")}</div>
          {notes.length === 0
            ? <p className="px-4 py-8 text-center text-sm text-subtle">{T("ما فيه إشعارات للحين. أول ما يجهز عملك أو يتغيّر رصيدك بتشوفه هنا.", "No notifications yet. You'll see updates here when your work is ready or your balance changes.")}</p>
            : (
              <ul className="overflow-y-auto">
                {notes.map((n) => {
                  const inner = (
                    <span className="flex gap-3 px-4 py-3">
                      <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${dot[n.kind] ?? dot.info}`} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className={`text-[15px] ${n.read_at ? "font-semibold text-navy-900" : "font-bold text-navy-900"}`}>{n.title}</span>
                        {n.body && <span className="text-[13px] leading-6 text-muted">{n.body}</span>}
                        <span className="text-[12px] text-subtle">{ago(n.created_at, T)}</span>
                      </span>
                    </span>
                  );
                  return (
                    <li key={n.id} className={`border-b border-line/60 last:border-0 ${n.read_at ? "" : "bg-gold-500/[0.07]"}`}>
                      {n.link ? <Link href={n.link} onClick={() => setOpen(false)} className="block hover:bg-tint">{inner}</Link> : inner}
                    </li>
                  );
                })}
              </ul>
            )}
        </div>
      )}
    </div>
  );
}
