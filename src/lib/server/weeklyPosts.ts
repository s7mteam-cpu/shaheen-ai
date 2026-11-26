import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAsUser } from "@/lib/server/auth";
import { FORMAT_LABEL, FORMAT_TOOL_ID, itemRequest, planWeekOf, type Plan, type PlanItem, type PlanPrefs } from "@/lib/plan";
import { POST as designPOST } from "@/app/api/design/[action]/route";
import { POST as lessonPOST } from "@/app/api/lesson/route";
import { POST as freePOST } from "@/app/api/free-motion/route";

const CAROUSEL_SLIDES = 6;
type State = { lock?: number; lowWeek?: number; doneWeek?: number; ended?: boolean };

/** first Saturday of a plan made before the start date was stored: from the first item's "d/m" (nearest year to now) */
function startOf(plan: Plan): string | null {
  if (plan.start) return plan.start;
  const m = plan.items[0]?.date?.match(/^(\d+)\/(\d+)$/);
  if (!m) return null;
  const now = new Date();
  const cand = [now.getUTCFullYear() - 1, now.getUTCFullYear(), now.getUTCFullYear() + 1].map((y) => Date.UTC(y, Number(m[2]) - 1, Number(m[1])));
  const best = cand.sort((a, b) => Math.abs(a - now.getTime()) - Math.abs(b - now.getTime()))[0];
  return new Date(best).toISOString().slice(0, 10);
}

async function notify(userId: string, title: string, body: string, link = "/app/brand/plan") {
  await createAdminClient().from("notifications").insert({ user_id: userId, kind: "info", title, body, link }).then(() => null, () => null);
}

/** Makes one slot exactly like the customer's own button does (same routes, same price, same refund on failure), then tags it «جاهز للنشر». */
async function prepareItem(userId: string, x: PlanItem, prefs: PlanPrefs | null): Promise<string | null> {
  const mk = (url: string, body: unknown) => new Request(`http://internal${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  try {
    const rq = itemRequest(x, prefs, CAROUSEL_SLIDES);
    const res = await runAsUser(userId, () => x.format === "reel" || x.format === "scenes"
      ? lessonPOST(mk(rq.url, rq.body))
      : x.format === "creative" ? freePOST(mk(rq.url, rq.body))
      : designPOST(mk(rq.url, rq.body), { params: Promise.resolve({ action: "start" }) }));
    const d = (await res.json().catch(() => ({}))) as { jobId?: string };
    if (!res.ok || !d.jobId) return null;
    const admin = createAdminClient();
    const { data: job } = await admin.from("jobs").select("input").eq("id", d.jobId).maybeSingle();
    await admin.from("jobs").update({ input: { ...((job?.input as object) ?? {}), plan: { week: x.week, day: x.day, date: x.date, format: x.format } } }).eq("id", d.jobId);
    return d.jobId;
  } catch (e) { console.error("weekly prepare", e); return null; }
}

/** Saturday 9am Kuwait (cron): every customer who switched «جهّز منشوراتي تلقائياً» gets this week's three posts prepared. Safe to run again: finished slots are skipped. */
export async function runWeekly(budgetMs = 240_000) {
  const t0 = Date.now();
  const admin = createAdminClient();
  const { data: tl } = await admin.from("tools").select("id,credit_cost").in("id", Object.values(FORMAT_TOOL_ID));
  const price = (id: string) => tl?.find((t) => t.id === id)?.credit_cost ?? 1;
  const cost = (x: PlanItem) => (x.format === "post" ? price("post") : x.format === "carousel" ? price("carousel") * CAROUSEL_SLIDES : x.format === "scenes" ? price("real-scenes") : x.format === "ad" ? price("ad-design") : x.format === "creative" ? price("free-motion") * 2 : price("motion-video") * 2);
  const { data: kits } = await admin.from("brand_kits").select("user_id,content_plan,auto_state,plan_prefs").eq("auto_weekly", true);
  const out = { users: kits?.length ?? 0, prepared: 0, skipped: 0 };

  for (const k of kits ?? []) {
    if (Date.now() - t0 > budgetMs) break;
    const plan = k.content_plan as Plan | null;
    const state = ((k.auto_state ?? {}) as State);
    const setState = (p: Partial<State>) => admin.from("brand_kits").update({ auto_state: { ...state, ...p } }).eq("user_id", k.user_id).then(() => null, () => null);
    const start = plan?.items?.length ? startOf(plan) : null;
    if (!plan || !start || plan.scope === "week") { out.skipped++; continue; }
    const w = planWeekOf(start);
    if (w < 0) { out.skipped++; continue; }
    if (w > 3) { if (!state.ended) { await notify(k.user_id, "📅 خطتك الشهرية خلصت", "اكتب خطة الشهر الجاي عشان نكمل نجهز لك منشورات كل أسبوع.", "/app/brand/plan"); await setState({ ended: true }); } out.skipped++; continue; }
    const todo = plan.items.map((x, i) => [x, i] as const).filter(([x]) => x.week === w + 1 && !x.job);
    if (!todo.length) { out.skipped++; continue; }
    if (state.lock && Date.now() - state.lock < 12 * 60_000) { out.skipped++; continue; }

    const need = todo.reduce((n, [x]) => n + cost(x), 0);
    const { data: prof } = await admin.from("profiles").select("credits").eq("id", k.user_id).maybeSingle();
    if ((prof?.credits ?? 0) < need) {
      if (state.lowWeek !== w) { await notify(k.user_id, "⚠️ رصيدك ما يكفي لتجهيز منشورات الأسبوع", `نحتاج ${need} ريشة وعندك ${prof?.credits ?? 0}. اشحن رصيدك وراح نجهزها بأقرب مرة، أو جهّزها يدوياً من الخطة.`, "/app/account?tab=spend"); await setState({ lowWeek: w }); }
      out.skipped++; continue;
    }

    state.lock = Date.now(); await setState({ lock: state.lock });
    const ids = await Promise.all(todo.map(([x]) => prepareItem(k.user_id, x, (k.plan_prefs as PlanPrefs | null) ?? null)));
    // merge into the LATEST plan (the customer may have edited prompts meanwhile)
    const { data: cur } = await admin.from("brand_kits").select("content_plan").eq("user_id", k.user_id).maybeSingle();
    const latest = (cur?.content_plan ?? plan) as Plan;
    const items = latest.items.map((y, i) => { const n = todo.findIndex(([, idx]) => idx === i); return n >= 0 && ids[n] ? { ...y, job: ids[n] as string } : y; });
    await admin.from("brand_kits").update({ content_plan: { ...latest, items } }).eq("user_id", k.user_id);
    const ok = ids.filter(Boolean).length;
    out.prepared += ok;
    await setState({ lock: undefined, doneWeek: ok === todo.length ? w : state.doneWeek });
    if (ok) await notify(k.user_id, `✅ منشورات الأسبوع ${w + 1} جاهزة للنشر`, ok === todo.length ? `جهّزنا لك ${ok} منشورات: ${todo.map(([x]) => `${x.day} ${FORMAT_LABEL[x.format]}`).join("، ")}. راجعها وانشرها.` : `جهّزنا ${ok} من ${todo.length}. الباقي نحاول مرة ثانية أو جهّزه من الخطة.`, "/app/ready");
  }
  return out;
}
