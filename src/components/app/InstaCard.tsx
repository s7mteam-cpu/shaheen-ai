"use client";
import { useState } from "react";
import { L } from "@/lib/i18n/ui";
import { PhotoPicker, type Photo } from "@/components/app/PhotoPicker";
import type { InstaRead } from "@/lib/plan";

/** «حلّل حسابي»: the customer pastes his bio / captions and/or uploads screenshots of his account or insights; Shaheen reads them and the plan uses it. Nothing is fetched from Instagram. */
export function InstaCard({ initial, handle, autoOn = false }: { initial: InstaRead | null; handle: string; autoOn?: boolean }) {
  const [text, setText] = useState("");
  const [shots, setShots] = useState<Photo[]>([]);
  const [res, setRes] = useState<InstaRead | null>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function run() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/brand/insta", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, photos: shots.map((x) => ({ path: x.path, bucket: x.bucket, label: x.label })) }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.insta) throw new Error(d.error || "تعذّر التحليل.");
      setRes(d.insta);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  /** Shaheen's own browser visits the profile like a visitor, then analyses what it saw */
  async function visit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/brand/insta", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "visit" }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.jobId) throw new Error(d.error || "تعذّر بدء الزيارة.");
      for (let k = 0; k < 60; k++) {
        await new Promise((res) => setTimeout(res, 3000));
        const g = await fetch(`/api/brand/insta?job=${d.jobId}`).then((x) => x.json()).catch(() => null);
        if (g?.status === "done" && g.insta) { setRes(g.insta); return; }
        if (g?.status === "failed" || g?.error) throw new Error(g.error || "تعذّرت الزيارة.");
      }
      throw new Error("الزيارة تأخرت. الصق نص حسابك أو ارفع لقطات.");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const row = (t: string, v: string[] | string) => (Array.isArray(v) ? v.length > 0 : !!v) && <div className="rounded-2xl bg-tint p-3"><b>{L(t)}</b>{Array.isArray(v) ? <ul className="list-disc ps-5">{v.map((x) => <li key={x}>{x}</li>)}</ul> : <p>{v}</p>}</div>;
  return (
    <details className="card group p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xl font-bold text-navy-900">📊 {L("حلّل حسابي على إنستغرام")}<span className="text-base transition group-open:rotate-180">▾</span></summary>
      <div className="mt-4 flex flex-col gap-4">
        <p className="text-[14px] leading-7 text-muted">{autoOn && handle ? L("شاهين يزور حسابك مثل أي زائر (يشوف الألوان والشكل والمنشورات) ويحلله، ويدخل التحليل بخطة المحتوى الجديدة. وإذا حسابك خاص، الصق النص أو ارفع لقطات بدل ذلك.") : L("الصق البايو وآخر منشوراتك (النص)، أو ارفع لقطات من حسابك أو من «الإحصائيات»، وشاهين يقرأها ويحلل نبرتك وأفضل ما ينفع لك، ويدخلها بخطة المحتوى الجديدة.")} {handle && <span className="font-semibold" dir="ltr">{handle}</span>}</p>
        {autoOn && handle && <button type="button" onClick={visit} disabled={busy} className="btn btn-primary w-fit px-6 py-3 font-bold disabled:opacity-50">{busy ? L("شاهين يزور حسابك...") : `📷 ${L("زر حسابي وحلله")}`}</button>}
        {autoOn && handle && <span className="text-[13px] text-subtle">{L("أو الصق النص أو ارفع لقطات (تحت):")}</span>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} rows={5} className="field" placeholder={L("الصق هنا البايو وتعليقات آخر 5 منشورات…")} />
        <PhotoPicker photos={shots} onChange={setShots} max={6} title="لقطات من حسابك أو إحصائياتك" hint="مثال: صفحة حسابك، أو لقطات من «الإحصائيات» (الوصول، أفضل المنشورات)." />
        <button type="button" onClick={run} disabled={busy} className="btn btn-gold w-fit px-6 py-3 font-bold disabled:opacity-50">{busy ? L("شاهين يقرأ...") : `🔎 ${L("حلّل")}`}</button>
        {err && <p role="alert" className="text-sm font-semibold text-red-700">{L(err)}</p>}
        {res && <div className="grid gap-3 text-[14.5px] leading-7 sm:grid-cols-2">
          {row("نبرة حسابك", res.voice)}{row("مواضيعك", res.topics)}{row("أنواع محتواك", res.formats)}{row("نقاط قوتك", res.strong)}{row("فجوات", res.gaps)}{row("اتجاهات تناسبك", res.ideas)}{row("الأفضل أداءً", res.best)}
          <p className="text-[13px] text-subtle sm:col-span-2">{L("انحفظ التحليل، وراح يدخل بأي خطة جديدة تسويها.")}</p>
        </div>}
      </div>
    </details>
  );
}
