"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CURRENCIES, CURRENCY_ORDER, CURRENCY_COOKIE, type CurrencyCode } from "@/lib/countries";

const flagOf = (c: CurrencyCode) => CURRENCIES[c].flag;

/** The currency button next to «ع/EN» and the theme switch. Prices change to the chosen currency (≈); payment stays in dinars. */
export function CurrencyToggle({ cur, lang, light = false, full = false }: { cur: CurrencyCode; lang: "ar" | "en"; light?: boolean; full?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const pick = (c: CurrencyCode) => {
    document.cookie = `${CURRENCY_COOKIE}=${c}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    start(() => router.refresh());
  };
  const sym = (c: CurrencyCode) => (c === "USD" ? "$" : lang === "en" ? CURRENCIES[c].en : CURRENCIES[c].ar);
  const base = light ? "border border-line text-navy-800 hover:bg-tint" : full ? "border border-white/20 bg-white/[0.06] text-white hover:bg-white/10" : "text-white/85 hover:bg-white/10 hover:text-white";
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} disabled={pending} aria-haspopup="listbox" aria-expanded={open}
        aria-label={lang === "en" ? `Currency: ${CURRENCIES[cur].nameEn}` : `العملة: ${CURRENCIES[cur].name}`}
        className={`inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 max-[339px]:px-1 text-[13px] font-bold sm:h-10 sm:px-3 sm:text-[14px] transition disabled:opacity-50 ${base}`}>
        <span aria-hidden>{flagOf(cur)}</span><span>{sym(cur)}</span><span aria-hidden className="text-[10px] opacity-70 max-[419px]:hidden">▾</span>
      </button>
      {open && (
        <ul role="listbox" aria-label={lang === "en" ? "Choose currency" : "اختر العملة"}
          className="absolute end-0 top-full z-50 mt-2 max-h-[70vh] w-64 overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white py-1 text-navy-900 shadow-xl">
          {CURRENCY_ORDER.map((c) => (
            <li key={c} role="option" aria-selected={c === cur}>
              <button type="button" onClick={() => pick(c)} className={`flex w-full items-center gap-3 px-4 py-2 text-start text-[14px] hover:bg-tint ${c === cur ? "font-bold" : ""}`}>
                <span aria-hidden className="text-lg">{flagOf(c)}</span>
                <span className="flex-1">{lang === "en" ? CURRENCIES[c].nameEn : CURRENCIES[c].name}</span>
                <span className="text-subtle">{sym(c)}</span>{c === cur && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
          <li className="border-t border-line px-4 py-2 text-[11px] leading-5 text-subtle">{lang === "en" ? "Prices in other currencies are approximate, at today's rate. Payment is in Kuwaiti dinars." : "الأسعار بالعملات الثانية تقريبية بسعر صرف اليوم، والدفع بالدينار الكويتي."}{" "}<a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">{lang === "en" ? "Rates By Exchange Rate API" : "أسعار الصرف: Exchange Rate API"}</a></li>
        </ul>
      )}
    </div>
  );
}
