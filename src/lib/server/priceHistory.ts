import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * «سجل تغيير الأسعار»: writes one row per changed field (price, credits, tool cost, dollar rate…), with who
 * changed it. Past jobs and payments keep the price they had (each row stores its own amount/credits).
 */
export const PRICE_FIELDS = {
  plan: { name: "الاسم", price_kwd: "السعر (د.ك)", credits: "الريش", bonus_credits: "ريش الهدية", is_active: "ظاهرة للعملاء" },
  tool: { name: "الاسم", credit_cost: "الكلفة (ريشة)", edit_cost: "كلفة التعديل (ريشة)", cost_unit: "الوحدة", is_enabled: "مفعّلة" },
  setting: { usd_kwd: "سعر الدولار بالدينار" },
} as const;
type Kind = keyof typeof PRICE_FIELDS;

/** "40.000" from the database and 40 from the form are the same price. */
const norm = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  const s = String(v).trim();
  return /^-?\d+(\.\d+)?$/.test(s) ? String(Number(s)) : s;
};

export async function recordPriceChanges(kind: Kind, id: string, name: string | null, before: Record<string, unknown> | null, after: Record<string, unknown>, by: string | null | undefined) {
  const rows = Object.keys(PRICE_FIELDS[kind])
    .filter((f) => f in after)
    .map((f) => ({ f, o: before ? norm(before[f]) : null, n: norm(after[f]) }))
    .filter(({ o, n }) => o !== n && !(o === null && n === null))
    .map(({ f, o, n }) => ({ kind, item_id: id, item_name: name, field: f, old_value: o, new_value: n, changed_by: by ?? null }));
  if (rows.length) await createAdminClient().from("price_history").insert(rows).then(() => null, () => null);
}
