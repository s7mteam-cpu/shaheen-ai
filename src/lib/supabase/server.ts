import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { REMEMBER_COOKIE, sessionOnly, wantsRemember } from "./remember";

/** Supabase client acting as the signed-in user (RLS applies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            const remember = wantsRemember(cookieStore.get(REMEMBER_COOKIE)?.value);
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, sessionOnly(options, remember)));
          } catch {
            /* called from a Server Component — middleware refreshes the session */
          }
        },
      },
    },
  );
}
