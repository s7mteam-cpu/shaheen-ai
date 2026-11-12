import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { customerLog, type LogItem } from "@/lib/server/customerLog";

/**
 * «الحسابات المغلقة»: before an account is deleted, a copy of who it was and its full history is kept
 * for 5 years (Privacy Policy §5), then removed by the daily job. Files and work are NOT kept.
 */
export type CloseReason = "self" | "admin" | "banned";
export const REASON_AR: Record<CloseReason, [string, string]> = {
  self: ["حذفه العميل بنفسه", "Deleted by the customer"],
  admin: ["حذفته الإدارة", "Deleted by the admin team"],
  banned: ["محظور (مخالفة)", "Banned (violation)"],
};
export const KEEP_YEARS = 5;

export async function archiveAccount(userId: string, reason: "self" | "admin", by?: string | null, note?: string | null): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const ar = (a: string) => a;
    const { profile, items } = await customerLog(userId, ar, ar);
    if (!profile) return false;
    // a blocked email means the account was closed for a violation
    const { data: block } = profile.email ? await admin.from("blocked_emails").select("reason").eq("email", profile.email.toLowerCase()).maybeSingle() : { data: null };
    const { error } = await admin.from("closed_accounts").insert({
      old_user_id: profile.id, full_name: profile.full_name, email: profile.email, phone: profile.phone,
      plan_id: profile.plan_id, credits_left: profile.credits, signed_up_at: profile.created_at,
      reason: block ? "banned" : reason, closed_by: by ?? null,
      note: [note, block?.reason ? `سبب الحظر: ${block.reason}` : ""].filter(Boolean).join(" · ").slice(0, 300) || null,
      history: items.slice(0, 3000),
    });
    return !error;
  } catch { return false; }
}

/** Daily: removes archive rows older than 5 years, and records when it ran (shown in the admin page). */
export async function purgeArchive() {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin.from("closed_accounts").delete().lt("purge_at", now).select("id");
  if (error) return { error: error.message };
  await admin.from("site_content").upsert({ key: "archive_cleanup", value: { at: now, removed: data?.length ?? 0 }, updated_at: now });
  return { removed: data?.length ?? 0 };
}

/** Closed accounts that used the same email or phone (shown as a warning on the new account). */
export async function previousClosed(email?: string | null, phone?: string | null) {
  const admin = createAdminClient();
  const ors = [email ? `email.ilike.${email.replace(/[,()*%]/g, "")}` : "", phone && phone.replace(/\D/g, "").length >= 7 ? `phone.eq.${phone.replace(/[^\d+]/g, "")}` : ""].filter(Boolean);
  if (!ors.length) return [];
  const { data } = await admin.from("closed_accounts").select("id,reason,closed_at,note,email,phone").or(ors.join(",")).order("closed_at", { ascending: false }).limit(5);
  return data ?? [];
}

export type ArchivedRow = { id: string; old_user_id: string | null; full_name: string | null; email: string | null; phone: string | null; plan_id: string | null; credits_left: number | null; signed_up_at: string | null; closed_at: string; reason: CloseReason; closed_by: string | null; note: string | null; history: LogItem[]; purge_at: string };

/** One archived account shaped like a live one, so the «السجل الكامل» page and Excel work for both. */
export async function archivedLog(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await createAdminClient().from("closed_accounts").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const a = data as ArchivedRow;
  return {
    archived: a,
    profile: { id: a.id, full_name: a.full_name, email: a.email, phone: a.phone, credits: a.credits_left ?? 0, plan_id: a.plan_id, created_at: a.signed_up_at ?? a.closed_at },
    items: (Array.isArray(a.history) ? a.history : []) as LogItem[],
  };
}
