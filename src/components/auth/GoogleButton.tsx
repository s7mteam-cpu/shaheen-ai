"use client";
import { createClient, setRemember } from "@/lib/supabase/client";
import { useT } from "@/components/LangProvider";

export function GoogleButton({ next = "/app", remember = true, disabled = false, onBlocked }: { next?: string; remember?: boolean; disabled?: boolean; onBlocked?: () => void }) {
  const T = useT();
  async function go() {
    if (disabled) return onBlocked?.();
    setRemember(remember);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }
  return (
    <button type="button" onClick={go} aria-disabled={disabled} className={`btn btn-outline w-full py-3.5 text-base font-semibold text-ink ${disabled ? "opacity-50" : ""}`}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2.1v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" /></svg>
      {T("المتابعة بحساب Google", "Continue with Google")}
    </button>
  );
}

export function OrDivider({ text }: { text?: string }) {
  const T = useT();
  text ??= T("أو بالبريد الإلكتروني", "or with email");
  return <div className="flex items-center gap-3 text-sm text-subtle"><span className="h-px flex-1 bg-line" />{text}<span className="h-px flex-1 bg-line" /></div>;
}
