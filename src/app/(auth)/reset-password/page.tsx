"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/auth/Alert";
import { useLang } from "@/components/LangProvider";
import { tr } from "@/lib/i18n";

export default function ResetPassword() {
  const lang = useLang();
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("p1") !== f.get("p2")) return setError(T("كلمتا المرور غير متطابقتين.", "Passwords don't match."));
    const { error } = await createClient().auth.updateUser({ password: String(f.get("p1")) });
    if (error) return setError(T("ما قدرنا نحدّث كلمة المرور. اطلب رابطاً جديداً.", "We couldn't update your password. Please request a new link."));
    router.replace("/app");
  }
  return (
    <>
      <h1 className="text-3xl font-bold text-navy-900">{T("كلمة مرور جديدة", "New password")}</h1>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2"><label htmlFor="p1" className="label">{T("كلمة المرور الجديدة", "New password")}</label><input id="p1" name="p1" type="password" minLength={8} required className="field" /></div>
        <div className="flex flex-col gap-2"><label htmlFor="p2" className="label">{T("تأكيدها", "Confirm password")}</label><input id="p2" name="p2" type="password" minLength={8} required className="field" /></div>
        <button className="btn btn-primary py-3.5">{T("حفظ", "Save")}</button>
      </form>
    </>
  );
}
