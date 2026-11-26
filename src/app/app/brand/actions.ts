"use server";
import { guardContent } from "@/lib/server/moderation";
import { cleanColors, cleanFormats, PLAN_FORMATS, type PlanPrefs } from "@/lib/plan";
import { logEvent } from "@/lib/server/events";
import { LIB_FONT_IDS } from "@/lib/fonts";
import { industryById, customField, CUSTOM_FIELD } from "@/design/industries";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function saveBrand(data: { business_name: string; logo_url: string | null; colors: string[]; handle?: string; font?: string; website?: string; instagram?: string; style_refs?: string[]; style_note?: string; style_video?: string | null; industry?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "" };
  const colors = data.colors.filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 5);
  const logo = data.logo_url && data.logo_url.startsWith(`${user.id}/`) ? data.logo_url : null;
  const url = (v?: string) => { const t = (v ?? "").trim().slice(0, 200); if (!t) return null; const u = /^https?:\/\//.test(t) ? t : `https://${t}`; try { return new URL(u).toString(); } catch { return null; } };
  const refs = (data.style_refs ?? []).filter((p) => p.startsWith(`${user.id}/`)).slice(0, 6);
  const base = { website: url(data.website), instagram: (data.instagram ?? "").trim().slice(0, 120) || null, style_refs: refs, user_id: user.id, business_name: data.business_name.slice(0, 80), logo_url: logo, colors, handle: (data.handle ?? "").slice(0, 60) || null, font: LIB_FONT_IDS.includes(data.font ?? "") ? data.font : "Cairo", updated_at: new Date().toISOString() };
  // «أسلوبي»: his taste in words (plain text, shown to the designer model as a description) and one reference video of his own
  const note = String(data.style_note ?? "").replace(/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 500) || null;
  const video = data.style_video && data.style_video.startsWith(`${user.id}/`) && !data.style_video.includes("..") ? data.style_video : null;
  if (note && (await guardContent(user.id, { idea: note }, "my-style"))) return { ok: false };
  // «مجالك»: a field from the list, or the customer's own words; recommended, not required (empty clears it)
  let ind: { industry?: string | null } = {};
  if (typeof data.industry === "string") {
    const own = customField(data.industry);
    const val = industryById(data.industry)?.id ?? (own ? `${CUSTOM_FIELD}${own}` : null);
    if (own && !industryById(data.industry) && (await guardContent(user.id, { idea: own }, "my-field"))) return { ok: false };
    ind = { industry: val };
  }
  let { error } = await supabase.from("brand_kits").upsert({ ...base, ...ind, style_note: note, style_video: video });
  if (error) ({ error } = await supabase.from("brand_kits").upsert({ ...base, ...ind })); // before SQL 0067 is run: the rest of the identity still saves
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
  if (!logo_url && typeof mark === "string" && mark.startsWith(`${user.id}/`) && !mark.includes("..")) {
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
export async function savePlan(items: { week: number; day: string; date: string; time?: string; format: string; job?: string; pillar: string; topic: string; hook: string; goal: string; prompt: string; caption: string }[], month: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const clean = items.slice(0, 12).map((x) => ({ week: Number(x.week) || 1, day: String(x.day).slice(0, 12), date: String(x.date).slice(0, 8), time: x.time ? String(x.time).slice(0, 20) : undefined, format: (PLAN_FORMATS as string[]).includes(x.format) ? x.format : "post", job: x.job && /^[0-9a-f-]{36}$/.test(x.job) ? x.job : undefined, pillar: String(x.pillar).slice(0, 40), topic: String(x.topic).slice(0, 160), hook: String(x.hook).slice(0, 200), goal: String(x.goal).slice(0, 120), prompt: String(x.prompt).slice(0, 1100), caption: String(x.caption).slice(0, 900) }));
  const { data: old } = await supabase.from("brand_kits").select("content_plan").eq("user_id", user.id).maybeSingle();
  const start = (old?.content_plan as { start?: string } | null)?.start;
  const scope = (old?.content_plan as { scope?: string } | null)?.scope === "week" ? "week" : undefined;
  const { error } = await supabase.from("brand_kits").update({ content_plan: { month: String(month).slice(0, 30), ...(start ? { start } : {}), ...(scope ? { scope } : {}), items: clean } }).eq("user_id", user.id);
  revalidatePath("/app/brand/plan");
  return { ok: !error };
}

/** Marks a made work as «جاهز للنشر» with its slot (day, date, format) so it shows under that filter in أعمالي. */
export async function tagPlanJob(jobId: string, plan: { week: number; day: string; date: string; format: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !/^[0-9a-f-]{36}$/.test(jobId)) return { ok: false };
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("input").eq("id", jobId).eq("user_id", user.id).maybeSingle();
  if (!job) return { ok: false };
  const tag = { week: Number(plan.week) || 1, day: String(plan.day).slice(0, 12), date: String(plan.date).slice(0, 8), format: (PLAN_FORMATS as string[]).includes(plan.format) ? plan.format : "post" };
  const { error } = await admin.from("jobs").update({ input: { ...((job.input as object) ?? {}), plan: tag } }).eq("id", jobId);
  revalidatePath("/app/works");
  return { ok: !error };
}

/** The customer's own switch: «جهّز منشوراتي تلقائياً كل سبت». Turning it on again also lets a finished plan notify once more. */
async function mergePrefs(patch: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data: old } = await supabase.from("brand_kits").select("plan_prefs").eq("user_id", user.id).maybeSingle();
  const { error } = await supabase.from("brand_kits").update({ plan_prefs: { ...((old?.plan_prefs as object) ?? {}), ...patch } }).eq("user_id", user.id);
  return { ok: !error };
}
export async function savePlanPrefs(p: Partial<PlanPrefs>) {
  const patch: Record<string, unknown> = {};
  if (p.carouselBg) patch.carouselBg = p.carouselBg === "ai" ? "ai" : "shapes";
  if ("postColors" in p) patch.postColors = cleanColors(p.postColors); // null = the brand's own colours
  if (typeof p.dialect === "string" && /^[a-z]{2,12}$/.test(p.dialect)) patch.dialect = p.dialect;
  if (typeof p.voiceover === "boolean") patch.voiceover = p.voiceover;
  if (typeof p.voice === "string" && /^[\w-]{0,60}$/.test(p.voice)) patch.voice = p.voice;
  if (p.vgender === "m" || p.vgender === "f" || p.vgender === "") patch.vgender = p.vgender;
  if (p.vage === "young" || p.vage === "adult" || p.vage === "senior" || p.vage === "") patch.vage = p.vage;
  if (Array.isArray(p.formats)) patch.formats = cleanFormats(p.formats);
  if (typeof p.tone === "string" && /^[a-z]{0,12}$/.test(p.tone)) patch.tone = p.tone;
  return mergePrefs(patch);
}
export async function markPlanIntro() { return mergePrefs({ introSeen: true }); }

export async function setAutoWeekly(on: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("brand_kits").update({ auto_weekly: !!on, auto_state: null }).eq("user_id", user.id);
  revalidatePath("/app", "layout");
  return { ok: !error };
}
