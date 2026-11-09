import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user) return null;
  const { data } = await createAdminClient().from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin" ? user : null;
}
