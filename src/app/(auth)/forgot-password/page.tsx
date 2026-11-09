"use client";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/auth/Alert";

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` });
    setLoading(false); setSent(true);
  }
  return (
    <>
      <div><h1 className="text-3xl font-bold text-navy-900">استعادة كلمة المرور</h1><p className="mt-2 text-muted">اكتب بريدك ونرسل لك رابط تعيين كلمة مرور جديدة.</p></div>
      {sent ? <Alert kind="ok">إذا كان البريد مسجّلاً عندنا، بيوصلك الرابط خلال دقائق.</Alert> : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2"><label htmlFor="email" className="label">البريد الإلكتروني</label><input id="email" name="email" type="email" required dir="ltr" className="field text-right" /></div>
          <button disabled={loading} className="btn btn-primary py-3.5">إرسال الرابط</button>
        </form>
      )}
      <Link href="/login" className="text-center text-[15px] font-semibold text-navy-700">العودة لتسجيل الدخول</Link>
    </>
  );
}
