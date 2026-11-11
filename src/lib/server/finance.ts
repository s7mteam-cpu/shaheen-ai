import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const CATEGORY: Record<string, string> = { fixed: "ثابتة شهرية", yearly: "اشتراك سنوي", usage: "حسب الاستخدام", other: "أخرى" };
export const DEFAULT_USD_KWD = 0.307;

export type Expense = { id: string; spent_on: string; vendor: string; category: string; amount: number; currency: string; note: string | null; receipt_path: string | null; source: string; period: string | null };
export type Income = { id: string; received_on: string; source: string; description: string; customer_name: string | null; amount: number; currency: string; method: string | null; note: string | null };
export type Recurring = { id: string; vendor: string; category: string; amount: number; currency: string; day_of_month: number; month_of_year: number | null; starts_on: string; is_active: boolean; note: string | null };

export async function financeSettings(): Promise<{ usd_kwd: number }> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "finance").maybeSingle();
  const r = Number((data?.value as { usd_kwd?: number } | null)?.usd_kwd);
  return { usd_kwd: r > 0 ? r : DEFAULT_USD_KWD };
}

export const toKwd = (amount: number, currency: string, rate: number) => (currency === "KWD" ? Number(amount) : Number(amount) * rate);

const ym = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/** Adds this month's fixed costs and this year's yearly costs that are due and not posted yet. Safe to call often. */
export async function postRecurring() {
  const admin = createAdminClient();
  const { data: list, error } = await admin.from("recurring_expenses").select("*").eq("is_active", true);
  if (error || !list?.length) return;
  const now = new Date();
  const rows = [];
  for (const r of list as Recurring[]) {
    const start = new Date(r.starts_on + "T00:00:00Z");
    if (r.category === "fixed") {
      // every month from the start month until now
      for (let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)); d <= now; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
        const due = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), r.day_of_month));
        if (due < start || due > now) continue;
        rows.push({ recurring_id: r.id, period: ym(due), spent_on: due.toISOString().slice(0, 10), vendor: r.vendor, category: "fixed", amount: r.amount, currency: r.currency, note: r.note, source: "recurring" });
      }
    } else {
      for (let y = start.getUTCFullYear(); y <= now.getUTCFullYear(); y++) {
        const due = new Date(Date.UTC(y, (r.month_of_year ?? start.getUTCMonth() + 1) - 1, r.day_of_month));
        if (due < start || due > now) continue;
        rows.push({ recurring_id: r.id, period: String(y), spent_on: due.toISOString().slice(0, 10), vendor: r.vendor, category: "yearly", amount: r.amount, currency: r.currency, note: r.note, source: "recurring" });
      }
    }
  }
  if (rows.length) await admin.from("expenses").upsert(rows, { onConflict: "recurring_id,period", ignoreDuplicates: true });
}

/** Claude's real cost for each month of this year, from Anthropic's Cost API (needs ANTHROPIC_ADMIN_KEY). */
export async function syncClaudeCosts(): Promise<{ ok?: string; error?: string }> {
  const key = process.env.ANTHROPIC_ADMIN_KEY;
  if (!key) return { error: "ما في مفتاح ANTHROPIC_ADMIN_KEY بإعدادات Vercel. طلّعه من Claude Console ← Settings ← Admin keys." };
  const year = new Date().getUTCFullYear();
  const byMonth = new Map<string, number>();
  let start = `${year}-01-01T00:00:00Z`;
  for (let guard = 0; guard < 20; guard++) {
    const url = new URL("https://api.anthropic.com/v1/organizations/cost_report");
    url.searchParams.set("starting_at", start);
    url.searchParams.set("bucket_width", "1d");
    url.searchParams.set("limit", "31");
    const res = await fetch(url, { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" }, cache: "no-store" });
    if (!res.ok) return { error: `Anthropic رد بخطأ (${res.status}). تأكد إن المفتاح Admin key صحيح وإن حسابك منظّمة (Organization).` };
    const body = (await res.json()) as { data?: { starting_at: string; results?: { amount?: string; currency?: string }[] }[]; has_more?: boolean; next_page?: string };
    for (const b of body.data ?? []) {
      const m = b.starting_at.slice(0, 7);
      const cents = (b.results ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      byMonth.set(m, (byMonth.get(m) ?? 0) + cents / 100);
    }
    const page = body.has_more ? body.next_page : undefined;
    const last = body.data?.at(-1)?.starting_at;
    if (!page || !last) break;
    const next = new Date(last); next.setUTCDate(next.getUTCDate() + 1);
    if (next > new Date()) break;
    start = next.toISOString();
  }
  const rows = [...byMonth].filter(([, v]) => v > 0).map(([m, v]) => ({
    source: "claude-api", period: m, vendor: "Claude (Anthropic)", category: "usage", amount: Math.round(v * 1000) / 1000, currency: "USD",
    spent_on: `${m}-28`, note: "تلقائي من Anthropic Cost API",
  }));
  if (!rows.length) return { ok: "ما في تكاليف Claude مسجّلة هالسنة لسا." };
  const admin = createAdminClient();
  for (const r of rows) {
    const { data: ex } = await admin.from("expenses").select("id").eq("source", "claude-api").eq("period", r.period).maybeSingle();
    if (ex) await admin.from("expenses").update({ amount: r.amount }).eq("id", ex.id);
    else await admin.from("expenses").insert(r);
  }
  return { ok: `تحدّثت تكاليف Claude لـ ${rows.length} شهر.` };
}
