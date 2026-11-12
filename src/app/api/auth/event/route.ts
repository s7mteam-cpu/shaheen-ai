import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, logEvent } from "@/lib/server/events";
import { dbReady } from "@/lib/data";

/**
 * Account events from the browser (sign-in happens in the browser with Supabase):
 *  - "login" / "password": only for the signed-in user (read from the session cookie, can't be faked for someone else).
 *  - "login_failed": a wrong password for an email. 5 failures in 15 minutes → alert to the admins and the account owner.
 * Always answers {ok:true} so it never tells anyone whether an email has an account.
 */
const hits = new Map<string, number[]>();
function flooded(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 30;
}
const ALERT_AT = 5, WINDOW_MIN = 15;

export async function POST(req: Request) {
  const ok = NextResponse.json({ ok: true });
  if (!dbReady()) return ok;
  const ip = clientIp(req);
  if (flooded(ip ?? "?")) return NextResponse.json({ ok: true }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { kind?: string; email?: string };
  const admin = createAdminClient();

  if (b.kind === "login" || b.kind === "password") {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return ok;
    if (b.kind === "login") {
      // one "login" line per 30 minutes is enough
      const since = new Date(Date.now() - 30 * 60_000).toISOString();
      const { count } = await admin.from("user_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("kind", "login").gte("created_at", since);
      if ((count ?? 0) > 0) return ok;
      await logEvent(user.id, "login", "بالبريد وكلمة المرور", ip);
    } else await logEvent(user.id, "password", null, ip);
    return ok;
  }

  if (b.kind === "login_failed") {
    const email = String(b.email ?? "").trim().toLowerCase().slice(0, 200);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return ok;
    const { data: p } = await admin.from("profiles").select("id,email").ilike("email", email).maybeSingle();
    if (!p) return ok;
    await logEvent(p.id, "login_failed", null, ip);
    const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
    const { count } = await admin.from("user_events").select("id", { count: "exact", head: true }).eq("user_id", p.id).eq("kind", "login_failed").gte("created_at", since);
    if ((count ?? 0) === ALERT_AT) {
      const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
      await admin.from("notifications").insert([
        ...(admins ?? []).map((a) => ({
          user_id: a.id, kind: "warn", title: "🔐 محاولات دخول فاشلة متكررة",
          body: `${ALERT_AT} محاولات خاطئة خلال ${WINDOW_MIN} دقيقة على حساب ${p.email ?? ""}`, link: `/admin/customers/log?id=${p.id}`,
        })),
        {
          user_id: p.id, kind: "warn", title: "🔐 محاولات دخول على حسابك",
          body: "صار في عدة محاولات دخول بكلمة مرور خاطئة على حسابك. إذا ما كنت أنت، غيّر كلمة المرور من «الحساب والاشتراك».", link: "/app/account",
        },
      ]).then(() => null, () => null);
    }
  }
  return ok;
}
