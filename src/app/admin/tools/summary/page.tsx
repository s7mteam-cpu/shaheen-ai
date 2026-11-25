import { guardPage } from "@/lib/server/auth";
import { getTools } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOOL_COST_USD } from "@/lib/toolCosts";
import { SummaryTable } from "./SummaryTable";
import { extraPricing } from "@/lib/server/pricing";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PricingSummary() {
  await guardPage("tools");
  const tools = await getTools(true);
  const aiX = (await extraPricing()).ai_clip_x; // «مشاهد واقعية» is always AI clips: its price is multiplied by this
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "tool_costs").maybeSingle();
  const saved = (data?.value ?? {}) as { rish?: number; costs?: Record<string, number> };
  const rows = tools.map((t) => ({
    id: t.id, name: t.name, unit: t.cost_unit, price: t.credit_cost, edit: t.edit_cost ?? 0, on: t.is_enabled !== false,
    cost: saved.costs?.[t.id] ?? TOOL_COST_USD[t.id] ?? 0,
    mult: t.id === "real-scenes" ? aiX : 1,
  }));
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">ملخص كل أداة (للتسعير)</h1>
        <p className="mt-1 text-sm text-subtle">تكلفتنا الحقيقية بالدولار لكل وحدة ولكل دقيقة، وسعرها بالريشة، وسعر التعديل. كل الخانات تتعدّل باليد، والجدول يحسب لك المقترح.</p>
        <Link href="/admin/tools" className="mt-2 inline-block text-[13px] text-navy-700 underline">← الأدوات والأسعار (الأسماء والوصف والمزوّد)</Link>
      </div>
      <SummaryTable rows={rows} rish={saved.rish && saved.rish > 0 ? saved.rish : 0.01} />
    </div>
  );
}
