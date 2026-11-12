"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";

export function PasswordForm() {
  const T = useT();
  const [msg, setMsg] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("p1") !== f.get("p2")) return setMsg(T("كلمتا المرور غير متطابقتين.", "Passwords don't match."));
    const { error } = await createClient().auth.updateUser({ password: String(f.get("p1")) });
    setMsg(error ? T("تعذّر التحديث، حاول مرة ثانية.", "Couldn't update. Please try again.") : T("تم تحديث كلمة المرور.", "Password updated."));
    if (!error) { e.currentTarget.reset(); fetch("/api/auth/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "password" }) }).catch(() => {}); }
  }
  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-3 p-6">
      <h2 className="text-lg font-bold">{T("كلمة المرور", "Password")}</h2>
      <label htmlFor="p1" className="label">{T("كلمة المرور الجديدة", "New password")}</label><input id="p1" name="p1" type="password" minLength={8} required className="field" />
      <label htmlFor="p2" className="label">{T("تأكيدها", "Confirm password")}</label><input id="p2" name="p2" type="password" minLength={8} required className="field" />
      {msg && <p role="status" className="text-sm text-navy-700">{msg}</p>}
      <button className="btn btn-outline self-start px-5 py-2.5">{T("تحديث كلمة المرور", "Update password")}</button>
    </form>
  );
}
