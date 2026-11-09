"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveBrand(data: { business_name: string; logo_url: string | null; colors: string[] }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const colors = data.colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 5);
  const logo = data.logo_url && data.logo_url.startsWith(`${user.id}/`) ? data.logo_url : null;
  const { error } = await supabase.from("brand_kits").upsert({ user_id: user.id, business_name: data.business_name.slice(0, 80), logo_url: logo, colors, updated_at: new Date().toISOString() });
  revalidatePath("/app/brand");
  return { ok: !error };
}
