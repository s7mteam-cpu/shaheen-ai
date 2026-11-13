"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteUnsubscribed } from "./actions";

export type Row = { id: string; name: string; email: string; phone: string; flag: string; joined: string; last: string; works: number; credits: number; trial: string };

function Del({ n }: { n: number }) {
  const { pending } = useFormStatus();
  return <button disabled={pending || !n} className="btn bg-red-700 px-5 py-2.5 font-bold text-white hover:bg-red-800 disabled:opacity-50">{pending ? "جارٍ الحذف…" : `🗑 حذف المحددين (${n})`}</button>;
}

/** A list with check-boxes and one «حذف المحددين» button (max 100 per press). */
export function List({ rows, showTrial }: { rows: Row[]; showTrial: boolean }) {
  const [r, act] = useActionState(deleteUnsubscribed, undefined);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const all = rows.slice(0, 100).map((x) => x.id);
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  if (!rows.length) return <p className="card p-5 text-sm text-subtle">ما فيه أحد بهالقسم. ✓</p>;
  return (
    <form action={act} className="flex flex-col gap-3">
      {[...picked].map((id) => <input key={id} type="hidden" name="id" value={id} />)}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="bg-tint text-navy-900">
            <th className="p-3"><input type="checkbox" aria-label="تحديد الكل" checked={picked.size > 0 && picked.size === all.length} onChange={(e) => setPicked(new Set(e.target.checked ? all : []))} className="h-4 w-4" /></th>
            {["الاسم", "البريد", "الهاتف", "سجّل", "آخر دخول", "أعماله", "رصيده", ...(showTrial ? ["التجربة"] : [])].map((h) => <th key={h} className="p-3 text-center font-bold">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id} className={`border-t border-line text-center ${picked.has(x.id) ? "bg-red-50" : ""}`}>
                <td className="p-3"><input type="checkbox" aria-label={`تحديد ${x.name}`} checked={picked.has(x.id)} onChange={() => toggle(x.id)} className="h-4 w-4" /></td>
                <td className="p-3">{x.flag} {x.name}</td>
                <td className="p-3" dir="ltr">{x.email}</td>
                <td className="p-3" dir="ltr">{x.phone}</td>
                <td className="p-3">{x.joined}</td>
                <td className="p-3">{x.last}</td>
                <td className="p-3">{x.works}</td>
                <td className="p-3">{x.credits}</td>
                {showTrial && <td className="p-3">{x.trial}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 100 && <p className="text-[13px] text-subtle">«تحديد الكل» يحدد أول 100. بعد الحذف تطلع الدفعة اللي بعدها.</p>}
      <label className="flex items-center gap-2 text-sm font-semibold text-red-900"><input type="checkbox" name="sure" className="h-4 w-4" />أفهم إن الحذف نهائي: حساباتهم وأعمالهم وملفاتهم تنمسح.</label>
      <div className="flex flex-wrap items-center gap-3"><Del n={picked.size} />{r?.error && <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span>}{r?.ok && <span className="text-sm font-semibold text-green-700">{r.ok}</span>}</div>
    </form>
  );
}
