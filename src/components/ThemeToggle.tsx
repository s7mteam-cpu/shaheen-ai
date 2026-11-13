"use client";
import { useEffect, useState } from "react";

/** 🌙 / ☀️ — light is the default; each visitor's choice is remembered in their browser. */
export function ThemeToggle({ className = "", light = false }: { className?: string; light?: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  function flip() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* private mode */ }
  }
  return (
    <button type="button" onClick={flip} aria-label={dark ? "الوضع الفاتح" : "الوضع الليلي"} aria-pressed={dark} title={dark ? "الوضع الفاتح" : "الوضع الليلي"}
      className={`inline-flex h-8 w-8 max-[339px]:w-7 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10 transition ${light ? "border border-line text-navy-800 hover:bg-tint" : "text-white/85 hover:bg-white/10 hover:text-white"} ${className}`}>
      {dark ? (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7Z" /></svg>
      )}
    </button>
  );
}

const SUN = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" /></svg>;
const MOON = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7Z" /></svg>;

/** ☀️ | 🌙 side by side — both always visible, the active one is lit (used in the phone header). */
export function ThemeSwitch({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  function set(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* private mode */ }
  }
  const btn = (on: boolean) => `inline-flex h-7 w-8 sm:h-8 sm:w-9 items-center justify-center rounded-full transition ${on ? "bg-gold-500 !text-[#0A1E36] shadow-sm" : "text-white/70 hover:text-white"}`;
  return (
    <span dir="ltr" role="group" aria-label="الوضع الفاتح / الليلي" className={`inline-flex h-9 shrink-0 items-center gap-0.5 rounded-full sm:h-10 sm:p-1 border border-white/20 bg-white/[0.06] p-[3px] ${className}`}>
      <button type="button" onClick={() => set(false)} aria-pressed={!dark} aria-label="الوضع الفاتح" title="الوضع الفاتح" className={btn(!dark)}>{SUN}</button>
      <button type="button" onClick={() => set(true)} aria-pressed={dark} aria-label="الوضع الليلي" title="الوضع الليلي" className={btn(dark)}>{MOON}</button>
    </span>
  );
}

/** Runs before the page paints, so a dark-mode visitor never sees a white flash. */
export const THEME_SCRIPT = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
