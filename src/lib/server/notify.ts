import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/server/mail";

/** A bell notification for one customer (it is also what the mobile app's push messages will read from). The same title is not repeated within 6 hours. */
export async function notifyUser(userId: string, kind: "info" | "payment", title: string, body: string, link = "/app/account", mail = false) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 6 * 3_600_000).toISOString();
  const { data: seen } = await admin.from("notifications").select("id").eq("user_id", userId).eq("title", title).gte("created_at", since).limit(1);
  if (seen?.length) return;
  await admin.from("notifications").insert({ user_id: userId, kind, title, body, link }).then(() => null, () => null);
  // optional mail copy to the customer's own address (only for events the customer must not miss)
  if (mail) {
    const { data: p } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
    if (p?.email) await sendMail(String(p.email), title, body, link);
  }
}

/** the same bell message for every admin (e.g. «a customer's payment failed»), not repeated within 6 hours */
export async function notifyAdmins(title: string, body: string, link = "/admin/customers") {
  const admin = createAdminClient();
  const { data: team } = await admin.from("profiles").select("id").in("role", ["admin", "staff"]);
  for (const t of team ?? []) await notifyUser(t.id as string, "payment", title, body, link);
}
