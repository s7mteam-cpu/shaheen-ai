"use client";
import { useEffect, useRef } from "react";

declare global { interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void } } }
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare Turnstile («هل أنت إنسان؟») inside a form: it adds a hidden «cf-turnstile-response» field.
 * Most people never see anything; a suspicious visitor gets a one-click check. Renders nothing until
 * the owner adds NEXT_PUBLIC_TURNSTILE_SITE_KEY in Vercel.
 */
export function Turnstile({ lang = "ar" }: { lang?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!key || !box.current) return;
    let id: string | undefined, dead = false;
    const draw = () => { if (!dead && box.current && window.turnstile) id = window.turnstile.render(box.current, { sitekey: key, appearance: "interaction-only", language: lang === "en" ? "en" : "ar" }); };
    if (window.turnstile) draw();
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
      if (!s) { s = document.createElement("script"); s.src = SRC; s.async = true; document.head.appendChild(s); }
      s.addEventListener("load", draw);
    }
    return () => { dead = true; if (id && window.turnstile) window.turnstile.remove(id); };
  }, [key, lang]);
  return key ? <div ref={box} className="flex justify-center" /> : null;
}
