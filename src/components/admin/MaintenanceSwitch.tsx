"use client";
import { useState, useTransition } from "react";
import { setMaintenance, setMaintenanceAllow } from "@/app/admin/actions";

/** «وضع الصيانة»: while on, visitors and customers see only «قريباً»; the admin team keeps full access. */
export function MaintenanceSwitch({ initial, allow = [] }: { initial: boolean; allow?: string[] }) {
  const [on, setOn] = useState(initial);
  const [msg, setMsg] = useState("");
  const [emails, setEmails] = useState(allow.join("\n"));
  const [saved, setSaved] = useState("");
  const [pending, start] = useTransition();
  const flip = () => {
    const next = !on;
    if (next && !confirm("كل الزوار والعملاء بيشوفون صفحة «قريباً» بس. فريق الإدارة يدخل عادي. تكمل؟")) return;
    start(async () => {
      const r = await setMaintenance(next).catch(() => ({ ok: false, error: "" }));
      if (r.ok) { setOn(next); setMsg(""); } else setMsg("ما انحفظ، جرّب مرة ثانية.");
    });
  };
  const saveAllow = () => start(async () => {
    const r = await setMaintenanceAllow(emails).catch(() => ({ ok: false, error: "", allow: [] as string[] }));
    if (r.ok) { setEmails(r.allow.join("\n")); setSaved(`انحفظ: ${r.allow.length}`); } else setSaved("ما انحفظ، جرّب مرة ثانية.");
  });
  return (
    <div className={`card flex flex-wrap items-center justify-between gap-3 p-5 ${on ? "border-red-500" : ""}`}>
      <div className="flex flex-col gap-1">
        <span className="text-[16px] font-bold text-navy-900">{"وضع الصيانة"} {on ? "🔴" : ""}</span>
        <span className="text-[13px] text-subtle">{on ? "الموقع مقفول: الكل يشوف «قريباً» ما عدا فريق الإدارة." : "الموقع مفتوح للكل. شغّله عشان تقفل الموقع مؤقتاً."}</span>
        {msg && <span className="text-[13px] text-red-600">{msg}</span>}
      </div>
      <button type="button" onClick={flip} disabled={pending} className={on ? "btn btn-outline px-5 py-2.5 text-sm" : "btn btn-gold px-5 py-2.5 text-sm"}>
        {on ? "افتح الموقع" : "اقفل الموقع (قريباً)"}
      </button>
      <div className="flex w-full flex-col gap-2 border-t border-line pt-3">
        <span className="text-[14px] font-bold text-navy-900">{"المسموح لهم يدخلون وقت الإغلاق (إيميل بكل سطر)"}</span>
        <textarea value={emails} onChange={(e) => { setEmails(e.target.value); setSaved(""); }} rows={4} dir="ltr" placeholder="name@example.com" className="field w-full text-[14px]" />
        <div className="flex items-center gap-3">
          <button type="button" onClick={saveAllow} disabled={pending} className="btn btn-outline px-4 py-2 text-sm">{"احفظ القائمة"}</button>
          {saved && <span className="text-[13px] text-subtle">{saved}</span>}
        </div>
      </div>
    </div>
  );
}
