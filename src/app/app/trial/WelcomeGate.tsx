"use client";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { startTrial } from "./actions";
import { Turnstile } from "@/components/Turnstile";

const SKIP = "sh_gate_skip";
const DEV = "sh_dev";
const deviceId = () => { try { let v = localStorage.getItem(DEV); if (!v) { v = crypto.randomUUID(); localStorage.setItem(DEV, v); } return v; } catch { return ""; } };

function TrialButton({ label }: { label: string }) {
  const T = useT();
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-gold w-full py-3.5 text-base font-bold disabled:opacity-60">{pending ? T("لحظة…", "One moment…") : label}</button>;
}

/**
 * The welcome screen for a customer with no plan: «ابدأ التجربة المجانية» / «اشترك وكمّل بلا حدود» / «تخطي».
 * Shown once per visit (skipping hides it until the site is opened again). Never on the payment pages.
 */
export function WelcomeGate({ offer, credits, hours, name }: { offer: boolean; credits: number; hours: number; name?: string }) {
  const T = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dev, setDev] = useState("");
  const [r, act] = useActionState(startTrial, undefined);
  useEffect(() => { setDev(deviceId()); try { setOpen(sessionStorage.getItem(SKIP) !== "1"); } catch { setOpen(true); } }, []);
  useEffect(() => { if (r?.ok) { const t = setTimeout(() => { setOpen(false); router.refresh(); }, 1600); return () => clearTimeout(t); } }, [r?.ok, router]);
  useEffect(() => { if (!open) return; const o = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = o; }; }, [open]);
  const skip = () => { try { sessionStorage.setItem(SKIP, "1"); } catch {} setOpen(false); };
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="gate-title" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy-950/70 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl bg-white px-6 pb-7 pt-7 text-center shadow-2xl">
        <Image src="/brand/eagle.png" alt="" width={64} height={64} className="h-16 w-16" />
        <h2 id="gate-title" className="text-[22px] font-bold leading-9 text-navy-900">{name ? T(`أهلاً ${name} في شاهين 👋`, `Welcome to Shaheen, ${name} 👋`) : T("أهلاً فيك في شاهين 👋", "Welcome to Shaheen 👋")}</h2>
        {r?.ok ? (
          <p className="rounded-2xl bg-gold-100 p-4 font-bold leading-8 text-navy-900">{r.ok}</p>
        ) : (
          <>
            <p className="leading-8 text-muted">{offer
              ? T(`جرّب كل الأدوات مجاناً: ${credits} ريشة لمدة ${hours} ساعة، بدون دفع. أو اشترك وكمّل بلا حدود.`, `Try every tool free: ${credits} credits for ${hours} hours, no payment. Or subscribe and keep going.`)
              : T("اختر باقتك وابدأ تصمم وتسوي فيديوهاتك ومحتواك من الحين.", "Choose a plan and start creating designs, videos and content now.")}</p>
            {offer && (
              <form action={act} className="w-full">
                <input type="hidden" name="device" value={dev} />
                <Turnstile />
                <TrialButton label={T("🎁 ابدأ التجربة المجانية", "🎁 Start the free trial")} />
              </form>
            )}
            <Link href="/?home=1#pricing" className="btn btn-primary w-full py-3.5 text-base font-bold">{T("اشترك وكمّل بلا حدود", "Subscribe and keep going")}</Link>
            {r?.error && <p role="alert" className="w-full rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{r.error}</p>}
            <button type="button" onClick={skip} className="mt-1 text-sm text-subtle underline-offset-4 hover:underline">{T("تخطي واستكشف الأدوات بدون اشتراك", "Skip and explore the tools without a plan")}</button>
          </>
        )}
      </div>
    </div>
  );
}
