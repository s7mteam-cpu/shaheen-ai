import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type EventKind = "login" | "login_failed" | "password" | "violation" | "brand_reset";

/** Writes one account event for «السجل الكامل». Never throws: a failed log must not block the user. */
export async function logEvent(userId: string, kind: EventKind, detail?: string | null, ip?: string | null) {
  await createAdminClient().from("user_events").insert({
    user_id: userId, kind, detail: detail ? detail.slice(0, 300) : null, ip: ip ? ip.slice(0, 64) : null,
  }).then(() => null, () => null);
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
}
