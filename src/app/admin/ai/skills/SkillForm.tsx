"use client";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveSkill } from "./actions";
import { SKILL_MAX } from "@/lib/aiSkills";

function Save() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{pending ? "…" : "حفظ"}</button>;
}
const OK_FILE = /\.(txt|md|html?|css|svg|json)$/i;

/** the guidance of one tool: type it, paste it, or add text files (their content is added to the box as text) */
export function SkillForm({ tool, name, text, on, at }: { tool: string; name: string; text: string; on: boolean; at: string }) {
  const [r, act] = useActionState(saveSkill, undefined);
  const [val, setVal] = useState(text);
  const [note, setNote] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    let add = "", skipped = 0;
    for (const f of Array.from(list).slice(0, 5)) {
      if (!OK_FILE.test(f.name) || f.size > 200_000) { skipped++; continue; }
      add += `\n\n--- ${f.name} ---\n${await f.text()}`;
    }
    const next = (val + add).trim();
    setVal(next.slice(0, SKILL_MAX));
    setNote(`${skipped ? `${skipped} ملف ما انضاف (النوع مو نص، أو أكبر من 200 ك.ب). ` : ""}${next.length > SKILL_MAX ? "النص انقص عند الحد الأقصى." : add ? "انضاف محتوى الملفات للخانة. راجعه ثم اضغط حفظ." : ""}`);
    if (file.current) file.current.value = "";
  };
  return (
    <form action={act} className="card flex flex-col gap-3 p-5">
      <input type="hidden" name="tool" value={tool} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold text-navy-900">{name}</h2>
        <span className="text-[12.5px] text-subtle">{text ? `آخر تعديل: ${at ? new Date(at).toLocaleString("ar", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kuwait" }) : "—"}` : "بدون مهارات (التعليمات الأصلية بس)"}</span>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="label">المهارات (عربي أو إنجليزي، نص أو كود)</span>
        <textarea name="text" value={val} onChange={(e) => setVal(e.target.value.slice(0, SKILL_MAX))} rows={val ? 10 : 4} dir="auto" className="field font-mono text-[13px] leading-6" placeholder={"مثال:\n- العنوان دائماً أكبر عنصر بالتصميم.\n- لا تستخدم أكثر من لونين مع لون محايد.\n- خل ثلث المساحة فاضي."} />
      </label>
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        <span className={val.length > SKILL_MAX * 0.9 ? "font-semibold text-red-700" : "text-subtle"}>{val.length.toLocaleString("en")} / {SKILL_MAX.toLocaleString("en")} حرف</span>
        <button type="button" onClick={() => file.current?.click()} className="btn btn-outline px-4 py-1.5 text-[13px]">📎 أضف ملفات نصية</button>
        <input ref={file} type="file" multiple accept=".txt,.md,.html,.htm,.css,.svg,.json,text/plain" className="hidden" onChange={(e) => addFiles(e.target.files)} />
        <label className="flex items-center gap-2"><input type="checkbox" name="on" defaultChecked={on} className="size-4" />مفعّلة</label>
        {val && <button type="button" onClick={() => { setVal(""); setNote("الخانة فاضية. اضغط حفظ عشان ترجع الأداة لتعليماتها الأصلية."); }} className="font-semibold text-red-700 underline">امسح الكل</button>}
      </div>
      {note && <p className="text-[13px] text-[#9A7A35]">{note}</p>}
      <div className="flex flex-wrap items-center gap-3"><Save />{r?.error && <span role="alert" className="text-sm font-semibold text-red-700">{r.error}</span>}{r?.ok && <span className="text-sm font-semibold text-green-700">{r.ok}</span>}</div>
    </form>
  );
}
