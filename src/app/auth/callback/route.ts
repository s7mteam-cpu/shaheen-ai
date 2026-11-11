import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/app";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
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
  return NextResponse.redirect(new URL("/login?error=auth", url.origin));
}
