import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** A bell notification for one customer (it is also what the mobile app's push messages will read from). The same title is not repeated within 6 hours. */
export async function notifyUser(userId: string, kind: "info" | "payment", title: string, body: string, link = "/app/account") {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 6 * 3_600_000).toISOString();
  const { data: seen } = await admin.from("notifications").select("id").eq("user_id", userId).eq("title", title).gte("created_at", since).limit(1);
  if (seen?.length) return;
  await admin.from("notifications").insert({ user_id: userId, kind, title, body, link }).then(() => null, () => null);
}
