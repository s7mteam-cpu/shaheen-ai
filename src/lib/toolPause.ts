import { createAdminClient } from "@/lib/supabase/admin";

/** The message a customer sees when a tool is switched off. The admin can write one per tool (site_content key «tool_msgs»); this is the default. */
export const TOOL_OFF_DEFAULT = "جاري تحديث الأداة قريباً";

/** pick the message of one tool out of the saved map («_all» = for every tool without its own) */
export function pickToolMsg(map: unknown, id?: string | null): string {
  const m = (map && typeof map === "object" ? map : {}) as Record<string, unknown>;
  const own = id ? m[id] : undefined;
  const all = m._all;
  for (const v of [own, all]) if (typeof v === "string" && v.trim()) return v.trim().slice(0, 200);
  return TOOL_OFF_DEFAULT;
}

/** for the API routes: the message to send back when a customer calls a tool that is off */
export async function toolOffMessage(id?: string | null): Promise<string> {
  try {
    const { data } = await createAdminClient().from("site_content").select("value").eq("key", "tool_msgs").maybeSingle();
    return pickToolMsg(data?.value, id);
  } catch { return TOOL_OFF_DEFAULT; }
}
