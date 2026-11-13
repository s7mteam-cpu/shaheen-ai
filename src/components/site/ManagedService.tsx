"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { SiteContent } from "@/lib/defaults";
import { tr, type Lang } from "@/lib/i18n";

export type ShownPrice = { approx: boolean; number: string; symbol: string; kwd: string };
export function ManagedService({ s, lang = "ar", price }: { s: SiteContent["managed_service"]; lang?: Lang; price?: ShownPrice }) {
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"pick" | "form" | "done">("pick");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  if (!s.enabled) return null;
  const wa = `https://wa.me/${s.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(s.whatsapp_message)}`;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSending(true); setError("");
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const r = await fetch("/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const d = await r.json(); setSending(false);
    if (!r.ok) return setError(d.error);
    setMode("done");
  }

  return (
    <>
      <div className="relative flex flex-wrap items-center gap-8 overflow-hidden rounded-3xl border border-gold-500/40 bg-navy-950 p-8 text-white md:p-10">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
          <span className="self-start rounded-full bg-gold-500/15 px-3 py-1 text-[13px] font-bold text-gold-500">{T("خدمة يديرها فريقنا", "Managed by our team")}</span>
          <h3 className="text-2xl font-bold text-gold-500 md:text-3xl">{s.title}</h3>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">{price?.approx && <span className="text-2xl text-white/70">≈</span>}<span className="font-latin text-5xl font-bold">{price?.number ?? s.price_kwd}</span><span className="text-lg font-semibold">{price?.symbol ?? T("د.ك", "KWD")}</span><span className="text-white/70">/ {s.period}</span></div>
            {price?.approx && <span className="text-[12px] text-white/65">{T(`الدفع بالدينار الكويتي: ${price.kwd}`, `Charged in Kuwaiti dinars: ${price.kwd}`)}</span>}
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
          <ul className="flex flex-col gap-3 text-[15px]">
            {s.features.map((f) => <li key={f} className="flex items-start gap-2.5"><Icon name="check" size={18} strokeWidth={2.4} className="mt-0.5 shrink-0 text-gold-500" />{f}</li>)}
          </ul>
          <button type="button" onClick={() => { setOpen(true); setMode("pick"); }} className="btn btn-gold py-4 text-lg">{s.cta}</button>
        </div>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="ms-title" className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4" onClick={() => setOpen(false)}>
          <div className="card flex w-full max-w-md flex-col gap-5 p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 id="ms-title" className="text-xl font-bold text-navy-900">{s.title}</h2>
              <button type="button" aria-label={T("إغلاق", "Close")} onClick={() => setOpen(false)} className="text-2xl leading-none text-subtle">×</button>
            </div>
            {mode === "pick" && (
              <div className="flex flex-col gap-3">
                <p className="text-muted">{T("اختر طريقة التواصل اللي تناسبك:", "How would you like to reach us?")}</p>
                <a href={wa} target="_blank" rel="noreferrer" className="btn bg-[#1F9D55] py-4 text-white hover:bg-[#178048]">
                  <Icon name="chat" size={20} />تواصل عبر واتساب
                </a>
                <button type="button" onClick={() => setMode("form")} className="btn btn-outline py-4">{T("اترك بياناتك ونتصل فيك", "Leave your details and we'll call you")}</button>
              </div>
            )}
            {mode === "form" && (
              <form onSubmit={submit} className="flex flex-col gap-3">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <input type="hidden" name="source" value="managed_service" />
                <label htmlFor="ms-name" className="label">{T("الاسم", "Name")}</label><input id="ms-name" name="name" required className="field" />
                <label htmlFor="ms-phone" className="label">{T("رقم الجوال", "Phone number")}</label><input id="ms-phone" name="phone" type="tel" required dir="ltr" className="field text-start" placeholder="+965" />
                <label htmlFor="ms-msg" className="label">{T("رسالتك (اختياري)", "Your message (optional)")}</label><textarea id="ms-msg" name="message" rows={3} className="field" placeholder={T("مثال: لدي متجر عطور وأرغب في إدارة حسابي إنستغرام وتيك توك", "e.g. I run a perfume store and need Instagram and TikTok managed")} />
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <button disabled={sending} className="btn btn-primary py-3.5">{sending ? T("جارٍ الإرسال…", "Sending…") : T("إرسال", "Send")}</button>
              </form>
            )}
            {mode === "done" && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-800">{s.thanks}</p>}
          </div>
        </div>
      )}
    </>
  );
}
