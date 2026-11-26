"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Turnstile } from "@/components/Turnstile";
import { Alert, arabicAuthError } from "@/components/auth/Alert";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";

export default function ForgotPassword() {
  const lang = useLang();
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const fieldAlign = lang === "en" ? "text-left" : "text-right";
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const { error: err } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`, captchaToken: String(f.get("cf-turnstile-response") || "") || undefined });
    setLoading(false);
    if (err && /captcha/i.test(err.message)) return setError(arabicAuthError(err.message, lang));
    setSent(true);
  }
  return (
    <>
      <div><h1 className="text-3xl font-bold text-navy-900">{T("استعادة كلمة المرور", "Reset your password")}</h1><p className="mt-2 text-muted">{T("اكتب بريدك ونرسل لك رابط تعيين كلمة مرور جديدة.", "Enter your email and we'll send you a link to set a new password.")}</p></div>
      {sent ? <Alert kind="ok">{T("إذا كان البريد مسجّلاً عندنا، بيوصلك الرابط خلال دقائق.", "If this email is registered, you'll receive the link within a few minutes.")}</Alert> : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}
          <div className="flex flex-col gap-2"><label htmlFor="email" className="label">{T("البريد الإلكتروني", "Email")}</label><input id="email" name="email" type="email" required dir="ltr" className={`field ${fieldAlign}`} /></div>
          <Turnstile lang={lang} />
          <button disabled={loading} className="btn btn-primary py-3.5">{T("إرسال الرابط", "Send link")}</button>
        </form>
      )}
      <Link href="/login" className="text-center text-[15px] font-semibold text-navy-700">{T("العودة لتسجيل الدخول", "Back to sign in")}</Link>
    </>
  );
}
