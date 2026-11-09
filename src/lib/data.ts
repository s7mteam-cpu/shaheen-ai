import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { defaultContent, defaultPlans, defaultTools, type Plan, type SiteContent, type Tool } from "@/lib/defaults";

export const dbReady = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const getContent = cache(async (): Promise<SiteContent> => {
  if (!dbReady()) return defaultContent;
  const supabase = await createClient();
  const { data } = await supabase.from("site_content").select("key,value");
  const merged = { ...defaultContent } as Record<string, unknown>;
  for (const row of data ?? []) merged[row.key] = { ...(merged[row.key] as object), ...(row.value as object) };
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
  instagram: string | null;
  role: "user" | "admin";
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

export const getGallery = cache(async () => {
  if (!dbReady()) return [] as { id: string; title: string; media_url: string; media_type: string }[];
  const supabase = await createClient();
  const { data } = await supabase.from("gallery_items").select("id,title,media_url,media_type").eq("is_published", true).order("sort_order");
  return data ?? [];
});
