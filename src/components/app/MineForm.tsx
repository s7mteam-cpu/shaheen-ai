"use client";
import { useState, useTransition } from "react";
import { L } from "@/lib/i18n/ui";
import { saveMine } from "@/app/app/brand/mine/actions";
import { MINE_LEN, MINE_NOTES, MINE_SKILLS, type Mine } from "@/lib/mine";
import { SKILL_SCOPES } from "@/lib/team";

type Item = { id: string; title: string; locked: boolean };

/** «تعليماتي»: three cards: his instructions, the platform's skills (he may switch some off for his account), and skills of his own */
export function MineForm({ initial, skills, hasKit }: { initial: Mine; skills: Item[]; hasKit: boolean }) {
  const [notes, setNotes] = useState<string[]>(initial.notes.length ? initial.notes : [""]);
  const [off, setOff] = useState<string[]>(initial.off);
  const [own, setOwn] = useState(initial.skills.map((s) => ({ title: s.title, text: s.text, scopes: s.scopes as string[], on: s.on })));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () => start(async () => {
    const r = await saveMine({ notes: notes.map((n) => n.trim()).filter(Boolean), off, skills: own.map((s, i) => ({ id: `m${i}`, title: s.title, text: s.text, scopes: s.scopes as never, on: s.on })) });
    setMsg(r.ok ? { ok: true, t: L("انحفظت ✓ تنطبق على أي شي جديد تسويه.") } : { ok: false, t: L(r.error ?? "ما انحفظت.") });
  });
  const toggle = (id: string) => setOff((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  return (
    <div className="flex flex-col gap-4">
      {!hasKit && <p className="card p-4 text-[14px] text-[#9A7A35]">{L("احفظ هويتك التجارية أول، وبعدها تقدر تحفظ تعليماتك.")}</p>}

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-[17px] font-bold text-navy-900">{L("تعليماتي بكلامي")}</h2>
        <p className="text-[13.5px] text-subtle">{L("مثال: «لا تستخدم إيموجي»، «اذكر اسم الفرع دايماً»، «اكتب بلهجة كويتية رسمية».")}</p>
        {notes.map((n, i) => (
          <div key={i} className="flex gap-2">
            <textarea value={n} onChange={(e) => setNotes((a) => a.map((x, j) => (j === i ? e.target.value.slice(0, MINE_LEN) : x)))} rows={2} dir="auto" className="field flex-1 text-[14px]" />
            <button type="button" onClick={() => setNotes((a) => (a.length > 1 ? a.filter((_, j) => j !== i) : [""]))} className="text-[13px] font-semibold text-red-700 underline" aria-label={L("احذف")}>{L("احذف")}</button>
          </div>
        ))}
        {notes.length < MINE_NOTES && <button type="button" onClick={() => setNotes((a) => [...a, ""])} className="btn btn-outline w-fit px-4 py-1.5 text-[13px]">＋ {L("أضف تعليمة")}</button>}
      </section>

      {skills.length > 0 && (
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="text-[17px] font-bold text-navy-900">{L("مهارات المنصة لحسابي")}</h2>
          <p className="text-[13.5px] text-subtle">{L("شاهين يستخدم هذي المهارات تلقائياً. أوقف اللي ما تناسب أسلوبك. الأساسية ما تنوقف لأنها تحافظ على وضوح التصاميم.")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {skills.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[14px]">
                <input type="checkbox" className="size-4" checked={s.locked || !off.includes(s.id)} disabled={s.locked} onChange={() => toggle(s.id)} />
                <span className="flex-1">{L(s.title)}</span>
                {s.locked && <span className="text-[11.5px] text-subtle">{L("أساسية")}</span>}
              </label>
            ))}
          </div>
        </section>
      )}

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-[17px] font-bold text-navy-900">{L("مهاراتي")}</h2>
        <p className="text-[13.5px] text-subtle">{L("أسلوب خاص فيك تضيفه بنفسك، وتحدد لأي نوع من الأدوات ينطبق.")}</p>
        {own.map((s, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <input value={s.title} onChange={(e) => setOwn((a) => a.map((x, j) => (j === i ? { ...x, title: e.target.value.slice(0, 60) } : x)))} className="field" placeholder={L("اسم المهارة")} />
            <textarea value={s.text} onChange={(e) => setOwn((a) => a.map((x, j) => (j === i ? { ...x, text: e.target.value.slice(0, MINE_LEN) } : x)))} rows={3} dir="auto" className="field text-[14px]" />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              {SKILL_SCOPES.map(([id, label]) => (
                <label key={id} className="flex items-center gap-1.5"><input type="checkbox" className="size-4" checked={s.scopes.includes(id)} onChange={() => setOwn((a) => a.map((x, j) => (j === i ? { ...x, scopes: x.scopes.includes(id) ? x.scopes.filter((k) => k !== id) : [...x.scopes, id] } : x)))} />{L(label)}</label>
              ))}
            </div>
            <div className="flex items-center gap-4 text-[13px]">
              <label className="flex items-center gap-1.5"><input type="checkbox" className="size-4" checked={s.on} onChange={() => setOwn((a) => a.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />{L("مفعّلة")}</label>
              <button type="button" onClick={() => setOwn((a) => a.filter((_, j) => j !== i))} className="font-semibold text-red-700 underline">{L("احذف")}</button>
            </div>
          </div>
        ))}
        {own.length < MINE_SKILLS && <button type="button" onClick={() => setOwn((a) => [...a, { title: "", text: "", scopes: SKILL_SCOPES.map(([id]) => id), on: true }])} className="btn btn-outline w-fit px-4 py-1.5 text-[13px]">＋ {L("أضف مهارة")}</button>}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !hasKit} className="btn btn-primary px-8 py-3 disabled:opacity-60">{pending ? "…" : L("حفظ")}</button>
        {msg && <span role={msg.ok ? "status" : "alert"} className={`text-sm font-semibold ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.t}</span>}
      </div>
    </div>
  );
}
