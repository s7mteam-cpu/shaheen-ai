"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useT } from "@/components/LangProvider";
import { submitTransfer } from "./actions";

type Method = { id: string; name: string; details: string };
type Price = { months: number; kwd: string; approx: string | null };

/** Big phone photos are shrunk in the browser (the server takes up to 4 MB). */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 1.5 * 1024 * 1024 || file.type === "image/heic") return file;
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch { return file; }
}

function Send() {
  const T = useT();
  const { pending } = useFormStatus();
  return <button disabled={pending} className="btn btn-gold w-full py-3 disabled:opacity-60">{pending ? T("جارٍ الإرسال…", "Sending…") : T("أرسل التحويل للمراجعة", "Send for review")}</button>;
}

export function TransferForm({ kind, plan, title, methods, prices }: { kind: string; plan: string; title: string; methods: Method[]; prices: Price[] }) {
  const T = useT();
  const [r, act] = useActionState(submitTransfer, undefined);
  const [method, setMethod] = useState(methods.length === 1 ? methods[0].id : "");
  const [months, setMonths] = useState(prices[0]?.months ?? 1);
  const [copied, setCopied] = useState("");
  const [fileName, setFileName] = useState("");
  const price = prices.find((p) => p.months === months) ?? prices[0];

  if (r?.ok) return (
    <div className="card flex flex-col items-center gap-3 p-6 text-center">
      <span className="text-4xl">✅</span>
      <p className="leading-7 text-navy-900">{r.ok}</p>
      <Link href="/app/account" className="btn btn-primary px-6 py-2.5">{T("رجوع لحسابي", "Back to my account")}</Link>
    </div>
  );

  return (
    <form action={async (fd) => { const f = fd.get("receipt"); if (f instanceof File && f.size) fd.set("receipt", await shrink(f)); return act(fd); }} className="card flex flex-col gap-5 p-6">
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="plan" value={plan} /><input type="hidden" name="months" value={months} />
      <div className="flex flex-col gap-1">
        <span className="text-lg font-bold text-navy-900">{title}</span>
        <span className="text-2xl font-bold text-navy-900">{price.kwd}</span>
        {price.approx && <span className="text-sm text-subtle">{T(`≈ ${price.approx} تقريباً بسعر صرف اليوم`, `≈ ${price.approx} at today's rate`)}</span>}
      </div>

      {prices.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-1">{T("المدة", "Period")}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {prices.map((p) => (
              <button type="button" key={p.months} onClick={() => setMonths(p.months)} aria-pressed={months === p.months}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold ${months === p.months ? "border-gold bg-gold/10 text-navy-900" : "border-line text-muted"}`}>
                {p.months === 1 ? T("شهر", "1 month") : T(`${p.months} أشهر`, `${p.months} months`)}
              </button>
            ))}
          </div>
          {months > 1 && <p className="text-[13px] leading-6 text-subtle">{T("الريش تتجدد لك كل شهر لحالها طول المدة اللي دفعتها.", "Your credits refill every month by themselves for the whole period.")}</p>}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-1">{T("1. حوّل على وحدة من هذي", "1. Transfer to one of these")}</legend>
        {methods.map((m) => (
          <label key={m.id} className={`flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-3 ${method === m.id ? "border-gold bg-gold/5" : "border-line"}`}>
            <span className="flex items-center gap-2 font-bold text-navy-900"><input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="h-4 w-4" />{m.name}</span>
            {method === m.id && (
              <div className="flex flex-col gap-2 rounded-lg bg-tint p-3">
                <p className="whitespace-pre-line text-[14px] leading-7 text-navy-900">{m.details}</p>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(m.details).then(() => setCopied(m.id)); }} className="btn btn-outline w-fit px-3 py-1.5 text-xs">{copied === m.id ? T("انسخ ✓", "Copied ✓") : T("نسخ البيانات", "Copy details")}</button>
              </div>
            )}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-2">
        <span className="label">{T("2. ارفع صورة الإيصال", "2. Upload the receipt")}</span>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-field p-4 text-sm font-semibold text-navy-900">
          📎 {fileName || T("اختر صورة الإيصال أو ملف PDF", "Choose a photo or PDF of the receipt")}
          <input type="file" name="receipt" required accept="image/jpeg,image/png,image/webp,image/heic,application/pdf" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="paid" className="label">{T("المبلغ اللي حوّلته (اختياري)", "Amount you sent (optional)")}</label>
        <input id="paid" name="paid" maxLength={120} placeholder={T("مثلاً: 1,500,000 ل.س", "e.g. 1,500,000 SYP")} className="field" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="label">{T("ملاحظة (اختياري)", "Note (optional)")}</label>
        <textarea id="note" name="note" rows={2} maxLength={500} className="field" />
      </div>

      <p className="rounded-xl bg-tint p-3 text-[13px] leading-6 text-navy-900">{T(
        `نراجع الإيصال ونفعّل ${kind === "managed" ? "الخدمة" : "اشتراكك"} عادةً خلال يوم عمل، ويوصلك إشعار. الدفع بالتحويل ما يتجدد تلقائياً: قبل نهاية المدة بـ3 أيام نذكّرك.`,
        `We check the receipt and activate ${kind === "managed" ? "the service" : "your plan"}, usually within one business day, and notify you. Transfers don't renew automatically: we remind you 3 days before the period ends.`)}</p>
      {r?.error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{r.error}</p>}
      <Send />
      <Link href="/app/account" className="text-center text-sm text-subtle">{T("رجوع", "Back")}</Link>
    </form>
  );
}
