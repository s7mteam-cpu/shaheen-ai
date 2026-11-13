import { createAdminClient } from "@/lib/supabase/admin";
import { PRICE_FIELDS } from "@/lib/server/priceHistory";
import { serverT, getLang } from "@/lib/server/lang";

/** «سجل تغيير الأسعار»: the latest price changes (all of them are in «تنزيل البيانات»). */
export async function PriceHistory({ kind }: { kind?: "plan" | "tool" }) {
  const T = await serverT();
  const lang = await getLang();
  let q = createAdminClient().from("price_history").select("kind,item_id,item_name,field,old_value,new_value,changed_by,created_at").order("created_at", { ascending: false }).limit(40);
  if (kind) q = q.in("kind", [kind, "setting"]);
  const { data, error } = await q;
  if (error) return null; // v69 SQL not run yet
  const label = (k: string, f: string) => (PRICE_FIELDS as Record<string, Record<string, string>>)[k]?.[f] ?? f;
  return (
    <section className="card p-5">
      <h2 className="text-lg font-bold text-navy-900">🕘 {T("سجل تغيير الأسعار", "Price change history")}</h2>
      <p className="mt-1 text-[13px] text-subtle">{T("أي تغيير ينحفظ هنا بوقته. الطلبات والدفعات القديمة تظل بسعرها وقتها، والجديدة تمشي على السعر الجديد. السجل كامل داخل «تنزيل البيانات».", "Every change is kept here with its time. Past jobs and payments keep their old price; new ones use the new price. The full history is in «Download the data».")}</p>
      {!data?.length ? <p className="mt-3 text-sm text-subtle">{T("ما فيه تغييرات للحين.", "No changes yet.")}</p> : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead><tr className="border-b border-[#E3E8EF] text-subtle">{[T("الوقت", "Time"), T("العنصر", "Item"), T("اللي تغيّر", "Field"), T("من", "From"), T("إلى", "To"), T("بواسطة", "By")].map((h) => <th key={h} className="px-2 py-2 text-start font-semibold">{h}</th>)}</tr></thead>
            <tbody>{data.map((r, i) => (
              <tr key={i} className="border-b border-[#EDF1F6] last:border-0">
                <td className="px-2 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString(lang === "en" ? "en-GB" : "ar-KW", { timeZone: "Asia/Kuwait", dateStyle: "short", timeStyle: "short" })}</td>
                <td className="px-2 py-2 font-semibold">{r.item_name || r.item_id}</td>
                <td className="px-2 py-2">{label(r.kind, r.field)}</td>
                <td className="px-2 py-2 text-subtle">{r.old_value ?? "—"}</td>
                <td className="px-2 py-2 font-bold text-navy-900">{r.new_value}</td>
                <td className="px-2 py-2 text-subtle" dir="ltr">{r.changed_by ?? "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
