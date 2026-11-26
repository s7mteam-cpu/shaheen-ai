"use client";
import { useState } from "react";
import { L } from "@/lib/i18n/ui";
import type { InstaRead } from "@/lib/plan";

/** «حلّل هويتي»: one button in the identity page. Shaheen reads the customer's logo, account and style pictures, then fills in the colours and a style description (he reviews and saves) and keeps the account reading for the content plan.
 *  Whether Shaheen visits the account or reads only what the customer uploaded is decided on the server; the customer sees the same button either way. */
export function IdentityAnalyse({ initial, save, onApply }: { initial: InstaRead | null; save: () => Promise<string | null>; onApply: (palette: string[], style: string) => void }) {
  const [res, setRes] = useState<InstaRead | null>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const post = (body: object) => fetch("/api/brand/insta", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }));
  function finish(d: { insta?: InstaRead; palette?: string[]; style?: string }) {
    if (!d.insta) throw new Error("تعذّر التحليل.");
    setRes(d.insta); onApply(d.palette ?? [], d.style ?? ""); setDone(true);
  }
  async function run() {
    setBusy(true); setErr(""); setDone(false);
    try {
      const bad = await save();
      if (bad) throw new Error(bad);
      const a = await post({ mode: "identity" });
      if (!a.ok) throw new Error(a.d.error || "تعذّر التحليل.");
      if (!a.d.jobId) return finish(a.d);
      for (let k = 0; k < 60; k++) {
        await new Promise((r) => setTimeout(r, 3000));
        const g = await fetch(`/api/brand/insta?job=${a.d.jobId}`).then((x) => x.json()).catch(() => null);
        if (g?.status === "done") return finish(g);
        if (g?.status === "failed" || g?.error) {
          // could not see the account: read what the customer uploaded instead, and if there is nothing, ask him for it
          const b = await post({ mode: "identity", skipVisit: true });
          if (b.ok && b.d.insta) return finish(b.d);
          throw new Error(g.error || b.d.error || "تعذّر التحليل.");
        }
      }
      throw new Error("التحليل تأخر. جرّب مرة ثانية.");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  const row = (t: string, v: string[] | string) => (Array.isArray(v) ? v.length > 0 : !!v) && <div className="rounded-2xl bg-white p-3"><b>{L(t)}</b>{Array.isArray(v) ? <ul className="list-disc ps-5">{v.map((x) => <li key={x}>{x}</li>)}</ul> : <p>{v}</p>}</div>;
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-tint p-4">
      <div><span className="label">🔎 {L("حلّل هويتي")}</span><p className="text-[13px] leading-6 text-subtle">{L("شاهين يقرا شعارك وحسابك وصورك، ويطلّع ألوان هويتك ووصف أسلوبك، ويحلل نبرتك وأفضل اتجاهات تناسبك، وتدخل بخطة المحتوى الجديدة.")}</p></div>
      <button type="button" onClick={run} disabled={busy} className="btn btn-gold w-fit px-6 py-3 font-bold disabled:opacity-50">{busy ? L("شاهين يحلل هويتك...") : `🔎 ${L("حلّل هويتي")}`}</button>
      {err && <p role="alert" className="text-sm font-semibold text-red-700">{L(err)}</p>}
      {done && <p role="status" className="text-sm font-semibold text-green-700">{L("تم. عبّينا ألوانك ووصف أسلوبك فوق، راجعهم واضغط «حفظ الهوية».")}</p>}
      {res && <div className="grid gap-3 text-[14.5px] leading-7 sm:grid-cols-2">
        {row("نبرة حسابك", res.voice)}{row("مواضيعك", res.topics)}{row("أنواع محتواك", res.formats)}{row("نقاط قوتك", res.strong)}{row("فجوات", res.gaps)}{row("اتجاهات تناسبك", res.ideas)}{row("الأفضل أداءً", res.best)}
        <p className="text-[13px] text-subtle sm:col-span-2">{L("انحفظ التحليل، وراح يدخل بأي خطة جديدة تسويها.")}</p>
      </div>}
    </div>
  );
}
