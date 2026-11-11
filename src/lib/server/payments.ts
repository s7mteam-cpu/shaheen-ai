import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Payment = {
  ref: string;                // unique id from the gateway (e.g. "stripe:in_123", "tap:chg_123") — a payment is recorded once
  source: string;             // "stripe" | "tap" | …
  description: string;        // what was paid for: "اشتراك باقة الشاهين", "باقة الإدارة الكاملة"…
  customerId?: string | null;
  amount: number;
  currency: "KWD" | "USD";
  method?: string | null;
  receivedOn?: string;        // YYYY-MM-DD
};

/** Every payment made through the website goes through here: it becomes an income line in «المالية»,
 *  and the database then notifies the admins (and the customer) automatically. */
export async function recordPayment(p: Payment) {
  const admin = createAdminClient();
  let customerName: string | null = null;
  if (p.customerId) {
    const { data } = await admin.from("profiles").select("full_name,email").eq("id", p.customerId).maybeSingle();
    customerName = data?.full_name || data?.email || null;
  }
  await admin.from("income").upsert({
    external_ref: p.ref, source: p.source, description: p.description, customer_id: p.customerId ?? null, customer_name: customerName,
    amount: p.amount, currency: p.currency, method: p.method ?? null, received_on: p.receivedOn ?? new Date().toISOString().slice(0, 10),
  }, { onConflict: "external_ref", ignoreDuplicates: true }).then(() => null, () => null);
}
