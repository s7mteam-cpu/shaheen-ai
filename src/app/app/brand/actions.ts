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

/** «اختيار الهوية»: the chosen concept becomes the brand kit (colours, font, and the drawn logo mark if the customer has no logo). Every tool then uses it. */
export async function chooseIdentity(conceptId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const admin = createAdminClient();
  const { data: kit } = await admin.from("brand_kits").select("identity_options,logo_url").eq("user_id", user.id).maybeSingle();
  const c = ((kit?.identity_options ?? []) as { id: string; palette: { hex: string }[]; fonts: { head: string }; logo?: { path?: string } }[]).find((x) => x.id === conceptId);
  if (!c) return { ok: false };
  let logo_url: string | null = kit?.logo_url ?? null;
  const mark = c.logo?.path;
  if (!logo_url && mark && mark.startsWith(`${user.id}/`)) {
    const dl = await admin.storage.from("results").download(mark);
    if (dl.data) {
      const path = `${user.id}/${crypto.randomUUID()}.${mark.split(".").pop() || "png"}`;
      const up = await admin.storage.from("uploads").upload(path, dl.data, { contentType: dl.data.type || "image/png" });
      if (!up.error) logo_url = path;
    }
  }
  const { error } = await admin.from("brand_kits").update({ identity: c, colors: c.palette.map((p) => p.hex).slice(0, 5), font: c.fonts.head, logo_url, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  revalidatePath("/app/brand");
  return { ok: !error };
}

/** The customer edits the prompts/captions of the plan: saved as typed (trimmed, limited). */
export async function savePlan(items: { week: number; day: string; date: string; format: string; pillar: string; topic: string; hook: string; goal: string; prompt: string; caption: string }[], month: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const clean = items.slice(0, 12).map((x) => ({ week: Number(x.week) || 1, day: String(x.day).slice(0, 12), date: String(x.date).slice(0, 8), format: ["post", "reel", "carousel"].includes(x.format) ? x.format : "post", pillar: String(x.pillar).slice(0, 40), topic: String(x.topic).slice(0, 160), hook: String(x.hook).slice(0, 200), goal: String(x.goal).slice(0, 120), prompt: String(x.prompt).slice(0, 1100), caption: String(x.caption).slice(0, 900) }));
  const { error } = await supabase.from("brand_kits").update({ content_plan: { month: String(month).slice(0, 30), items: clean } }).eq("user_id", user.id);
  revalidatePath("/app/brand/plan");
  return { ok: !error };
}
