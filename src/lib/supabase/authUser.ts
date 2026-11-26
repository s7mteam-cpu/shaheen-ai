import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Who is signed in, checked fast: the session token's signature is verified on this server (no trip to Supabase Auth).
 * If that can't be done (old-style token, no session, any error) it falls back to the normal getUser() check, so nothing is ever less strict.
 * Used only for READING pages; actions that change data keep calling getUser().
 */
export async function authUser(supabase: SupabaseClient): Promise<{ id: string; email?: string } | null> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    const c = data?.claims;
    if (!error && c?.sub) return { id: c.sub, email: typeof c.email === "string" ? c.email : undefined };
  } catch { /* fall back below */ }
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email } : null;
}
