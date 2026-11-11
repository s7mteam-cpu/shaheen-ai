import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Each «نظرة عامة» card can be zeroed on its own: it then counts only what happened after its reset time. Data is not deleted. */
export const COUNTERS = {
  subs: "المشتركون النشطون",
  revenue: "الإيراد الشهري",
  accounts: "كل الحسابات",
  spent: "ريش مستهلكة هذا الشهر",
  jobs: "طلبات هذا الشهر",
  failed: "طلبات فاشلة هذا الشهر",
} as const;
export type Counter = keyof typeof COUNTERS;

export async function counterResets(): Promise<Partial<Record<Counter, string>>> {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "overview_reset").maybeSingle();
  return (data?.value as Partial<Record<Counter, string>>) ?? {};
}
