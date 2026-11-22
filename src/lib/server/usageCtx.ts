import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { jobId?: string | null; userId?: string | null; toolId?: string | null };
const als = new AsyncLocalStorage<Ctx>();

/** from here on in this request, AI calls are noted under this job («تكلفة كل طلب») */
export function setUsageCtx(c: Ctx) { try { als.enterWith(c); } catch { /* best effort */ } }

type Note = { provider: string; model: string; source: string; input?: number; output?: number; cacheRead?: number; cacheWrite?: number; units?: number };
/** one AI call made by the website itself (the worker notes its own). Never throws and never waits. */
export function noteUsage(n: Note) {
  try {
    const c = als.getStore() ?? {};
    const i = (x: unknown) => (Number.isFinite(Number(x)) ? Math.max(0, Math.round(Number(x))) : 0);
    void createAdminClient().from("ai_usage").insert({
      job_id: c.jobId ?? null, user_id: c.userId ?? null, tool_id: c.toolId ?? null, source: n.source.slice(0, 40), provider: n.provider, model: String(n.model || "").slice(0, 120),
      input_tokens: i(n.input), output_tokens: i(n.output), cache_read: i(n.cacheRead), cache_write: i(n.cacheWrite), units: i(n.units),
    }).then(() => {}, () => {});
  } catch { /* best effort */ }
}
