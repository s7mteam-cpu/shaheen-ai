import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Every table that matters (used by «تنزيل البيانات» and by the Google Sheets sync). */
export const TABLES = [
  "profiles", "subscriptions", "credit_ledger", "jobs", "income", "expenses", "recurring_expenses", "tap_charges",
  "plans", "tools", "site_content", "gallery_items", "brand_kits", "leads", "admin_audit", "blocked_emails",
  "closed_accounts", "user_events", "support_access", "price_history", "partners", "partner_moves", "employees", "finance_periods",
  "transfers", "transfer_methods",
];
export type Row = Record<string, unknown>;

export async function allRows(table: string) {
  const admin = createAdminClient();
  const rows: Row[] = [];
  for (let from = 0; from < 200_000; from += 1000) {
    const { data, error } = await admin.from(table).select("*").range(from, from + 999);
    if (error) return { rows, error: error.message };
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  return { rows };
}

/** Sign-in accounts: method, confirmations and the terms each customer accepted (no passwords, ever). */
export async function authUsers() {
  const admin = createAdminClient();
  const out: Row[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) out.push({
      id: u.id, email: u.email, provider: u.app_metadata?.provider ?? null, providers: u.app_metadata?.providers ?? null,
      created_at: u.created_at, email_confirmed_at: u.email_confirmed_at ?? null, last_sign_in_at: u.last_sign_in_at ?? null,
      terms_accepted: u.user_metadata?.terms_accepted ?? null, terms_accepted_at: u.user_metadata?.terms_accepted_at ?? null,
    });
    if (data.users.length < 1000) break;
  }
  return out;
}

/** All tables + auth users, as backupWorkbook() expects them. */
export async function loadAll(onTable?: (t: string, n: number, error?: string) => void) {
  const all: Record<string, Row[]> = {};
  for (const t of TABLES) {
    const { rows, error } = await allRows(t);
    all[t] = rows;
    onTable?.(t, rows.length, error);
  }
  all.auth_users = await authUsers();
  onTable?.("auth_users", all.auth_users.length);
  return all;
}
