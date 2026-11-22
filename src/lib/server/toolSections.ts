import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanToolSections, type ToolSections } from "@/lib/toolSections";

export async function getToolSections(): Promise<ToolSections> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "tool_sections").maybeSingle();
  return cleanToolSections(data?.value);
}
