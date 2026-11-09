"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/auth/Alert";

export default function ResetPassword() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("p1") !== f.get("p2")) return setError("كلمتا المرور غير متطابقتين.");
    const { error } = await createClient().auth.updateUser({ password: String(f.get("p1")) });
    if (error) return setError("ما قدرنا نحدّث كلمة المرور. اطلب رابطاً جديداً.");
    router.replace("/app");
  }
  return (
    <>
      <h1 className="text-3xl font-bold text-navy-900">كلمة مرور جديدة</h1>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2"><label htmlFor="p1" className="label">كلمة المرور الجديدة</label><input id="p1" name="p1" type="password" minLength={8} required className="field" /></div>
        <div className="flex flex-col gap-2"><label htmlFor="p2" className="label">تأكيدها</label><input id="p2" name="p2" type="password" minLength={8} required className="field" /></div>
        <button className="btn btn-primary py-3.5">حفظ</button>
      </form>
    </>
  );
}
