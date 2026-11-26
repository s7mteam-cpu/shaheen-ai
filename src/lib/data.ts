import "server-only";
import type { TemplateRow } from "@/lib/templates";
import { toItem, SHOWCASE_CATS, DEFAULT_INTRO, DEFAULT_STEPS, type ShowcaseItem, type SectionInfo } from "@/lib/showcase";
import { cache } from "react";
import { authUser } from "@/lib/supabase/authUser";
import { unstable_cache } from "next/cache";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { defaultContent, defaultPlans, defaultTools, type Plan, type SiteContent, type Tool } from "@/lib/defaults";

/** Cookie-less read client for PUBLIC site data (content, tools): safe to cache across visitors. */
const anonDb = () => createSbClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
/** Speed: these rarely change, so they're kept for 30 s across all visitors (an admin edit shows up within 30 s). */
const TTL = 30;

export const dbReady = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const siteRows = unstable_cache(async () => (await anonDb().from("site_content").select("key,value")).data ?? [], ["site_content_rows"], { revalidate: TTL });
export const getContent = cache(async (): Promise<SiteContent> => {
  if (!dbReady()) return defaultContent;
  const data = await siteRows().catch(async () => (await (await createClient()).from("site_content").select("key,value")).data ?? []);
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

const enabledTools = unstable_cache(async () => (await anonDb().from("tools").select("*").order("sort_order").eq("is_enabled", true)).data ?? [], ["tools_enabled"], { revalidate: TTL });
export const getTools = cache(async (includeDisabled = false): Promise<Tool[]> => {
  if (!dbReady()) return defaultTools;
  let data: unknown;
  if (!includeDisabled) data = await enabledTools().catch(async () => (await (await createClient()).from("tools").select("*").order("sort_order").eq("is_enabled", true)).data);
  else data = (await (await createClient()).from("tools").select("*").order("sort_order")).data;
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
  const user = await authUser(supabase);
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

/**
 * The 19 sections in the order the home page shows them. A section with its own number («ترتيب الأقسام وشرحها») uses it;
 * otherwise it follows its works: the smallest «الترتيب بالصفحة الرئيسية» number among them (so a work numbered 1 brings its card first).
 */
export const getSections = cache(async (): Promise<SectionInfo[]> => {
  let rows: Record<string, unknown>[] = [];
  if (dbReady()) {
    const supabase = await createClient();
    const { data } = await supabase.from("showcase_sections").select("*");
    rows = (data ?? []) as Record<string, unknown>[];
  }
  const works = await getAllWorks();
  const lines = (v: unknown) => String(v ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  return SHOWCASE_CATS.map(([cat], i) => {
    const r = rows.find((x) => x.cat === cat);
    const steps = lines(r?.steps);
    const own = r ? Number(r.sort_order) || 0 : 0;
    const keys = works.filter((g) => g.category === cat).map((g) => g.home_order ?? g.sort_order);
    const firstAt = works.findIndex((g) => g.category === cat); // equal numbers: the one whose work comes first in the list
    return {
      i: firstAt < 0 ? 9999 + i : firstAt, rank: own > 0 ? own : keys.length ? Math.min(...keys) : 9999,
      cat, cover_id: String(r?.cover_id ?? ""), hidden: Boolean(r?.hidden), sort_order: own,
      intro: String(r?.intro ?? "").trim() || DEFAULT_INTRO[cat] || "", steps: steps.length ? steps : DEFAULT_STEPS, features: lines(r?.features),
    };
  }).sort((a, b) => a.rank - b.rank || a.i - b.i).map(({ i: _i, rank: _r, ...s }) => { void _i; void _r; return s; });
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

/** «إغلاق الاشتراك مؤقتاً» (see payGate.ts) */
export const getPayGate = cache(async () => {
  const { cleanPayGate, PAYGATE_KEY } = await import("@/lib/payGate");
  if (!dbReady()) return cleanPayGate(null);
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("value").eq("key", PAYGATE_KEY).maybeSingle();
  return cleanPayGate(data?.value);
});

/** «إخفاء مكتبة القوالب»: one switch (site_content key «templates_lib», value {hidden}) that hides the template library everywhere. */
const tplLib = unstable_cache(async () => (await anonDb().from("site_content").select("value").eq("key", "templates_lib").maybeSingle()).data, ["templates_lib_row"], { revalidate: TTL });
export const templatesHidden = cache(async (): Promise<boolean> => {
  if (!dbReady()) return false;
  const data = await tplLib().catch(async () => (await (await createClient()).from("site_content").select("value").eq("key", "templates_lib").maybeSingle()).data);
  return (data?.value as { hidden?: boolean } | null)?.hidden === true;
});

/** The motion template library (published only), shown on the public pages and inside the app. Empty while the library is hidden. */
export const getTemplates = cache(async (): Promise<TemplateRow[]> => {
  if (!dbReady() || (await templatesHidden())) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("video_templates").select("id,style,title,seconds,aspect,thumb_url,sort_order,is_published,source").eq("is_published", true).order("sort_order").order("created_at", { ascending: false }).limit(2000);
  return (data ?? []) as TemplateRow[];
});

/** Tools with names/descriptions in the page language (English is translated once and cached). */
export const getToolsL = cache(async (includeDisabled = false) => {
  const { getLang } = await import("@/lib/server/lang");
  const { localize } = await import("@/lib/server/translate");
  return localize(await getTools(includeDisabled), await getLang());
});
