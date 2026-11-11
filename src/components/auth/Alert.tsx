export function Alert({ kind = "error", children }: { kind?: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p role="alert" className={`rounded-xl px-4 py-3 text-sm ${kind === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{children}</p>
  );
}

export function arabicAuthError(msg: string) {
  if (/Invalid login/i.test(msg)) return "البريد أو كلمة المرور غير صحيحة.";
  if (/Email not confirmed/i.test(msg)) return "أكّد بريدك الإلكتروني أولاً من الرسالة اللي وصلتك.";
  if (/already registered/i.test(msg)) return "هذا البريد مسجّل مسبقاً، سجّل دخولك.";
  if (/Database error saving new user|EMAIL_BLOCKED/i.test(msg)) return "هذا البريد ممنوع من التسجيل بمنصة شاهين. إذا تعتقد إن في خطأ، تواصل معنا.";
  if (/banned/i.test(msg)) return "هذا الحساب موقوف. تواصل مع الدعم.";
  if (/Password should be/i.test(msg)) return "كلمة المرور لازم تكون 8 أحرف أو أكثر.";
  return "صار خطأ، حاول مرة ثانية.";
}
