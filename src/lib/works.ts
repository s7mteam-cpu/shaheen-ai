import "server-only";
import { createClient } from "@/lib/supabase/server";
import { signedResultUrls } from "@/lib/providers/storage";
import { getToolsL } from "@/lib/data";
import type { Work } from "@/components/app/WorkCard";

export async function listWorks(opts: { limit?: number; tool?: string; category?: string } = {}): Promise<Work[]> {
  const supabase = await createClient();
  const tools = await getToolsL(true);
  let q = supabase.from("jobs").select("id,title,tool_id,status,created_at,output,error,progress").order("created_at", { ascending: false }).limit(opts.limit ?? 60);
  if (opts.tool) q = q.eq("tool_id", opts.tool);
  if (opts.category) q = q.in("tool_id", tools.filter((t) => t.category === opts.category).map((t) => t.id));
  const { data } = await q;
  const rows = data ?? [];
  const all = rows.flatMap((r) => ((r.output as { files?: { path: string }[] })?.files ?? []).map((f) => f.path));
  const urls = await signedResultUrls(all);
  let i = 0;
  return rows.map((r) => {
    const files = ((r.output as { files?: { path: string; type: string; caption?: string }[] })?.files ?? []).map((f) => ({ url: urls[i++], type: f.type, caption: f.caption }));
    return { id: r.id, title: r.title, tool_id: r.tool_id, toolName: tools.find((t) => t.id === r.tool_id)?.name ?? r.tool_id, status: r.status, created_at: r.created_at, files, error: r.error, progress: r.progress ?? 0 };
  });
}
