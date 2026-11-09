"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswordForm() {
  const [msg, setMsg] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("p1") !== f.get("p2")) return setMsg("كلمتا المرور غير متطابقتين.");
    const { error } = await createClient().auth.updateUser({ password: String(f.get("p1")) });
    setMsg(error ? "تعذّر التحديث، حاول مرة ثانية." : "تم تحديث كلمة المرور.");
    if (!error) e.currentTarget.reset();
  }
  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-3 p-6">
      <h2 className="text-lg font-bold">كلمة المرور</h2>
      <label htmlFor="p1" className="label">كلمة المرور الجديدة</label><input id="p1" name="p1" type="password" minLength={8} required className="field" />
      <label htmlFor="p2" className="label">تأكيدها</label><input id="p2" name="p2" type="password" minLength={8} required className="field" />
      {msg && <p role="status" className="text-sm text-navy-700">{msg}</p>}
      <button className="btn btn-outline self-start px-5 py-2.5">تحديث كلمة المرور</button>
    </form>
  );
}
