"use client";
import { useRef, useState } from "react";

const SAMPLE = "لقطة سينمائية لمدربة خليجية بعباية سوداء أنيقة تشرح بثقة أمام قاعة تدريب فاخرة ونظيفة، حضور بلباس رسمي محتشم يسجلون ملاحظات، إضاءة طبيعية دافئة، حركة كاميرا هادئة.";

export function VeoTest() {
  const [prompt, setPrompt] = useState(SAMPLE);
  const [aspect, setAspect] = useState("9:16");
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const [took, setTook] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function go() {
    setBusy(true); setErr(""); setUrl(""); setSecs(0); setTook(0);
    const t0 = Date.now();
    timer.current = setInterval(() => setSecs(Math.round((Date.now() - t0) / 1000)), 1000);
    try {
      const r = await fetch("/api/admin/veo-test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, aspect }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "فشل");
      if (d.url) { setUrl(d.url); setTook(Math.round((Date.now() - t0) / 1000)); return; }
      for (let i = 0; i < 60; i++) { // up to ~10 minutes
        await new Promise((res) => setTimeout(res, 10000));
        const p = await (await fetch(`/api/admin/veo-test?op=${encodeURIComponent(d.op)}`)).json();
        if (p.error) throw new Error(p.error);
        if (p.done && p.error) throw new Error(p.error);
        if (p.done) { setUrl(p.url); setTook(Math.round((Date.now() - t0) / 1000)); return; }
      }
      throw new Error("طوّل أكثر من 10 دقائق.");
    } catch (e) { setErr((e as Error).message); }
    finally { if (timer.current) clearInterval(timer.current); setBusy(false); }
  }

    return (
    <div className="card flex max-w-2xl flex-col gap-4 p-5">
      <textarea className="field" rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={1500} />
      <div className="flex flex-wrap gap-2">
        {([["9:16", "عمودي 9:16"], ["16:9", "أفقي 16:9"]] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={aspect === v} onClick={() => setAspect(v)} className="chip">{l}</button>)}
      </div>
      <button type="button" disabled={busy} onClick={go} className="btn btn-primary w-fit">{busy ? `جاري التوليد… ${secs} ثانية` : "ولّد لقطة"}</button>
      {err && <p className="text-sm text-red-700" dir="ltr">{err}</p>}
      {url && (
        <div className="flex flex-col gap-2">
          <video src={url} controls playsInline className="max-h-[70vh] rounded-xl bg-black" />
          <p className="text-sm text-subtle">الوقت اللي أخذه التوليد: {took} ثانية. التكلفة الفعلية تشوفها في Google Cloud ← الفوترة.</p>
        </div>
      )}
    </div>
  );
}
