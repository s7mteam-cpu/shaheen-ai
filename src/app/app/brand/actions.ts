"use server";
import { logEvent } from "@/lib/server/events";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveBrand(data: { business_name: string; logo_url: string | null; colors: string[]; handle?: string; font?: string; website?: string; instagram?: string; style_refs?: string[] }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const colors = data.colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 5);
  const logo = data.logo_url && data.logo_url.startsWith(`${user.id}/`) ? data.logo_url : null;
  const url = (v?: string) => { const t = (v ?? "").trim().slice(0, 200); if (!t) return null; const u = /^https?:\/\//.test(t) ? t : `https://${t}`; try { return new URL(u).toString(); } catch { return null; } };
  const refs = (data.style_refs ?? []).filter((p) => p.startsWith(`${user.id}/`)).slice(0, 6);
  const { error } = await supabase.from("brand_kits").upsert({ website: url(data.website), instagram: (data.instagram ?? "").trim().slice(0, 120) || null, style_refs: refs, user_id: user.id, business_name: data.business_name.slice(0, 80), logo_url: logo, colors, handle: (data.handle ?? "").slice(0, 60) || null, font: ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"].includes(data.font ?? "") ? data.font : null, updated_at: new Date().toISOString() });
  revalidatePath("/app/brand");
  return { ok: !error };
}

/** «تصفير الهوية»: removes the whole brand kit (name, logo, colours, contacts, style pictures) as if it was never set. */
export async function resetBrand() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data } = await supabase.from("brand_kits").select("logo_url,style_refs").eq("user_id", user.id).maybeSingle();
  const files = [data?.logo_url, ...((data?.style_refs as string[] | null) ?? [])].filter((p): p is string => !!p && p.startsWith(`${user.id}/`));
  if (files.length) await createAdminClient().storage.from("uploads").remove(files).then(() => null, () => null);
  const { error } = await supabase.from("brand_kits").delete().eq("user_id", user.id);
  if (!error) await logEvent(user.id, "brand_reset");
  revalidatePath("/app/brand");
  return { ok: !error };
}
