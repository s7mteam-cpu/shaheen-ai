import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { industryById } from "@/design/industries";
import { guessForKit } from "@/lib/server/guessIndustry";
import { trendsFor } from "@/lib/server/trends";
import { TOOL_SCOPE } from "@/lib/team";

/** «فريق التوجيه» for ANY tool by its id: the customer's field (from هويتي, or the closest one to what he wrote), the team's skills for this kind of tool,
 *  his own «تعليماتي», and the approved trends. One block of text, empty when the tool is not covered or the team is off. */
export async function teamBriefFor(toolId: string, userId: string, text = "", maxChars = 12000): Promise<string> {
  const scope = TOOL_SCOPE[toolId];
  if (!scope) return "";
  try {
    const { data } = await createAdminClient().from("brand_kits").select("industry").eq("user_id", userId).maybeSingle();
    const kit = (data as { industry?: string | null } | null)?.industry ?? null;
    const ind = scope === "cv" ? undefined : industryById(kit ?? undefined) ?? industryById(await guessForKit(kit, text));
    return (await trendsFor(ind?.id, scope, userId)).slice(0, maxChars);
  } catch { return ""; }
}
