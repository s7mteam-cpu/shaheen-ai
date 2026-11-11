"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient, setRemember } from "@/lib/supabase/client";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { Alert, arabicAuthError } from "@/components/auth/Alert";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";

export function LoginForm() {
  const lang = useLang();
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const fieldAlign = lang === "en" ? "text-left" : "text-right";
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const urlError = params.get("error");
  const [error, setError] = useState(
    urlError === "blocked" ? arabicAuthError("EMAIL_BLOCKED", lang)
    : urlError === "banned" ? arabicAuthError("banned", lang)
    : urlError === "auth" ? T("ما قدرنا نكمّل تسجيل الدخول، حاول مرة ثانية.", "We couldn't complete sign-in. Please try again.") : "");
  const [loading, setLoading] = useState(false);
  const [remember, setRem] = useState(true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const f = new FormData(e.currentTarget);
    setRemember(remember);
    const { error } = await createClient().auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setLoading(false);
    if (error) return setError(arabicAuthError(error.message, lang));
    router.replace(next); router.refresh();
  }

  return (
    <>
      <div><h1 className="text-3xl font-bold text-navy-900">{T("أهلاً بعودتك", "Welcome back")}</h1><p className="mt-2 text-muted">{T("سجّل دخولك لتكمل أعمالك.", "Sign in to continue your work.")}</p></div>
      <GoogleButton next={next} remember={remember} />
      <OrDivider />
      {error && <Alert>{error}</Alert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2"><label htmlFor="email" className="label">{T("البريد الإلكتروني", "Email")}</label><input id="email" name="email" type="email" required dir="ltr" autoComplete="email" className={`field ${fieldAlign}`} placeholder="name@example.com" /></div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between"><label htmlFor="password" className="label">{T("كلمة المرور", "Password")}</label><Link href="/forgot-password" className="text-sm font-semibold text-navy-700">{T("نسيت كلمة المرور؟", "Forgot password?")}</Link></div>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2.5 text-[15px] font-semibold text-navy-900">
          <input type="checkbox" checked={remember} onChange={(e) => setRem(e.target.checked)} className="h-5 w-5 cursor-pointer rounded accent-[#0B2A4A]" />
          {T("الإبقاء على تسجيل الدخول", "Keep me signed in")}
        </label>
        <button disabled={loading} className="btn btn-primary py-3.5 text-[17px]">{loading ? T("جارٍ الدخول…", "Signing in…") : T("تسجيل الدخول", "Sign in")}</button>
      </form>
      <p className="text-center text-[13px] text-subtle">{T("بالمتابعة أنت توافق على ", "By continuing you agree to the ")}<Link href="/terms" className="underline">{T("الشروط", "Terms")}</Link>{T(" و", ", ")}<Link href="/refund" className="underline">{T("سياسة الاسترجاع", "Refund Policy")}</Link>{T(" و", " and ")}<Link href="/privacy" className="underline">{T("الخصوصية", "Privacy Policy")}</Link>.</p>
      <p className="text-center text-[15px] text-muted">{T("ما عندك حساب؟ ", "Don't have an account? ")}<Link href="/signup" className="font-bold text-navy-700">{T("أنشئ حسابك", "Create one")}</Link></p>
    </>
  );
}
