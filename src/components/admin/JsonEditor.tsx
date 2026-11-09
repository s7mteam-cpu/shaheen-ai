"use client";
import { useState } from "react";
import { saveContent, uploadSiteImage } from "@/app/admin/actions";

type J = string | number | boolean | null | J[] | { [k: string]: J };

const labels: Record<string, string> = {
  badge: "الشارة الصغيرة", title: "العنوان", highlight: "الكلمة المميزة", subtitle: "الوصف", cta_primary: "نص الزر الرئيسي",
  cta_secondary: "نص الزر الثانوي", points: "النقاط", image: "صورة (اختياري)", items: "العناصر", body: "النص", q: "السؤال", a: "الجواب",
  eyebrow: "عنوان صغير", cta: "نص الزر", tagline: "الوصف", company: "اسم الشركة والسجل", whatsapp: "رقم واتساب", email: "البريد",
  instagram: "إنستغرام", terms: "شروط الاستخدام", privacy: "سياسة الخصوصية", refund: "سياسة الاسترجاع", id: "المعرّف (ID)", name: "الاسم", note: "ملاحظة",
  enabled: "ظاهرة في الموقع", price_kwd: "السعر (د.ك)", period: "المدة", features: "المميزات", whatsapp_message: "رسالة الواتساب الجاهزة", thanks: "رسالة الشكر بعد الإرسال",
};
const isImage = (k: string) => k === "image" || k.endsWith("_url");
const isLong = (k: string, v: string) => ["subtitle", "body", "a", "terms", "privacy", "refund", "tagline"].includes(k) || v.length > 90;

function blank(sample: J): J {
  if (typeof sample === "string") return "";
  if (Array.isArray(sample)) return [];
  if (sample && typeof sample === "object") return Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, blank(v)]));
  return sample;
}

function Node({ k, v, onChange }: { k: string; v: J; onChange: (v: J) => void }) {
  const label = labels[k] ?? k;
  if (typeof v === "string") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="label">{label}</label>
        {isLong(k, v) ? <textarea value={v} onChange={(e) => onChange(e.target.value)} rows={k in { terms: 1, privacy: 1, refund: 1 } ? 12 : 3} className="field leading-7" />
          : <input value={v} onChange={(e) => onChange(e.target.value)} className="field" dir={["whatsapp", "email", "instagram", "id"].includes(k) ? "ltr" : undefined} />}
        {isImage(k) && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {v && <img src={v} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            <label className="btn btn-outline cursor-pointer px-3 py-2 text-sm">رفع صورة
              <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const fd = new FormData(); fd.append("file", f);
                const r = await uploadSiteImage(fd); onChange(r.url);
              }} />
            </label>
            {v && <button type="button" onClick={() => onChange("")} className="text-sm text-red-700">إزالة</button>}
          </div>
        )}
      </div>
    );
  }
  if (typeof v === "boolean") {
    return <label className="flex items-center gap-2"><input type="checkbox" checked={v} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-navy-700" />{label}</label>;
  }
  if (Array.isArray(v)) {
    const sample = v[0] ?? "";
    return (
      <fieldset className="flex flex-col gap-3 rounded-2xl border border-line p-4">
        <legend className="px-1 text-sm font-bold text-navy-700">{label}</legend>
        {v.map((item, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl bg-canvas p-3">
            <Node k={typeof item === "string" ? `${label} ${i + 1}` : ""} v={item} onChange={(nv) => onChange(v.map((x, j) => (j === i ? nv : x)))} />
            <div className="flex gap-3 text-sm">
              {i > 0 && <button type="button" onClick={() => { const c = [...v]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; onChange(c); }} className="text-navy-700">↑ تحريك لأعلى</button>}
              <button type="button" onClick={() => onChange(v.filter((_, j) => j !== i))} className="text-red-700">حذف</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...v, blank(sample)])} className="btn btn-outline self-start px-3 py-2 text-sm">+ إضافة</button>
      </fieldset>
    );
  }
  if (v && typeof v === "object") {
    return (
      <div className="flex flex-col gap-4">
        {Object.entries(v).map(([ck, cv]) => <Node key={ck} k={ck} v={cv} onChange={(nv) => onChange({ ...v, [ck]: nv })} />)}
      </div>
    );
  }
  return null;
}

export function JsonEditor({ contentKey, title, initial }: { contentKey: string; title: string; initial: J }) {
  const [value, setValue] = useState<J>(initial);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <section className="card flex flex-col gap-5 p-6">
      <h2 className="text-lg font-bold text-navy-900">{title}</h2>
      <Node k="" v={value} onChange={setValue} />
      <div className="flex items-center gap-3">
        <button type="button" disabled={saving} onClick={async () => { setSaving(true); const r = await saveContent(contentKey, value); setSaving(false); setMsg(r.ok ? "تم الحفظ ✓ — التعديل ظاهر على الموقع." : `خطأ: ${r.error}`); }} className="btn btn-primary px-6 py-2.5">{saving ? "جارٍ الحفظ…" : "حفظ"}</button>
        {msg && <span role="status" className="text-sm text-navy-700">{msg}</span>}
      </div>
    </section>
  );
}
