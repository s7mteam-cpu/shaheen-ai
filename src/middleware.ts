import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, sessionOnly, wantsRemember } from "@/lib/supabase/remember";

export async function middleware(request: NextRequest) {
  // Pages and server actions learn which admin section they belong to from this header.
  const withPath = () => { const h = new Headers(request.headers); h.set("x-path", request.nextUrl.pathname); return h; };
  let response = NextResponse.next({ request: { headers: withPath() } });

  // Keep referral code from ?ref=CODE for 30 days
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref) response.cookies.set("shaheen_ref", ref, { maxAge: 60 * 60 * 24 * 30, path: "/" });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return response;
  const remember = wantsRemember(request.cookies.get(REMEMBER_COOKIE)?.value);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: withPath() } });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, sessionOnly(options, remember)));
          if (ref) response.cookies.set("shaheen_ref", ref, { maxAge: 60 * 60 * 24 * 30, path: "/" });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPrivate = path.startsWith("/app") || path.startsWith("/admin");

  if (isPrivate && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  // signed-in visitors skip the landing page and go straight into the app
  if (user && ((path === "/" && !request.nextUrl.searchParams.has("home")) || path === "/login" || path === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand|icon.png|apple-icon.png|api/stripe/webhook|api/tap/webhook|api/cron|api/webhooks).*)"],
};
