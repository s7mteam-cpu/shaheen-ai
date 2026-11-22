import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { cleanPrices, costOf, type AiPrices, type UsageRow } from "@/lib/aiPrices";
import { noteUsage } from "@/lib/server/usageCtx";

export async function getAiPrices(): Promise<AiPrices> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "ai_prices").maybeSingle();
  return cleanPrices(data?.value);
}

/** notes one Claude answer made by the website itself (not the worker). Never throws. */
export function noteClaudeUsage(model: string, data: unknown, label: string) {
  const u = (data as { usage?: Record<string, number> } | null)?.usage; if (!u) return;
  noteUsage({ provider: "claude", model, source: label, input: u.input_tokens, output: u.output_tokens, cacheRead: u.cache_read_input_tokens, cacheWrite: u.cache_creation_input_tokens });
}

export type JobCost = { jobId: string; toolId: string; at: string; user: string; status: string; credits: number; refunded: boolean; usd: number; unknown: string[]; parts: { provider: string; model: string; usd: number; known: boolean; calls: number; input: number; output: number; units: number }[] };
export type ToolCost = { toolId: string; name: string; unit: string; jobs: number; avg: number; max: number; creditCost: number; avgCredits: number; unknown: boolean };
export type CostReport = { ready: boolean; prices: AiPrices; jobs: JobCost[]; tools: ToolCost[]; site: { source: string; model: string; calls: number; usd: number; known: boolean }[]; days: number; total: number };

/** the last `days` days of noted AI calls, grouped per job and per tool */
export async function costReport(days = 30): Promise<CostReport> {
  const admin = createAdminClient();
  const prices = await getAiPrices();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const q = await admin.from("ai_usage").select("job_id,tool_id,source,provider,model,input_tokens,output_tokens,cache_read,cache_write,units,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(8000);
  if (q.error) return { ready: false, prices, jobs: [], tools: [], site: [], days, total: 0 };
  type Row = UsageRow & { job_id: string | null; tool_id: string | null; source: string | null; created_at: string };
  const rows = (q.data ?? []) as Row[];
  const byJob = new Map<string, Row[]>();
  const siteMap = new Map<string, { source: string; model: string; calls: number; usd: number; known: boolean }>();
  let total = 0;
  for (const r of rows) {
    const c = costOf(r, prices); total += c.usd;
    if (r.job_id) { const l = byJob.get(r.job_id) ?? []; l.push(r); byJob.set(r.job_id, l); continue; }
    const k = `${r.source ?? "الموقع"}|${r.model}`; const s = siteMap.get(k) ?? { source: r.source ?? "الموقع", model: r.model, calls: 0, usd: 0, known: true };
    s.calls++; s.usd += c.usd; s.known = s.known && c.known; siteMap.set(k, s);
  }
  const ids = [...byJob.keys()];
  type JobInfo = { id: string; tool_id: string; status: string; credits_charged: number; refunded: boolean; created_at: string; user_id: string };
  const info = new Map<string, JobInfo>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin.from("jobs").select("id,tool_id,status,credits_charged,refunded,created_at,user_id,site_host:input->site->>host,anim:input->>anim").in("id", ids.slice(i, i + 200));
    // «فيديو مبتكر من موقعك» is saved as a free-motion job (same engine and studio): here it is shown under its own name
    for (const j of (data ?? []) as unknown as (JobInfo & { site_host?: string | null; anim?: string | null })[]) info.set(j.id, { ...j, tool_id: j.tool_id === "free-motion" && j.site_host ? "site-free" : j.tool_id === "free-motion" && j.anim ? "anim-video" : j.tool_id });
  }
  const uids = [...new Set([...info.values()].map((j) => j.user_id))];
  const names = new Map<string, string>();
  for (let i = 0; i < uids.length; i += 200) {
    const { data } = await admin.from("profiles").select("id,full_name,email").in("id", uids.slice(i, i + 200));
    for (const p of data ?? []) names.set(p.id, p.full_name || p.email || "");
  }
  const { data: toolRows } = await admin.from("tools").select("id,name,credit_cost,cost_unit");
  const tname = new Map((toolRows ?? []).map((t) => [t.id, t]));
  const jobs: JobCost[] = ids.map((id) => {
    const list = byJob.get(id)!; const j = info.get(id);
    const parts = new Map<string, JobCost["parts"][number]>();
    for (const r of list) {
      const c = costOf(r, prices); const k = `${r.provider}|${r.model}`;
      const p = parts.get(k) ?? { provider: r.provider, model: r.model, usd: 0, known: true, calls: 0, input: 0, output: 0, units: 0 };
      p.usd += c.usd; p.known = p.known && c.known; p.calls++; p.input += r.input_tokens + r.cache_read; p.output += r.output_tokens; p.units += r.units; parts.set(k, p);
    }
    const pl = [...parts.values()];
    return { jobId: id, toolId: j?.tool_id ?? list[0].tool_id ?? "", at: j?.created_at ?? list[list.length - 1].created_at, user: j ? names.get(j.user_id) ?? "" : "", status: j?.status ?? "", credits: j?.credits_charged ?? 0, refunded: !!j?.refunded, usd: pl.reduce((a, p) => a + p.usd, 0), unknown: pl.filter((p) => !p.known).map((p) => p.model || p.provider), parts: pl };
  }).sort((a, b) => (a.at < b.at ? 1 : -1));
  const byTool = new Map<string, JobCost[]>();
  for (const j of jobs) { const l = byTool.get(j.toolId) ?? []; l.push(j); byTool.set(j.toolId, l); }
  const tools: ToolCost[] = [...byTool.entries()].map(([toolId, l]) => {
    const paid = l.filter((j) => !j.refunded && j.credits > 0);
    return { toolId, name: tname.get(toolId)?.name ?? toolId, unit: tname.get(toolId)?.cost_unit ?? "", jobs: l.length, avg: l.reduce((a, j) => a + j.usd, 0) / l.length, max: Math.max(...l.map((j) => j.usd)), creditCost: tname.get(toolId)?.credit_cost ?? 0, avgCredits: paid.length ? paid.reduce((a, j) => a + j.credits, 0) / paid.length : 0, unknown: l.some((j) => j.unknown.length > 0) };
  }).sort((a, b) => b.max - a.max);
  return { ready: true, prices, jobs: jobs.slice(0, 80), tools, site: [...siteMap.values()].sort((a, b) => b.usd - a.usd), days, total };
}
