"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { ILLUS_STYLES } from "@/remotion/styles";
import { TEMPLATE_IDEAS } from "@/lib/templates";
import { updateTemplate } from "../actions";

type T = { id: string; style: string; title: string; seconds: number; thumb_url: string | null; sort_order: number; is_published: boolean; source: string };
type Res = { ok?: string; error?: string } | undefined;

/** Generate templates in batches (one request per template, so a slow one never times the page out) + save a studio video as a template. */
export function Generator({ have }: { have: Record<string, number[]> }) {
  const router = useRouter();
  const [style, setStyle] = useState<string>(ILLUS_STYLES[0][0]);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [jobId, setJobId] = useState("");
  const [title, setTitle] = useState("");

  async function post(body: object) {
    const r = await fetch("/api/admin/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "صار خطأ.");
  }
  async function generate() {
    setMsg("");
    const styles = all ? ILLUS_STYLES.map((s) => s[0]) : [style];
    let done = 0, failed = 0;
    for (const s of styles) {
      for (let i = 0; i < TEMPLATE_IDEAS.length; i++) {
        if ((have[s] ?? []).includes(i)) continue; // already built
        setBusy(`جاري توليد قالب «${TEMPLATE_IDEAS[i].title}» (${ILLUS_STYLES.find((x) => x[0] === s)![1]})… تم ${done}`);
        try { await post({ style: s, idea: i }); done++; } catch (e) { failed++; setMsg((e as Error).message); if (failed >= 3) { setBusy(""); router.refresh(); return; } }
      }
    }
    setBusy(""); setMsg(`خلص: انضاف ${done} قالب${failed ? ` وفشل ${failed}` : ""}.`); router.refresh();
  }
  async function saveJob() {
    setMsg(""); setBusy("جاري الحفظ…");
    try { await post({ jobId: jobId.trim(), style, title }); setMsg("انحفظ كقالب ✓"); setJobId(""); setTitle(""); router.refresh(); } catch (e) { setMsg((e as Error).message); }
    setBusy("");
  }
  return (
    <div className="card flex flex-col gap-4 p-5">
      <h2 className="text-lg font-bold text-navy-900">توليد قوالب</h2>
      <div className="flex flex-wrap items-center gap-3">
        <select value={style} onChange={(e) => setStyle(e.target.value)} className="field w-auto" disabled={all || !!busy}>{ILLUS_STYLES.map(([k, ar]) => <option key={k} value={k}>{ar}</option>)}</select>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="h-4 w-4" />كل الستايلات</label>
        <button onClick={generate} disabled={!!busy} className="btn btn-primary px-5 py-2.5 disabled:opacity-50">ولّد القوالب الناقصة</button>
      </div>
      <p className="text-[13px] leading-6 text-subtle">كل ستايل يطلع له {TEMPLATE_IDEAS.length} قوالب (فكرة لكل قالب). التوليد يصرف من رصيد الذكاء الاصطناعي عندك (تخطيط + صورة غلاف لكل قالب)، وكل قالب ياخذ نص دقيقة تقريباً. اترك الصفحة مفتوحة لين يخلص. القوالب اللي انولدت قبل ما تنعاد.</p>
      <hr className="border-line" />
      <h3 className="font-bold text-navy-900">احفظ فيديو سويته كقالب</h3>
      <p className="text-[13px] leading-6 text-subtle">سوّ فيديو موشن بالأداة، وخذ رقمه من الرابط (الكلمة بعد <span dir="ltr">job=</span>)، والصقه هنا واختر الستايل فوق.</p>
      <div className="flex flex-wrap gap-3">
        <input value={jobId} onChange={(e) => setJobId(e.target.value)} placeholder="رقم الفيديو" dir="ltr" className="field w-72" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="اسم القالب" className="field w-56" />
        <button onClick={saveJob} disabled={!!busy || jobId.trim().length < 30} className="btn btn-outline px-5 py-2.5 disabled:opacity-50">احفظ كقالب</button>
      </div>
      {busy && <p className="text-sm font-semibold text-navy-700">{busy}</p>}
      {msg && <p className="text-sm font-semibold text-navy-900">{msg}</p>}
    </div>
  );
}

export function TemplateCard({ t }: { t: T }) {
  const [r, act] = useActionState(updateTemplate, undefined as Res);
  return (
    <form action={act} className="card flex flex-col overflow-hidden">
      <input type="hidden" name="id" value={t.id} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {t.thumb_url ? <img src={t.thumb_url} alt="" className="aspect-[9/16] w-full object-cover" /> : <div className="grid aspect-[9/16] place-items-center bg-tint text-sm text-subtle">بدون غلاف</div>}
      <div className="flex flex-col gap-2 p-3 text-[13px]">
        <input name="title" defaultValue={t.title} className="field py-1.5 text-sm" aria-label="الاسم" />
        <span className="text-subtle">{t.seconds} ثانية · {t.source === "saved" ? "من عندي" : "شاهين"}</span>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_published" defaultChecked={t.is_published} />منشور</label>
        <label className="flex items-center gap-2">الترتيب <input name="sort_order" type="number" defaultValue={t.sort_order} className="field w-16 py-1" /></label>
        <div className="flex gap-2"><button className="btn btn-primary flex-1 py-2 text-sm">حفظ</button><button name="delete" value="1" onClick={(e) => { if (!confirm("تحذف هالقالب؟")) e.preventDefault(); }} className="btn btn-outline py-2 text-sm text-red-700">حذف</button></div>
        {r?.error ? <span className="font-semibold text-red-700">{r.error}</span> : r?.ok ? <span className="font-semibold text-green-700">{r.ok}</span> : null}
      </div>
    </form>
  );
}
