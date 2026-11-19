import { BRANDS, type BrandId } from "@/remotion/brandIcons";

export const FREE_FONTS = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"];
const hex = (v: unknown, d: string) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : d);

/** The social accounts of a request, checked (only known apps, plain handles). */
export const cleanContact = (raw: unknown) => (Array.isArray(raw) ? raw : []).slice(0, 6).flatMap((c: Record<string, unknown>) => {
  const icon = String(c?.icon ?? ""), handle = String(c?.handle ?? "").replace(/[^\w@+.\-]/g, "").slice(0, 40);
  return icon in BRANDS && handle ? [{ icon: icon as BrandId, handle }] : [];
});
export const cleanColors = (c: unknown) => { const o = (c ?? {}) as Record<string, unknown>; return { bg: hex(o.bg, "#0B2A4A"), accent: hex(o.accent, "#E8B44C"), text: hex(o.text, "#FFFFFF") }; };
