"use client";
import Link from "next/link";
import { useState } from "react";
import { L, LT } from "@/lib/i18n/ui";
import { savePlan, savePlanPrefs, setAutoWeekly, tagPlanJob } from "@/app/app/brand/actions";
import { FORMAT_LABEL, FORMAT_TOOL, type Analysis, type Plan, type PlanItem } from "@/lib/plan";

const FORMAT_ICON: Record<string, string> = { post: "🖼️", reel: "🎬", carousel: "🗂️" };

export function PlanBoard({ identityName, plan: p0, analysis: a0, cost, weekCostPrice, bg: bg0, unit, auto: auto0 }: { weekCostPrice: number; bg: "shapes" | "ai"; identityName: string | null; plan: Plan | null; analysis: Analysis | null; cost: number; auto: boolean; unit: { post: number; carousel: number; reel: number } }) {
  const [plan, setPlan] = useState<Plan | null>(p0);
  const [analysis, setAnalysis] = useState<Analysis | null>(a0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [week, setWeek] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<Record<number, string>>({});
  const [auto, setAuto] = useState(auto0);
  const CAROUSEL_SLIDES = 6;
  const [bg, setBg] = useState<"shapes" | "ai">(bg0);
  const isWeek = plan?.scope === "week";
  async function pickBg(v: "shapes" | "ai") { setBg(v); await savePlanPrefs({ carouselBg: v }); }
  const itemCost = (x: PlanItem) => (x.format === "post" ? unit.post : x.format === "carousel" ? unit.carousel * CAROUSEL_SLIDES : unit.reel * 2);
  const weekTodo = plan ? plan.items.map((x, i) => [x, i] as const).filter(([x]) => x.week === week && !x.job) : [];
  const weekCost = weekTodo.reduce((n, [x]) => n + itemCost(x), 0);

  /** Makes one slot with the normal tools (so credits, brand and quality are exactly as usual), tags it «جاهز للنشر», and remembers its job in the plan. */
  async function prepare(i: number, base: Plan): Promise<Plan> {
    const x = base.items[i];
    setState((m) => ({ ...m, [i]: "جاري التجهيز..." }));
    try {
      const r = x.format === "reel"
        ? await fetch("/api/lesson", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "motion", topic: x.prompt, seconds: 30, aspect: "9:16", dialect: "kuwaiti", voiceover: false, drawings: true, drawLevel: "few" }) })
        : await fetch("/api/design/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: FORMAT_TOOL[x.format], info: x.prompt, count: x.format === "carousel" ? CAROUSEL_SLIDES : 1, bgMode: x.format === "carousel" ? bg : undefined, aspect: "4:5", dialect: "kuwaiti", photos: [], useBrand: true, aiImages: true }) });
      const d = await r.json();
      if (!r.ok || !d.jobId) { setState((m) => ({ ...m, [i]: d.error || "تعذّر التجهيز." })); return base; }
      await tagPlanJob(d.jobId, { week: x.week, day: x.day, date: x.date, format: x.format });
      const next = { ...base, items: base.items.map((y, j) => (j === i ? { ...y, job: d.jobId as string } : y)) };
      setPlan(next); await savePlan(next.items, next.month);
      setState((m) => ({ ...m, [i]: "" }));
      return next;
    } catch { setState((m) => ({ ...m, [i]: "تعذّر الاتصال." })); return base; }
  }
  async function toggleAuto(on: boolean) {
    setAuto(on);
    const r = await setAutoWeekly(on);
    if (!r.ok) { setAuto(!on); setMsg("تعذّر حفظ الخيار."); } else setMsg(on ? "تم التفعيل. كل سبت الساعة 9 الصبح بتوقيت الكويت تلقى منشورات الأسبوع جاهزة، ويوصلك إشعار." : "تم إيقاف التجهيز التلقائي.");
  }
  async function prepareWeek() {
    if (!plan) return;
    let cur = plan;
    for (const [, i] of weekTodo) cur = await prepare(i, cur);
  }

  async function generate(scope: "week" | "month") {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/brand/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scope }) });
      const d = await r.json();
      if (!r.ok) { setMsg((d.error ?? "تعذّر إنشاء الخطة.") + (d.detail ? ` [${d.detail}]` : "")); return; }
      setPlan(d.plan); setAnalysis(d.analysis); setWeek(1); setDirty(false);
    } catch { setMsg("تعذّر الاتصال. جرّب مرة ثانية."); } finally { setBusy(false); }
  }
  function edit(i: number, k: "prompt" | "caption", v: string) {
    if (!plan) return;
    setPlan({ ...plan, items: plan.items.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }); setDirty(true);
  }
  async function save() {
    if (!plan) return;
    const r = await savePlan(plan.items, plan.month);
    setMsg(r.ok ? "تم حفظ تعديلاتك." : "تعذّر الحفظ."); if (r.ok) setDirty(false);
  }
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => setMsg("تم النسخ ✓"));
  const link = (x: PlanItem) => `/app/tools/${FORMAT_TOOL[x.format]}?idea=${encodeURIComponent(x.prompt.slice(0, 1150))}`;
  const chip = (on: boolean) => `rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-navy-800 bg-navy-800 text-white" : "border-field bg-white hover:border-navy-700"}`;

  if (!identityName) return <div className="card flex flex-col items-start gap-3 p-6"><p>{L("اعتمد هوية أول، وبعدها نسوي لك الخطة.")}</p><Link href="/app/brand/identity" className="btn btn-gold px-6 py-3 font-bold">✨ {L("إنشاء هوية")}</Link></div>;

  return (
    <div className="flex flex-col gap-5">
      {!plan && (
        <div className="card flex max-w-2xl flex-col gap-3 p-6">
          <p className="leading-7">{L("هويتك المعتمدة")}: <b>{identityName}</b>. {L("شاهين يحلل نشاطك ويكتب لك خطة شهر كاملة مع برومبتات جاهزة.")}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => generate("week")} disabled={busy} className="btn btn-gold px-7 py-3.5 text-[16px] font-bold disabled:opacity-50">{busy ? L("شاهين يكتب خطتك...") : `📆 ${L("خطة هذا الأسبوع")} (${LT(`${weekCostPrice} ريشة`, `${weekCostPrice} feathers`)})`}</button>
            <button type="button" onClick={() => generate("month")} disabled={busy} className="btn btn-primary px-7 py-3.5 text-[16px] font-bold disabled:opacity-50">{busy ? L("دقيقة أو دقيقتين...") : `🗓️ ${L("خطة الشهر كامل")} (${LT(`${cost} ريشة`, `${cost} feathers`)})`}</button>
          </div>
          <span className="text-[13px] text-subtle">{L("الأسبوعية: أقرب 3 منشورات من اليوم (سبت/اثنين/أربعاء). الشهرية: 4 أسابيع.")}</span>
        </div>
      )}
      {msg && <p role="status" className="rounded-xl bg-gold-100 p-3 text-sm font-semibold text-navy-900">{L(msg)}</p>}

      {analysis && (
        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-xl font-bold text-navy-900">{L("تحليل نشاطك")}</h2>
          <p className="leading-7">{analysis.positioning}</p>
          <div className="grid gap-3 text-[14.5px] leading-7 sm:grid-cols-2">
            <div className="rounded-2xl bg-tint p-3"><b>{L("جمهورك")}</b><p>{analysis.audience}</p></div>
            <div className="rounded-2xl bg-tint p-3"><b>{L("نبرة صوتك")}</b><p>{analysis.voice}</p></div>
            {([["نقاط قوتك", analysis.strengths], ["فجوات لازم تعالجها", analysis.gaps], ["فرص أمامك", analysis.opportunities], ["اللي يميزك", analysis.differentiators]] as [string, string[]][]).map(([t, l]) => l.length > 0 && <div key={t} className="rounded-2xl bg-tint p-3"><b>{L(t)}</b><ul className="list-disc ps-5">{l.map((x) => <li key={x}>{x}</li>)}</ul></div>)}
          </div>
          {analysis.competitors && <p className="text-[14px] leading-7 text-muted"><b className="text-navy-900">{L("المنافسة")}:</b> {analysis.competitors}</p>}
        </section>
      )}

      {plan && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(isWeek ? [1] : [1, 2, 3, 4]).map((w) => <button key={w} type="button" aria-pressed={week === w} onClick={() => setWeek(w)} className={chip(week === w)}>{L("الأسبوع")} {w}</button>)}
            <span className="ms-auto text-[13px] text-subtle">{plan.month}</span>
            <button type="button" onClick={() => generate("week")} disabled={busy} className="text-sm font-semibold text-navy-700 underline">{busy ? L("جاري الكتابة...") : `↻ ${L("خطة أسبوع جديدة")} (${LT(`${weekCostPrice} ريشة`, `${weekCostPrice} feathers`)})`}</button>
            <button type="button" onClick={() => generate("month")} disabled={busy} className="text-sm font-semibold text-navy-700 underline">{busy ? "" : `↻ ${L("خطة شهر جديدة")} (${LT(`${cost} ريشة`, `${cost} feathers`)})`}</button>
          </div>
          <label className="card flex cursor-pointer items-start gap-3 p-4">
            <input type="checkbox" checked={auto} onChange={(e) => toggleAuto(e.target.checked)} className="mt-1.5 h-5 w-5" />
            <span className="flex flex-col gap-1"><b className="text-navy-900">{L("جهّز منشوراتي تلقائياً كل أسبوع")}</b>
              <span className="text-[13.5px] leading-6 text-muted">{L("كل سبت الساعة 9 الصبح (بتوقيت الكويت) نجهّز لك منشورات الأسبوع الثلاثة ويوصلك إشعار، وتلقاها بقسم «منشوراتك جاهزة للنشر». ننسحب الريش وقت التجهيز بس، وإذا رصيدك ما يكفي نوقف ونرسل لك إشعار.")} {LT(`التكلفة التقريبية للأسبوع: ${plan.items.filter((x) => x.week === 1).reduce((n, x) => n + itemCost(x), 0)} ريشة`, `About ${plan.items.filter((x) => x.week === 1).reduce((n, x) => n + itemCost(x), 0)} feathers per week`)}</span></span>
          </label>
          <div className="flex flex-wrap items-center gap-2 text-[14px]"><span className="font-semibold">{L("خلفيات الكاروسيل")}:</span>
            <button type="button" aria-pressed={bg === "shapes"} onClick={() => pickBg("shapes")} className={chip(bg === "shapes")}>{L("زخارف مصمّمة")}</button>
            <button type="button" aria-pressed={bg === "ai"} onClick={() => pickBg("ai")} className={chip(bg === "ai")}>{L("بالذكاء الاصطناعي ✨")}</button></div>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-navy-900 p-4 text-white">
            <div className="flex-1 text-[14px] leading-7">{weekTodo.length > 0 ? L("جهّز منشورات هذا الأسبوع كلها دفعة وحدة. تلقاها بأعمالي ← «جاهز للنشر» وتراجعها قبل النشر.") : L("منشورات هذا الأسبوع كلها جاهزة ✓")}</div>
            {weekTodo.length > 0 && <button type="button" onClick={prepareWeek} disabled={Object.values(state).includes("جاري التجهيز...")} className="btn btn-gold px-6 py-3 font-bold disabled:opacity-50">⚡ {L("جهّز أسبوع")} {week} ({LT(`${weekCost} ريشة`, `${weekCost} feathers`)})</button>}
            <Link href="/app/works?c=ready" className="text-[14px] font-semibold underline">📅 {L("جاهز للنشر")}</Link>
          </div>
          {plan.items.map((x, i) => x.week === week && (
            <article key={i} className="card flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-navy-800 px-3 py-1 text-[13px] font-bold text-white">{x.day} {x.date}</span>
                {x.time && <span className="rounded-full bg-tint px-3 py-1 text-[13px] font-bold text-navy-900">🕒 {L("النشر")}: {x.time}</span>}
                <span className="rounded-full bg-gold-100 px-3 py-1 text-[13px] font-bold text-navy-900">{FORMAT_ICON[x.format]} {L(FORMAT_LABEL[x.format])}</span>
                {x.pillar && <span className="rounded-full bg-tint px-3 py-1 text-[13px]">{x.pillar}</span>}
                {x.goal && <span className="text-[13px] text-subtle">{L("الهدف")}: {x.goal}</span>}
              </div>
              <h3 className="text-lg font-bold text-navy-900">{x.topic}</h3>
              {x.hook && <p className="text-[14.5px] text-muted">{L("الافتتاحية")}: <b className="text-ink">{x.hook}</b></p>}
              <label className="flex flex-col gap-1.5"><span className="text-[14px] font-bold">{L("البرومبت (عدّله براحتك)")}</span>
                <textarea rows={8} value={x.prompt} onChange={(e) => edit(i, "prompt", e.target.value)} maxLength={1100} className="field leading-7" /></label>
              <div className="flex flex-wrap gap-2">
                {x.job
                  ? <Link href={`/app/tools/${FORMAT_TOOL[x.format]}?job=${x.job}`} className="btn btn-primary px-5 py-2.5 text-[14px] font-bold">✓ {L("جاهز، افتحه وراجعه")}</Link>
                  : <button type="button" disabled={state[i] === "جاري التجهيز..."} onClick={() => prepare(i, plan)} className="btn btn-gold px-5 py-2.5 text-[14px] font-bold disabled:opacity-50">{state[i] === "جاري التجهيز..." ? L("جاري التجهيز...") : `⚡ ${L("جهّزه لي")} (${LT(`${itemCost(x)} ريشة`, `${itemCost(x)} feathers`)})`}</button>}
                <Link href={link(x)} className="btn btn-outline px-4 py-2.5 text-[14px]">{L("افتح بالأداة وعدّل بنفسك")}</Link>
                <button type="button" onClick={() => copy(x.prompt)} className="btn btn-outline px-4 py-2.5 text-[14px]">{L("نسخ البرومبت")}</button>
              </div>
              {state[i] && state[i] !== "جاري التجهيز..." && <p role="alert" className="text-sm font-semibold text-red-700">{L(state[i])}</p>}
              <label className="flex flex-col gap-1.5"><span className="text-[14px] font-bold">{L("الكابشن")}</span>
                <textarea rows={4} value={x.caption} onChange={(e) => edit(i, "caption", e.target.value)} maxLength={900} className="field leading-7" /></label>
              <button type="button" onClick={() => copy(x.caption)} className="w-fit text-[13px] font-semibold text-navy-700 underline">{L("نسخ الكابشن")}</button>
            </article>
          ))}
          {dirty && <div className="sticky bottom-3 flex justify-center"><button type="button" onClick={save} className="btn btn-primary px-8 py-3 font-bold shadow-lg">{L("حفظ تعديلاتي")}</button></div>}
        </section>
      )}
    </div>
  );
}
