// «تكلفة كل طلب»: every call the worker makes to an AI provider is noted in the table ai_usage with the job it belongs to
// (tokens for Claude and Gemini, characters for ElevenLabs speech). Nothing here can fail a job: every step is best-effort.
import { AsyncLocalStorage } from "node:async_hooks";

const als = new AsyncLocalStorage();
let db = null;

/** the job the worker is on now: calls made from here on are noted under it */
export function setUsageJob(job) { try { als.enterWith({ job: job ? { id: job.id, user_id: job.user_id, tool_id: job.tool_id } : null }); } catch { /* ignore */ } }

function save(job, row) {
  if (!db) return;
  const n = (x) => (Number.isFinite(Number(x)) ? Math.max(0, Math.round(Number(x))) : 0);
  Promise.resolve(db.from("ai_usage").insert({
    job_id: job?.id ?? null, user_id: job?.user_id ?? null, tool_id: job?.tool_id ?? null, source: "worker",
    provider: row.provider, model: String(row.model || "").slice(0, 120),
    input_tokens: n(row.input), output_tokens: n(row.output), cache_read: n(row.cacheRead), cache_write: n(row.cacheWrite), units: n(row.units),
  })).then(() => {}, () => {});
}
const last = (text, key) => { let m, v = 0; const re = new RegExp(`"${key}"\\s*:\\s*(\\d+)`, "g"); while ((m = re.exec(text))) v = Math.max(v, Number(m[1])); return v; };

/** reads a copy of the answer (the beginning and the end are enough: the counts live there) and notes the usage */
async function scan(stream, provider, model, job) {
  try {
    const dec = new TextDecoder(); let head = "", tail = "";
    for await (const chunk of stream) { const t = dec.decode(chunk, { stream: true }); if (head.length < 8000) head += t; tail = (tail + t).slice(-8000); }
    const text = `${head.slice(0, 8000)}\n${tail}`;
    if (provider === "claude") save(job, { provider, model, input: last(text, "input_tokens"), output: last(text, "output_tokens"), cacheRead: last(text, "cache_read_input_tokens"), cacheWrite: last(text, "cache_creation_input_tokens") });
    else save(job, { provider, model, input: last(text, "promptTokenCount"), output: last(text, "candidatesTokenCount") + last(text, "thoughtsTokenCount"), cacheRead: last(text, "cachedContentTokenCount") });
  } catch { /* ignore */ }
}

export function initUsage(client) {
  if (db) return; db = client;
  const real = globalThis.fetch;
  globalThis.fetch = async function (input, init) {
    const res = await real(input, init);
    try {
      const url = typeof input === "string" ? input : String(input?.url ?? input);
      const provider = url.startsWith("https://api.anthropic.com/v1/messages") ? "claude"
        : /^https:\/\/generativelanguage\.googleapis\.com\/.*:(streamGenerateContent|generateContent)/.test(url) ? "google"
        : url.startsWith("https://api.elevenlabs.io/v1/text-to-speech") ? "elevenlabs" : null;
      if (!provider || !res.ok) return res;
      const job = als.getStore()?.job ?? null;
      let body = {}; try { body = typeof init?.body === "string" ? JSON.parse(init.body) : {}; } catch { /* ignore */ }
      if (provider === "elevenlabs") { save(job, { provider, model: body.model_id, units: String(body.text ?? "").length }); return res; }
      if (!res.body) return res;
      const model = provider === "claude" ? body.model : decodeURIComponent((url.match(/\/models\/([^:/?]+)/) || [])[1] || "");
      const [a, b] = res.body.tee();
      scan(b, provider, model, job);
      return new Response(a, { status: res.status, statusText: res.statusText, headers: res.headers });
    } catch { return res; }
  };
}
