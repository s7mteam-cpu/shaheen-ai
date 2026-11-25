"use client";
import { useState, useTransition } from "react";
import { setPaymentsGate } from "@/app/admin/actions";

/** «إغلاق الاشتراك مؤقتاً»: while on, a customer who presses subscribe sees an apology + WhatsApp instead of the payment. Turn it off when real payment is linked. */
export function PaymentsGateSwitch({ initialOn, initialMessage }: { initialOn: boolean; initialMessage: string }) {
  const [on, setOn] = useState(initialOn);
  const [message, setMessage] = useState(initialMessage);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const save = (nextOn: boolean) => start(async () => {
    const r = await setPaymentsGate(nextOn, message).catch(() => ({ ok: false, error: "", message }));
    if (r.ok) { setOn(nextOn); setMessage(r.message); setNote("انحفظ."); } else setNote("ما انحفظ، جرّب مرة ثانية.");
  });
  return (
    <div className={`card flex flex-col gap-3 p-5 ${on ? "border-amber-400" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[16px] font-bold text-navy-900">{"إغلاق الاشتراك مؤقتاً"} {on ? "🟠" : ""}</span>
          <span className="text-[13px] text-subtle">{on ? "مفعّل: أي عميل يضغط «اشترك» يشوف رسالة الاعتذار تحت. فريق الإدارة يقدر يجرّب الدفع عادي." : "مطفي: الاشتراك والدفع شغّالين عادي. فعّله لو بغيت توقف الاشتراك مؤقتاً."}</span>
        </div>
        <button type="button" onClick={() => save(!on)} disabled={pending} className={on ? "btn btn-gold px-5 py-2.5 text-sm" : "btn btn-outline px-5 py-2.5 text-sm"}>{on ? "افتح الاشتراك (الدفع شغّال)" : "أغلق الاشتراك مؤقتاً"}</button>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-navy-900">{"رسالة الاعتذار اللي يشوفها العميل"}</span>
        <textarea value={message} onChange={(e) => { setMessage(e.target.value); setNote(""); }} rows={3} maxLength={400} className="field w-full text-[14px]" />
      </label>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => save(on)} disabled={pending} className="btn btn-outline px-4 py-2 text-sm">{"احفظ الرسالة"}</button>
        {note && <span className="text-[13px] text-subtle">{note}</span>}
      </div>
    </div>
  );
}
