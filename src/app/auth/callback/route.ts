import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, logEvent } from "@/lib/server/events";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/app";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // «السجل الكامل»: Google sign-ins and email-link confirmations come through here
      if (data.user) await logEvent(data.user.id, "login", data.user.app_metadata?.provider === "google" ? "بحساب Google" : "برابط البريد", clientIp(request));
      // Attach referral for Google sign-ups (email sign-ups pass it in metadata).
      const jar = await cookies();
      const terms = jar.get("shaheen_terms")?.value;
      if (terms && data.user && !data.user.user_metadata?.terms_accepted) {
        await createAdminClient().auth.admin.updateUserById(data.user.id, {
          user_metadata: { ...data.user.user_metadata, terms_accepted: terms, terms_accepted_at: new Date().toISOString() },
        }).catch(() => {});
      }
      const ref = jar.get("shaheen_ref")?.value;
      if (ref && data.user) {
        const admin = createAdminClient();
        const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", ref).single();
        if (referrer && referrer.id !== data.user.id) {
          await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", data.user.id).is("referred_by", null);
        }
      }
      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }
  const why = `${url.searchParams.get("error_description") ?? ""}`;
  const kind = /Database error saving new user|EMAIL_BLOCKED/i.test(why) ? "blocked" : /banned/i.test(why) ? "banned" : "auth";
  return NextResponse.redirect(new URL(`/login?error=${kind}`, url.origin));
}
