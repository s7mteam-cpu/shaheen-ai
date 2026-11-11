import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

/** Removes every file under `prefix` (including nested job folders) from a bucket. */
export async function emptyFolder(bucket: string, prefix: string, depth = 0): Promise<void> {
  if (depth > 3) return;
  const store = createAdminClient().storage.from(bucket);
  for (;;) {
    const { data } = await store.list(prefix, { limit: 1000 });
    if (!data?.length) return;
    const files = data.filter((x) => x.id).map((x) => `${prefix}/${x.name}`);
    for (const dir of data.filter((x) => !x.id)) await emptyFolder(bucket, `${prefix}/${dir.name}`, depth + 1);
    if (!files.length) return;
    await store.remove(files);
    if (data.length < 1000) return;
  }
}

/** Deletes a user completely: billing, files, and all their rows (via cascade).
 *  The same email can sign up again afterwards as a brand-new account. */
export async function deleteUserCompletely(profile: { id: string; stripe_customer_id?: string | null }): Promise<{ error?: string }> {
  const admin = createAdminClient();
  if (profile.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const subs = await stripe().subscriptions.list({ customer: profile.stripe_customer_id, status: "all", limit: 20 });
      for (const s of subs.data) if (!["canceled", "incomplete_expired"].includes(s.status)) await stripe().subscriptions.cancel(s.id);
      await stripe().customers.del(profile.stripe_customer_id); // removes saved cards too
    } catch { return { error: "تعذّر إلغاء الاشتراك. حاول مرة ثانية أو تواصل مع الدعم." }; }
  }
  await admin.from("profiles").update({ referred_by: null }).eq("referred_by", profile.id);
  await Promise.all([emptyFolder("uploads", profile.id), emptyFolder("results", profile.id)]).catch(() => {});
  const { error } = await admin.auth.admin.deleteUser(profile.id);
  if (error) return { error: "تعذّر حذف الحساب. حاول مرة ثانية." };
  return {};
}
