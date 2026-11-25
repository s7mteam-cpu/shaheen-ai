"use client";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { savePricingSummary } from "../extraActions";
import { unitsPerMinute } from "@/lib/toolCosts";

type Row = { id: string; name: string; unit: string; price: number; edit: number; on: boolean; cost: number };

function Save() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{pending ? "…" : "حفظ الكل"}</button>;
}
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { maximumFractionDigits: d });

export function SummaryTable({ rows, rish: rish0 }: { rows: Row[]; rish: number }) {
  const [r, act] = useActionState(savePricingSummary, undefined);
  const [rish, setRish] = useState(String(rish0));
  const [cost, setCost] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((x) => [x.id, String(x.cost)])));
  const [price, setPrice] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((x) => [x.id, String(x.price)])));
  const [edit, setEdit] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((x) => [x.id, String(x.edit)])));
  const rc = Number(rish) > 0 ? Number(rish) : 0.01;
  const num = (v: string | undefined) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const below = useMemo(() => rows.filter((x) => num(cost[x.id]) > 0 && num(price[x.id]) * rc < num(cost[x.id]) - 1e-9).length, [rows, cost, price, rc]);

  return (
    <form action={act} className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-end gap-4 p-5">
        <label className="flex flex-col gap-1.5"><span className="label">تكلفة الريشة الواحدة علينا (دولار)</span>
          <input name="rish" type="number" step="0.001" min={0.001} value={rish} onChange={(e) => setRish(e.target.value)} className="field w-40" /></label>
        <p className="max-w-md text-[13px] text-subtle">0.01 = سنت واحد. السعر المقترح لكل أداة = تكلفتنا ÷ هذا الرقم، مقرّب لفوق. {below > 0 ? <b className="text-red-700">{below} أداة سعرها أقل من تكلفتها.</b> : <b className="text-green-700">كل الأسعار تغطي التكلفة.</b>}</p>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[980px] text-[14px]">
          <thead className="bg-canvas text-[12px] text-subtle">
            <tr className="text-right">
              <th className="p-3">الأداة</th><th className="p-3">الوحدة</th>
              <th className="p-3">تكلفتنا للوحدة (دولار)</th><th className="p-3">تكلفتنا للدقيقة (دولار)</th>
              <th className="p-3">السعر بالريشة</th><th className="p-3">المقترح</th><th className="p-3">سعر الدقيقة بالريشة</th><th className="p-3">سعر التعديل</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const c = num(cost[x.id]), p = num(price[x.id]);
              const sug = c > 0 ? Math.max(1, Math.ceil(c / rc - 1e-9)) : 0;
              const per = unitsPerMinute(x.id, x.unit);
              const low = c > 0 && p * rc < c - 1e-9;
              return (
                <tr key={x.id} className={`border-t border-line ${x.on ? "" : "opacity-60"}`}>
                  <td className="p-3 font-semibold text-navy-900">{x.name}{!x.on && <span className="mr-1 text-[11px] text-subtle">(مخفية)</span>}</td>
                  <td className="p-3 text-subtle">{x.unit}</td>
                  <td className="p-3"><input name={`cost:${x.id}`} type="number" step="0.001" min={0} value={cost[x.id]} onChange={(e) => setCost({ ...cost, [x.id]: e.target.value })} className="field w-28 text-center" /></td>
                  <td className="p-3 text-center tabular-nums">{per ? fmt(c * per, 3) : "—"}</td>
                  <td className="p-3"><input name={`price:${x.id}`} type="number" min={0} value={price[x.id]} onChange={(e) => setPrice({ ...price, [x.id]: e.target.value })} className={`field w-24 text-center ${low ? "!border-red-400 bg-red-50" : ""}`} /></td>
                  <td className="p-3 text-center tabular-nums">{c > 0 ? <button type="button" onClick={() => setPrice({ ...price, [x.id]: String(sug) })} className="rounded-lg border border-line px-2 py-1 text-[13px] hover:bg-canvas" title="اضغط لتطبيقه بالخانة">{sug}</button> : "0"}</td>
                  <td className="p-3 text-center tabular-nums">{per ? fmt(p * per, 0) : "—"}</td>
                  <td className="p-3"><input name={`edit:${x.id}`} type="number" min={0} value={edit[x.id]} onChange={(e) => setEdit({ ...edit, [x.id]: e.target.value })} className="field w-24 text-center" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-subtle">الخانة الحمراء = السعر بالريشة أقل من تكلفتنا. «سعر التعديل» يُخصم بس على التعديلات اللي تستخدم الذكاء الاصطناعي (فتح الاستوديو والحفظ والتصدير مجانية). صورة الذكاء الاصطناعي داخل أي أداة سعرها واحد من «أسعار إضافية» بصفحة الأدوات.</p>
      <div className="flex flex-wrap items-center gap-3"><Save />{r?.error && <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span>}{r?.ok && <span className="text-sm font-semibold text-green-700">{r.ok}</span>}</div>
    </form>
  );
}
