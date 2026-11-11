"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton, OrDivider } from "@/components/auth/GoogleButton";
import { Alert, arabicAuthError } from "@/components/auth/Alert";

const TERMS_VERSION = "2026-11-11";

function readRef() {
  const m = document.cookie.match(/(?:^|; )shaheen_ref=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : undefined;
}

export function SignupForm() {
  const router = useRouter();
  const plan = useSearchParams().get("plan");
  const next = plan ? `/app/subscribe?plan=${plan}` : "/app";
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(false);
  const [nudge, setNudge] = useState(false);
  const accept = () => { document.cookie = `shaheen_terms=${TERMS_VERSION}; Path=/; Max-Age=3600; SameSite=Lax`; };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agree) return setNudge(true);
    accept();
    setLoading(true); setError("");
    const f = new FormData(e.currentTarget);
    const { data, error } = await createClient().auth.signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      options: {
        data: { full_name: String(f.get("name")), ref: readRef(), terms_accepted: TERMS_VERSION, terms_accepted_at: new Date().toISOString() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) return setError(arabicAuthError(error.message));
    if (data.session) { router.replace(next); router.refresh(); } else setSent(true);
  }

  if (sent) return <Alert kind="ok">وصلتك رسالة على بريدك — اضغط الرابط اللي فيها لتأكيد حسابك.</Alert>;

  return (
    <>
      <div><h1 className="text-3xl font-bold text-navy-900">أنشئ حسابك</h1><p className="mt-2 text-muted">خطوة وحدة وتبدأ تصنع محتواك.</p></div>
      <label className={`flex cursor-pointer select-none items-start gap-2.5 rounded-xl border p-3.5 text-[14px] leading-7 text-navy-900 ${nudge && !agree ? "border-red-300 bg-red-50" : "border-line bg-canvas"}`}>
        <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); if (e.target.checked) { setNudge(false); accept(); } }} required className="mt-1.5 h-5 w-5 shrink-0 cursor-pointer accent-[#0B2A4A]" />
        <span>قرأت وأوافق على <Link href="/terms" target="_blank" className="font-semibold underline">شروط الاستخدام</Link> و<Link href="/refund" target="_blank" className="font-semibold underline">سياسة الاسترجاع</Link> و<Link href="/privacy" target="_blank" className="font-semibold underline">سياسة الخصوصية</Link>، وعمري 18 سنة أو أكثر (أو عندي موافقة ولي أمري).</span>
      </label>
      {nudge && !agree && <p role="alert" className="-mt-2 text-sm font-semibold text-red-700">لازم توافق على الشروط عشان تكمل.</p>}
      <GoogleButton next={next} disabled={!agree} onBlocked={() => setNudge(true)} />
      <OrDivider />
      {error && <Alert>{error}</Alert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2"><label htmlFor="name" className="label">الاسم</label><input id="name" name="name" required autoComplete="name" className="field" /></div>
        <div className="flex flex-col gap-2"><label htmlFor="email" className="label">البريد الإلكتروني</label><input id="email" name="email" type="email" required dir="ltr" autoComplete="email" className="field text-right" /></div>
        <div className="flex flex-col gap-2"><label htmlFor="password" className="label">كلمة المرور (8 أحرف أو أكثر)</label><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="field" /></div>
        <button disabled={loading} className="btn btn-primary py-3.5 text-[17px]">{loading ? "جارٍ الإنشاء…" : "إنشاء الحساب"}</button>
      </form>
      <p className="text-center text-[15px] text-muted">عندك حساب؟ <Link href="/login" className="font-bold text-navy-700">سجّل دخولك</Link></p>
    </>
  );
}
