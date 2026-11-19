import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRANDS, type BrandId } from "@/remotion/brandIcons";

export const FREE_FONTS = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"];
const hex = (v: unknown, d: string) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : d);

/** The social accounts of a request, checked (only known apps, plain handles). */
export const cleanContact = (raw: unknown) => (Array.isArray(raw) ? raw : []).slice(0, 6).flatMap((c: Record<string, unknown>) => {
  const icon = String(c?.icon ?? ""), handle = String(c?.handle ?? "").replace(/[^\w@+.\-]/g, "").slice(0, 40);
  return icon in BRANDS && handle ? [{ icon: icon as BrandId, handle }] : [];
});
export const cleanColors = (c: unknown) => { const o = (c ?? {}) as Record<string, unknown>; return { bg: hex(o.bg, "#0B2A4A"), accent: hex(o.accent, "#E8B44C"), text: hex(o.text, "#FFFFFF") }; };

/** The customer's brand-kit logo (path in uploads + a signed link), if he has one. */
export async function brandKitLogo(): Promise<{ path: string; url: string } | null> {
  const supabase = await createClient();
  const { data: kitRow } = await supabase.from("brand_kits").select("logo_url").maybeSingle();
  if (!kitRow?.logo_url) return null;
  const url = (await createAdminClient().storage.from("uploads").createSignedUrl(kitRow.logo_url as string, 60 * 60 * 6)).data?.signedUrl ?? "";
  return url ? { path: kitRow.logo_url as string, url } : null;
}
