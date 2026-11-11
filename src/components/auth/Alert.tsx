export function Alert({ kind = "error", children }: { kind?: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p role="alert" className={`rounded-xl px-4 py-3 text-sm ${kind === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{children}</p>
  );
}

export function arabicAuthError(msg: string, lang: "ar" | "en" = "ar") {
  const T = (ar: string, en: string) => (lang === "en" ? en : ar);
  if (/Invalid login/i.test(msg)) return T("البريد أو كلمة المرور غير صحيحة.", "Incorrect email or password.");
  if (/Email not confirmed/i.test(msg)) return T("أكّد بريدك الإلكتروني أولاً من الرسالة اللي وصلتك.", "Please confirm your email first using the link we sent you.");
  if (/already registered/i.test(msg)) return T("هذا البريد مسجّل مسبقاً، سجّل دخولك.", "This email is already registered. Please sign in.");
  if (/Database error saving new user|EMAIL_BLOCKED/i.test(msg)) return T("هذا البريد ممنوع من التسجيل بمنصة شاهين. إذا تعتقد إن في خطأ، تواصل معنا.", "This email can't be used to register on Shaheen. If you think this is a mistake, please contact us.");
  if (/banned/i.test(msg)) return T("هذا الحساب موقوف. تواصل مع الدعم.", "This account is suspended. Please contact support.");
  if (/Password should be/i.test(msg)) return T("كلمة المرور لازم تكون 8 أحرف أو أكثر.", "Password must be at least 8 characters.");
  return T("صار خطأ، حاول مرة ثانية.", "Something went wrong. Please try again.");
}
