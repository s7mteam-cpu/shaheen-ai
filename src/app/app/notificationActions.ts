"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Marks all of the signed-in user's notifications as read. */
export async function markNotificationsRead() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return;
  await createAdminClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  revalidatePath("/app", "layout");
}
