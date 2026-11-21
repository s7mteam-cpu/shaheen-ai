"use client";
import { useActionState, useState, useTransition } from "react";
import { saveModels, testModel } from "./actions";

type Row = { id: string; family: string; use: string; test?: "text"; current: string };
type Group = { family: string; name: string; hasKey: boolean; env: string; rows: Row[] };

function Line({ r, canTest }: { r: Row; canTest: boolean }) {
  const [v, setV] = useState(r.current);
  const [note, setNote] = useState<{ ok: boolean; note: string } | null>(null);
  const [busy, start] = useTransition();
  const changed = v.trim() !== "" && v.trim() !== r.id;
  return (
    <div className="flex flex-col gap-2 border-b border-[#EDF1F6] py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <code dir="ltr" className="rounded bg-tint px-2 py-0.5 text-[13px] font-bold text-navy-900">{r.id}</code>
        {changed && <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-bold text-navy-900">مبدّل</span>}
      </div>
      <p className="text-[13px] leading-6 text-subtle">{r.use}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input name={`m:${r.id}`} value={v} onChange={(e) => { setV(e.target.value); setNote(null); }} dir="ltr" autoComplete="off" spellCheck={false} placeholder={`${r.id} (الأصلي)`} className="field min-w-[240px] flex-1 text-left" />
        {canTest && r.test && (
          <button type="button" disabled={busy || !changed} onClick={() => start(async () => setNote(await testModel(r.family, v.trim())))} className="btn btn-outline px-3 py-2 text-[13px] font-semibold disabled:opacity-50">{busy ? "يختبر…" : "اختبر الاسم"}</button>
        )}
        {changed && <button type="button" onClick={() => { setV(""); setNote(null); }} className="text-[13px] font-semibold text-navy-700 underline">رجّع الأصلي</button>}
      </div>
      {note && <p className={`text-[13px] font-semibold ${note.ok ? "text-emerald-700" : "text-red-700"}`}>{note.note}</p>}
    </div>
  );
}

export function ModelsForm({ groups }: { groups: Group[] }) {
  const [res, action, pending] = useActionState(saveModels, undefined);
  return (
    <form action={action} className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.family} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-bold text-navy-900">{g.name}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${g.hasKey ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{g.hasKey ? "المفتاح موجود" : `المفتاح ناقص في Vercel (${g.env})`}</span>
          </div>
          {g.rows.map((r) => <Line key={r.id} r={r} canTest={g.hasKey} />)}
        </section>
      ))}
      {res?.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{res.error}</p>}
      {res?.ok && <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{res.ok}</p>}
      <button disabled={pending} className="btn btn-primary w-fit px-6 py-2.5">{pending ? "يحفظ…" : "حفظ النماذج"}</button>
    </form>
  );
}
