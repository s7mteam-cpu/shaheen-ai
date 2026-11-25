"use client";
import { useState, useTransition } from "react";
import { setTemplatesHidden } from "./actions";

/** «مكتبة القوالب»: one switch that hides the whole template library (outer home page, public page, app menu). */
export function TemplatesSwitch({ initialHidden }: { initialHidden: boolean }) {
  const [hidden, setHidden] = useState(initialHidden);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const flip = () => start(async () => {
    const next = !hidden;
    const r = await setTemplatesHidden(next).catch(() => ({ ok: false, error: "" }));
    if (r.ok) { setHidden(next); setMsg(""); } else setMsg("ما انحفظ، جرّب مرة ثانية.");
  });
  return (
    <div className={`card flex flex-wrap items-center justify-between gap-3 p-4 ${hidden ? "border-red-300" : ""}`}>
      <div className="flex flex-col gap-1">
        <b className="text-navy-900">{"مكتبة القوالب"} {hidden ? "🙈 (مخفية)" : "👁 (ظاهرة)"}</b>
        <span className="text-[13px] text-subtle">{hidden ? "مخفية من الصفحة الرئيسية ومن قائمة العميل. القوالب نفسها محفوظة." : "ظاهرة للزوار والعملاء. اضغط لإخفائها من كل مكان."}</span>
        {msg && <span className="text-[13px] text-red-600">{msg}</span>}
      </div>
      <button type="button" onClick={flip} disabled={pending} className={hidden ? "btn btn-gold px-5 py-2.5 text-sm" : "btn btn-outline px-5 py-2.5 text-sm"}>{hidden ? "أظهر المكتبة" : "أخفِ المكتبة"}</button>
    </div>
  );
}
