"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { startTrial } from "./actions";
import { Turnstile } from "@/components/Turnstile";

const KEY = "sh_dev";
function deviceId() {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(KEY, v); }
    return v;
  } catch { return ""; }
}

function Go({ label }: { label: string }) {
  const T = useT();
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-gold px-6 py-3 font-bold disabled:opacity-60">{pending ? T("لحظة…", "One moment…") : label}</button>;
}

/** On the dashboard: the free-trial offer, or the running trial with its countdown. */
export function TrialBanner({ state, credits, hours, expiresAt }: { state: "offer" | "active"; credits: number; hours?: number; expiresAt?: string }) {
  const T = useT();
  const [r, act] = useActionState(startTrial, undefined);
  const [dev, setDev] = useState("");
  const [left, setLeft] = useState("");
  useEffect(() => { setDev(deviceId()); }, []);
  useEffect(() => {
    if (state !== "active" || !expiresAt) return;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) return setLeft(T("انتهت", "ended"));
      const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
      setLeft(h > 0 ? T(`${h} ساعة و${m} دقيقة`, `${h}h ${m}m`) : T(`${m} دقيقة`, `${m} min`));
    };
    tick(); const t = setInterval(tick, 30_000); return () => clearInterval(t);
  }, [state, expiresAt, T]);

  if (state === "active" || r?.ok) return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-gold-500/60 bg-gold-100 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <b className="text-lg text-navy-900">{r?.ok ?? T(`🎁 تجربتك المجانية شغّالة (${credits} ريشة)`, `🎁 Your free trial is on (${credits} credits)`)}</b>
        {left && <span className="text-sm text-muted">{T(`باقي: ${left}. بعدها تنتهي ريش التجربة.`, `Time left: ${left}. Trial credits end after that.`)}</span>}
      </div>
      <Link href="/#pricing" className="btn btn-primary shrink-0 px-6 py-3">{T("اشترك وكمّل بدون حدود", "Subscribe and keep going")}</Link>
    </section>
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-gold-500/60 bg-gold-100 p-5">
      <form action={act} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input type="hidden" name="device" value={dev} />
        <Turnstile />
        <div className="flex flex-col gap-1">
          <b className="text-lg text-navy-900">{T(`🎁 جرّب شاهين مجاناً: ${credits} ريشة لمدة ${hours} ساعة`, `🎁 Try Shaheen free: ${credits} credits for ${hours} hours`)}</b>
          <span className="text-sm text-muted">{T("جرّب أي أداة بدون دفع. التجربة لمرة وحدة لكل شخص.", "Try any tool without paying. One trial per person.")}</span>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Go label={T("🎁 ابدأ التجربة المجانية", "🎁 Start the free trial")} />
          <Link href="/?home=1#pricing" className="btn btn-primary px-6 py-3 text-center font-bold">{T("اشترك وكمّل بلا حدود", "Subscribe, no limits")}</Link>
        </div>
      </form>
      {r?.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{r.error}</p>}
    </section>
  );
}
