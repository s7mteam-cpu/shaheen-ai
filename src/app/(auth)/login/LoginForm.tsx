"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient, setRemember } from "@/lib/supabase/client";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { Alert, arabicAuthError } from "@/components/auth/Alert";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/app";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRem] = useState(true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError("");
    const f = new FormData(e.currentTarget);
    setRemember(remember);
    const { error } = await createClient().auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setLoading(false);
    if (error) return setError(arabicAuthError(error.message));
    router.replace(next); router.refresh();
  }

  return (
    <>
      <div><h1 className="text-3xl font-bold text-navy-900">أهلاً بعودتك</h1><p className="mt-2 text-muted">سجّل دخولك لتكمل أعمالك.</p></div>
      <GoogleButton next={next} remember={remember} />
      <OrDivider />
      {error && <Alert>{error}</Alert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2"><label htmlFor="email" className="label">البريد الإلكتروني</label><input id="email" name="email" type="email" required dir="ltr" autoComplete="email" className="field text-right" placeholder="name@example.com" /></div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between"><label htmlFor="password" className="label">كلمة المرور</label><Link href="/forgot-password" className="text-sm font-semibold text-navy-700">نسيت كلمة المرور؟</Link></div>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2.5 text-[15px] font-semibold text-navy-900">
          <input type="checkbox" checked={remember} onChange={(e) => setRem(e.target.checked)} className="h-5 w-5 cursor-pointer rounded accent-[#0B2A4A]" />
          الإبقاء على تسجيل الدخول
        </label>
        <button disabled={loading} className="btn btn-primary py-3.5 text-[17px]">{loading ? "جارٍ الدخول…" : "تسجيل الدخول"}</button>
      </form>
      <p className="text-center text-[15px] text-muted">ما عندك حساب؟ <Link href="/signup" className="font-bold text-navy-700">أنشئ حسابك</Link></p>
    </>
  );
}
