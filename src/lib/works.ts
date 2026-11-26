import "server-only";
import { createClient } from "@/lib/supabase/server";
import { authUser } from "@/lib/supabase/authUser";
import { signedResultUrls } from "@/lib/providers/storage";
import { getToolsL, getContent } from "@/lib/data";
import { cleanRetention, daysLeft } from "@/lib/retention";
import type { Work } from "@/components/app/WorkCard";

export async function listWorks(opts: { limit?: number; tool?: string; category?: string; ready?: boolean } = {}): Promise<Work[]> {
  const supabase = await createClient();
  // Speed: the user check, the tool list and the site content are independent, so they run side by side.
  const [user, tools, content] = await Promise.all([authUser(supabase), getToolsL(true), getContent()]);
  if (!user) return [];
  const keep = cleanRetention((content as unknown as { retention?: unknown }).retention);
  // admins can read every job (RLS), so «أعمالي» must filter to the signed-in user explicitly
  let q = supabase.from("jobs").select("id,title,tool_id,status,created_at,output,error,progress,plan:input->plan,site:input->site").eq("user_id", user.id).order("created_at", { ascending: false }).not("tool_id", "in", "(brand-identity,brand-plan,site-video)").limit(opts.limit ?? 60);
  if (opts.ready) q = q.not("input->plan", "is", null);
  if (opts.tool) q = q.eq("tool_id", opts.tool);
  if (opts.category) q = q.in("tool_id", tools.filter((t) => t.category === opts.category).map((t) => t.id));
  const { data } = await q;
  const rows = data ?? [];
  const all = rows.flatMap((r) => ((r.output as { files?: { path: string }[] })?.files ?? []).map((f) => f.path));
  const urls = await signedResultUrls(all);
  let i = 0;
  return rows.map((r) => {
    const files = ((r.output as { files?: { path: string; type: string; caption?: string }[] })?.files ?? []).map((f) => ({ url: urls[i++], type: f.type, caption: f.caption }));
    const expired = (r.output as { expired?: boolean } | null)?.expired === true;
    return { id: r.id, title: r.title, tool_id: r.tool_id, toolName: r.tool_id === "motion-video" && (r as unknown as { site?: string | null }).site ? (tools.find((t) => t.id === "site-video")?.name ?? "فيديو من موقعك") : tools.find((t) => t.id === r.tool_id)?.name ?? r.tool_id, status: r.status, created_at: r.created_at, files, error: r.error, plan: ((r as unknown as { plan?: { day: string; date: string; format: string } | null }).plan) ?? undefined, progress: r.progress ?? 0, expired, daysLeft: keep.enabled && !expired && r.status === "done" && files.length ? daysLeft(r.created_at, keep.days) : undefined };
  });
}
