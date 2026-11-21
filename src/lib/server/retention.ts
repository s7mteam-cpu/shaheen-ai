import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/server/mail";
import { cleanRetention, type Retention } from "@/lib/retention";

const DAY = 86_400_000;
/** brand data is not «a result»: it is never expired */
const SKIP_TOOLS = ["brand-identity", "brand-plan", "site-video"];
const BATCH = 150; // jobs deleted per run (the daily job catches up over a few days if there is a backlog)

export async function getRetention(): Promise<Retention> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "retention").maybeSingle();
  return cleanRetention(data?.value);
}

/** every string inside `vals` that is a storage path of this customer's own folder («<userId>/…», no «..», not a link) */
export function pathsOf(userId: string, ...vals: unknown[]): string[] {
  const out = new Set<string>();
  const walk = (x: unknown, d: number) => {
    if (d > 8) return;
    if (typeof x === "string") { if (x.startsWith(`${userId}/`) && x.length < 300 && !x.includes("..") && !/^https?:/i.test(x)) out.add(x); }
    else if (Array.isArray(x)) x.forEach((y) => walk(y, d + 1));
    else if (x && typeof x === "object") Object.values(x as object).forEach((y) => walk(y, d + 1));
  };
  vals.forEach((v) => walk(v, 0));
  return [...out];
}

type Row = { id: string; user_id: string; created_at: string; input: unknown; output: unknown };

export type RetentionResult = { skipped?: "off"; error?: string; dry?: boolean; warnJobs?: number; warnUsers?: number; warned?: number; deleteJobs?: number; deleted?: number; files?: number; failed?: number };

/**
 * Daily (and from the admin page): 1) tells each customer which of their results will be deleted within `warn` days,
 * 2) deletes the results whose notice is at least `warn` days old and that are past `days` days.
 * So nothing is ever deleted without a notice that is `warn` days old, even right after the feature is switched on.
 * Only the «results» storage is touched (never the customer's own uploads, logo or brand), and only paths inside
 * the customer's own folder that no live job still uses.
 */
export async function runRetention(opts: { dry?: boolean } = {}): Promise<RetentionResult> {
  const admin = createAdminClient();
  const cfg = await getRetention();
  if (!cfg.enabled && !opts.dry) return { skipped: "off" };
  const now = Date.now();
  const iso = (t: number) => new Date(t).toISOString();
  const base = () => admin.from("jobs").select("id,user_id,created_at,input,output").in("status", ["done", "failed"]).is("expired_at", null).not("tool_id", "in", `(${SKIP_TOOLS.join(",")})`);

  // 1) notices
  const { data: w, error: e1 } = await base().is("expire_warned_at", null).lt("created_at", iso(now - (cfg.days - cfg.warn) * DAY)).order("created_at").limit(500);
  if (e1) return { error: e1.message };
  const toWarn = ((w ?? []) as Row[]).filter((j) => pathsOf(j.user_id, j.output).length > 0);
  const byUser = new Map<string, string[]>();
  for (const j of toWarn) byUser.set(j.user_id, [...(byUser.get(j.user_id) ?? []), j.id]);

  // 2) deletions
  const { data: d, error: e2 } = await base().not("expire_warned_at", "is", null).lte("expire_warned_at", iso(now - cfg.warn * DAY)).lt("created_at", iso(now - cfg.days * DAY)).order("created_at").limit(BATCH);
  if (e2) return { error: e2.message };
  const due = (d ?? []) as Row[];

  if (opts.dry) {
    const files = new Set<string>();
    for (const j of due) pathsOf(j.user_id, j.input, j.output).forEach((p) => files.add(p));
    return { dry: true, warnJobs: toWarn.length, warnUsers: byUser.size, deleteJobs: due.length, files: files.size };
  }

  let warned = 0;
  for (const [uid, ids] of byUser) {
    const title = "ملفاتك بتنحذف قريباً";
    const body = `${ids.length} من أعمالك بتنحذف تلقائياً بعد ${cfg.warn} أيام (مدة حفظ الملفات ${cfg.days} يوماً من تاريخ الإنشاء). نزّل اللي تحتاجه من «أعمالي» قبل هالموعد.`;
    const { error } = await admin.from("notifications").insert({ user_id: uid, kind: "info", title, body, link: "/app/works" });
    if (error) continue;
    const { data: p } = await admin.from("profiles").select("email").eq("id", uid).maybeSingle();
    if (p?.email) await sendMail(String(p.email), title, body, "/app/works").catch(() => null);
    await admin.from("jobs").update({ expire_warned_at: new Date().toISOString() }).in("id", ids);
    warned += ids.length;
  }

  let deleted = 0, files = 0, failed = 0;
  const users = [...new Set(due.map((j) => j.user_id))];
  for (const uid of users) {
    const mine = due.filter((j) => j.user_id === uid);
    const ids = mine.map((j) => j.id);
    // paths that a job we are NOT deleting still uses (e.g. an edit made from an older video) stay
    const { data: live } = await admin.from("jobs").select("input,output").eq("user_id", uid).is("expired_at", null).not("id", "in", `(${ids.join(",")})`).limit(2000);
    if ((live?.length ?? 0) >= 2000) { failed += mine.length; continue; }
    const keep = new Set<string>();
    for (const l of live ?? []) pathsOf(uid, l.input, l.output).forEach((p) => keep.add(p));
    for (const j of mine) {
      const paths = pathsOf(uid, j.input, j.output).filter((p) => !keep.has(p));
      let ok = true;
      for (let i = 0; i < paths.length; i += 100) {
        const r = await admin.storage.from("results").remove(paths.slice(i, i + 100));
        if (r.error) { ok = false; break; }
        files += r.data?.length ?? 0;
      }
      if (!ok) { failed++; continue; }
      const { error } = await admin.from("jobs").update({ expired_at: new Date().toISOString(), output: { files: [], expired: true } }).eq("id", j.id);
      if (error) failed++; else deleted++;
    }
  }
  const res: RetentionResult = { warnJobs: toWarn.length, warnUsers: byUser.size, warned, deleteJobs: due.length, deleted, files, failed };
  await admin.from("site_content").upsert({ key: "retention_last", value: { at: new Date().toISOString(), ...res }, updated_at: new Date().toISOString() });
  return res;
}
