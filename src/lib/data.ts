import "server-only";
import { toItem, SHOWCASE_CATS, DEFAULT_INTRO, DEFAULT_STEPS, type ShowcaseItem, type SectionInfo } from "@/lib/showcase";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { defaultContent, defaultPlans, defaultTools, type Plan, type SiteContent, type Tool } from "@/lib/defaults";

export const dbReady = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const getContent = cache(async (): Promise<SiteContent> => {
  if (!dbReady()) return defaultContent;
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("key,value");
  const merged = { ...defaultContent } as Record<string, unknown>;
  for (const row of data ?? []) {
    let value = row.value as Record<string, unknown>;
    // Empty or "[اكتب…]" placeholders never hide the real text (e.g. the legal pages).
    if (value && typeof value === "object" && !Array.isArray(value))
      value = Object.fromEntries(Object.entries(value).filter(([, v]) => !(typeof v === "string" && (v.trim() === "" || /^\[[\s\S]*\]$/.test(v.trim())) && row.key === "legal")));
    merged[row.key] = { ...(merged[row.key] as object), ...value };
  }
  return merged as SiteContent;
});

export const getPlans = cache(async (includeInactive = false): Promise<Plan[]> => {
  if (!dbReady()) return defaultPlans;
  const supabase = await createClient();
  let q = supabase.from("plans").select("*").order("sort_order");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data as Plan[] | null)?.length ? (data as Plan[]) : defaultPlans;
});

export const getTools = cache(async (includeDisabled = false): Promise<Tool[]> => {
  if (!dbReady()) return defaultTools;
  const supabase = await createClient();
  let q = supabase.from("tools").select("*").order("sort_order");
  if (!includeDisabled) q = q.eq("is_enabled", true);
  const { data } = await q;
  return (data as Tool[] | null)?.length ? (data as Tool[]) : defaultTools;
});

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country?: string | null;
  instagram: string | null;
  role: "user" | "admin" | "staff";
  credits: number;
  plan_id: string | null;
  is_suspended: boolean;
  referral_code: string | null;
  stripe_customer_id: string | null;
};

export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  if (!dbReady()) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile) ?? null;
});

export const getGallery = cache(async (): Promise<ShowcaseItem[]> => {
  if (!dbReady()) return [];
  const supabase = await createClient();
  // «on_home» comes with v83; until its SQL runs, every published item shows (as before)
  const q = await supabase.from("gallery_items").select("*").eq("is_published", true).eq("on_home", true).order("sort_order").order("created_at", { ascending: false }).limit(8);
  if (!q.error) return (q.data ?? []).map(toItem);
  const { data } = await supabase.from("gallery_items").select("*").eq("is_published", true).order("sort_order").limit(8);
  return (data ?? []).map(toItem);
});

/** Every published work, for the public «أعمال صُنعت بشاهين» pages. */
export const getAllWorks = cache(async (): Promise<ShowcaseItem[]> => {
  if (!dbReady()) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("gallery_items").select("*").eq("is_published", true).order("sort_order").order("created_at", { ascending: false }).limit(500);
  // the home page has its own order («الترتيب بالصفحة الرئيسية»); until it is set, a work keeps its normal order
  const key = (g: ShowcaseItem) => g.home_order ?? g.sort_order;
  return (data ?? []).map(toItem).sort((a, b) => key(a) - key(b));
});

/** The 19 sections in the admin's order (before v88's SQL: the default order), with their texts. */
export const getSections = cache(async (): Promise<SectionInfo[]> => {
  let rows: Record<string, unknown>[] = [];
  if (dbReady()) {
    const supabase = await createClient();
    const { data } = await supabase.from("showcase_sections").select("*");
    rows = (data ?? []) as Record<string, unknown>[];
  }
  const lines = (v: unknown) => String(v ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  return SHOWCASE_CATS.map(([cat], i) => {
    const r = rows.find((x) => x.cat === cat);
    const steps = lines(r?.steps);
    return {
      cat, cover_id: String(r?.cover_id ?? ""), hidden: Boolean(r?.hidden), sort_order: r ? Number(r.sort_order) : (i + 1) * 10,
      intro: String(r?.intro ?? "").trim() || DEFAULT_INTRO[cat] || "", steps: steps.length ? steps : DEFAULT_STEPS, features: lines(r?.features),
    };
  }).sort((a, b) => a.sort_order - b.sort_order);
});

/** Everything for «معرض شاهين» inside the platform. */
export const getShowcase = cache(async (): Promise<ShowcaseItem[]> => {
  if (!dbReady()) return [];
  const supabase = await createClient();
  const q = await supabase.from("gallery_items").select("*").eq("is_published", true).eq("in_app", true).order("sort_order").order("created_at", { ascending: false }).limit(500);
  if (!q.error) return (q.data ?? []).map(toItem);
  const { data } = await supabase.from("gallery_items").select("*").eq("is_published", true).order("sort_order").limit(500);
  return (data ?? []).map(toItem);
});

/** Tools with names/descriptions in the page language (English is translated once and cached). */
export const getToolsL = cache(async (includeDisabled = false) => {
  const { getLang } = await import("@/lib/server/lang");
  const { localize } = await import("@/lib/server/translate");
  return localize(await getTools(includeDisabled), await getLang());
});
