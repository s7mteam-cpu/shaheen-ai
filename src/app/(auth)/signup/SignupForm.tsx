"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { Alert, arabicAuthError } from "@/components/auth/Alert";
import { normalizePhone } from "@/lib/phone";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";
import { countryOf } from "@/lib/countries";
import { CountryOptions } from "@/components/CountryOptions";

const TERMS_VERSION = "2026-11-13";

function readRef() {
  const m = document.cookie.match(/(?:^|; )shaheen_ref=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function SignupForm() {
  const lang = useLang();
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const fieldAlign = lang === "en" ? "text-left" : "text-right";
  const router = useRouter();
  const plan = useSearchParams().get("plan");
  const next = plan ? `/app/subscribe?plan=${plan}` : "/app";
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [country, setCountry] = useState("KW");
  const c = countryOf(country);
  const accept = () => { document.cookie = `shaheen_terms=${TERMS_VERSION}; Path=/; Max-Age=3600; SameSite=Lax`; };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree) return setNudge(true);
    const f = new FormData(e.currentTarget);
    const phone = normalizePhone(String(f.get("phone") || ""), country === "XX" ? null : country);
    if (!phone) return setError(country === "XX"
      ? T("اكتب رقم الواتساب كامل مع مفتاح الدولة، مثل ‎+44 7400000000.", "Enter the full WhatsApp number with the country code, e.g. +44 7400000000.")
      : T(`اكتب رقم واتساب صحيح، مثل ${c.sample} أو ‎${c.dial}${c.sample}.`, `Enter a valid WhatsApp number, e.g. ${c.sample} or ${c.dial}${c.sample}.`));
    accept();
    setLoading(true); setError("");
    const { data, error } = await createClient().auth.signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      options: {
        data: { full_name: String(f.get("name")), phone, country, ref: readRef(), terms_accepted: TERMS_VERSION, terms_accepted_at: new Date().toISOString() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) return setError(arabicAuthError(error.message, lang));
    if (data.session) { router.replace(next); router.refresh(); } else setSent(true);
  }

  if (sent) return <Alert kind="ok">{T("وصلتك رسالة على بريدك — اضغط الرابط اللي فيها لتأكيد حسابك.", "We sent you an email — click the link in it to confirm your account.")}</Alert>;

  return (
    <>
      <div><h1 className="text-3xl font-bold text-navy-900">{T("أنشئ حسابك", "Create your account")}</h1><p className="mt-2 text-muted">{T("خطوة وحدة وتبدأ تصنع محتواك.", "One step and you're creating content.")}</p></div>
      <label className={`flex cursor-pointer select-none items-start gap-2.5 rounded-xl border p-3.5 text-[14px] leading-7 text-navy-900 ${nudge && !agree ? "border-red-300 bg-red-50" : "border-line bg-canvas"}`}>
        <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); if (e.target.checked) { setNudge(false); accept(); } }} required className="mt-1.5 h-5 w-5 shrink-0 cursor-pointer accent-[#0B2A4A]" />
        <span>{T("قرأت وأوافق على ", "I have read and agree to the ")}<Link href="/terms" target="_blank" className="font-semibold underline">{T("شروط الاستخدام", "Terms of Service")}</Link>{T(" و", ", ")}<Link href="/refund" target="_blank" className="font-semibold underline">{T("سياسة الاسترجاع", "Refund Policy")}</Link>{T(" و", " and ")}<Link href="/privacy" target="_blank" className="font-semibold underline">{T("سياسة الخصوصية", "Privacy Policy")}</Link>{T("، وعمري 18 سنة أو أكثر (أو عندي موافقة ولي أمري).", ", and I am 18 or older (or have a parent's or guardian's consent).")}</span>
      </label>
      {nudge && !agree && <p role="alert" className="-mt-2 text-sm font-semibold text-red-700">{T("لازم توافق على الشروط عشان تكمل.", "You need to accept the terms to continue.")}</p>}
      <GoogleButton next={next} disabled={!agree} onBlocked={() => setNudge(true)} />
      <OrDivider />
      {error && <Alert>{error}</Alert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2"><label htmlFor="name" className="label">{T("الاسم", "Name")}</label><input id="name" name="name" required autoComplete="name" className="field" /></div>
        <div className="flex flex-col gap-2"><label htmlFor="country" className="label">{T("الدولة", "Country")}</label>
          <select id="country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} className="field">
            <CountryOptions lang={lang} />
          </select></div>
        <div className="flex flex-col gap-2"><label htmlFor="phone" className="label">{T("رقم الواتساب", "WhatsApp number")}</label>
          <div dir="ltr" className="flex items-stretch gap-2">{c.dial && <span className="flex items-center rounded-xl border border-line bg-tint px-3 font-latin text-[15px] font-semibold text-navy-800">{c.flag} {c.dial}</span>}
            <input id="phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel" dir="ltr" placeholder={c.dial ? c.sample : "+44 7400000000"} className="field flex-1 text-left" /></div>
          <span className="text-[12px] text-subtle">{T("للتواصل معك بخصوص حسابك فقط.", "Only used to contact you about your account.")}</span></div>
        <div className="flex flex-col gap-2"><label htmlFor="email" className="label">{T("البريد الإلكتروني", "Email")}</label><input id="email" name="email" type="email" required dir="ltr" autoComplete="email" className={`field ${fieldAlign}`} /></div>
        <div className="flex flex-col gap-2"><label htmlFor="password" className="label">{T("كلمة المرور (8 أحرف أو أكثر)", "Password (8+ characters)")}</label><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="field" /></div>
        <button disabled={loading} className="btn btn-primary py-3.5 text-[17px]">{loading ? T("جارٍ الإنشاء…", "Creating…") : T("إنشاء الحساب", "Create account")}</button>
      </form>
      <p className="text-center text-[15px] text-muted">{T("عندك حساب؟ ", "Already have an account? ")}<Link href="/login" className="font-bold text-navy-700">{T("سجّل دخولك", "Sign in")}</Link></p>
    </>
  );
}
