"use client";
import Link from "next/link";
import { useState } from "react";
import { L, LT } from "@/lib/i18n/ui";
import { savePlan, savePlanPrefs, setAutoWeekly, tagPlanJob } from "@/app/app/brand/actions";
import { FORMAT_LABEL, FORMAT_TOOL, cleanFormats, PLAN_FORMATS, SITE_FORMATS, itemRequest, type PlanFormat, type Analysis, type Plan, type PlanColors, type PlanItem, type PlanPrefs } from "@/lib/plan";
import { PALETTES, lum, onColor } from "@/design/spec";
import { ARAB_DIALECTS } from "@/lib/countries";
import { TONES, VOICE_TYPES, typeToGA, type VoiceItem } from "@/lib/voiceMatch";
import { VoicePick } from "@/components/app/VoicePick";

const FORMAT_ICON: Record<string, string> = { post: "🖼️", reel: "🎬", carousel: "🗂️", scenes: "🎥", ad: "📣", anim: "🖍️", site: "🌐", fsite: "🌐", image: "🖼️", fpost: "🖼️", fcarousel: "🗂️", fad: "📣", creative: "✨" };

export function PlanBoard({ identityName, plan: p0, analysis: a0, cost, weekCostPrice, prefs: prefs0, voices = [], dialects: availD, unit, auto: auto0, website = "", available = ["post", "carousel", "reel"] }: { voices?: VoiceItem[]; weekCostPrice: number; prefs: PlanPrefs; dialects: string[] | null; identityName: string | null; plan: Plan | null; analysis: Analysis | null; cost: number; auto: boolean; unit: { post: number; carousel: number; reel: number; scenes: number; ad: number; creative: number; anim: number; site: number; fsite: number; image: number; fpost: number; fcarousel: number; fad: number }; available?: PlanFormat[]; website?: string }) {
  const [plan, setPlan] = useState<Plan | null>(p0);
  const [analysis, setAnalysis] = useState<Analysis | null>(a0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [week, setWeek] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<Record<number, string>>({});
  const [auto, setAuto] = useState(auto0);
  const CAROUSEL_SLIDES = 6;
  const [prefs, setPrefs] = useState<PlanPrefs>(prefs0);
  const bg = prefs.carouselBg ?? "shapes";
  const chosen = cleanFormats(prefs.formats, PLAN_FORMATS.filter((f) => !available.includes(f)));
  const voiceover = prefs.voiceover !== false;
  const availSet = availD ? new Set(availD) : null;
  const dialectList: [string, string][] = ([...ARAB_DIALECTS.map(([v, ar]) => [v, ar] as [string, string]), ["en", "English"] as [string, string]]).filter(([v]) => !availSet || availSet.has(v) || v === "en");
  const dialect = dialectList.some(([v]) => v === prefs.dialect) ? (prefs.dialect as string) : dialectList[0]?.[0] ?? "kuwaiti";
  const typeNow = VOICE_TYPES.find(([id]) => { const g = typeToGA(id); return (g.gender || "") === (prefs.vgender ?? "") && (g.age || "") === (prefs.vage ?? ""); })?.[0] ?? "auto";
  const [custom, setCustom] = useState<PlanColors>(prefs0.postColors ?? { bg: "#F3ECE2", ink: "#1E1B18", accent: "#B4532F", soft: "#FBF7F1" });
  async function setPref(patch: Partial<PlanPrefs>) { setPrefs((p) => ({ ...p, ...patch })); await savePlanPrefs(patch); }
  const mixHex = (a: string, b: string, t: number) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("");
  /** Own background + accent: the text colour and card colour follow so it always stays readable. */
  function pickCustom(bgc: string, accent: string) {
    const c: PlanColors = { bg: bgc, ink: onColor(bgc), accent, soft: lum(bgc) > 0.5 ? mixHex(bgc, "#FFFFFF", 0.5) : mixHex(bgc, "#FFFFFF", 0.08) };
    setCustom(c); void setPref({ postColors: c });
  }
  const sameColors = (a?: PlanColors | null, b?: PlanColors) => !!a && !!b && a.bg === b.bg && a.accent === b.accent && a.ink === b.ink;
  const isWeek = plan?.scope === "week";
  async function pickBg(v: "shapes" | "ai") { await setPref({ carouselBg: v }); }
  const itemCost = (x: PlanItem) => (x.format === "post" ? unit.post : x.format === "carousel" ? unit.carousel * CAROUSEL_SLIDES : x.format === "scenes" ? unit.scenes : x.format === "ad" ? unit.ad : x.format === "creative" ? unit.creative * 2 : x.format === "anim" ? unit.anim * 2 : x.format === "site" ? unit.site * 2 : x.format === "fsite" ? unit.fsite * 2 : x.format === "image" ? unit.image : x.format === "fpost" ? unit.fpost : x.format === "fad" ? unit.fad : x.format === "fcarousel" ? unit.fcarousel * CAROUSEL_SLIDES : unit.reel * 2);
  const weekTodo = plan ? plan.items.map((x, i) => [x, i] as const).filter(([x]) => x.week === week && !x.job) : [];
  const weekCost = weekTodo.reduce((n, [x]) => n + itemCost(x), 0);

  /** Makes one slot with the normal tools (so credits, brand and quality are exactly as usual), tags it «جاهز للنشر», and remembers its job in the plan. */
  async function prepare(i: number, base: Plan): Promise<Plan> {
    const x = base.items[i];
    setState((m) => ({ ...m, [i]: "جاري التجهيز..." }));
    try {
      const rq = itemRequest(x, { ...prefs, dialect }, CAROUSEL_SLIDES);
      let body: Record<string, unknown> = rq.body;
      if (SITE_FORMATS.includes(x.format)) { // his own website (from the identity) is read first, then the video is made from it
        const sj = await readSite(i);
        if (!sj) return base;
        body = { ...body, siteJob: sj };
        setState((m) => ({ ...m, [i]: "جاري التجهيز..." }));
      }
      const r = await fetch(rq.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      const jid: string | undefined = d.jobId ?? d.id;
      if (!r.ok || !jid || d.status === "failed") { setState((m) => ({ ...m, [i]: d.error || "تعذّر التجهيز." })); return base; }
      d.jobId = jid;
      await tagPlanJob(d.jobId, { week: x.week, day: x.day, date: x.date, format: x.format });
      const next = { ...base, items: base.items.map((y, j) => (j === i ? { ...y, job: d.jobId as string } : y)) };
      setPlan(next); await savePlan(next.items, next.month);
      setState((m) => ({ ...m, [i]: "" }));
      return next;
    } catch { setState((m) => ({ ...m, [i]: "تعذّر الاتصال." })); return base; }
  }
  /** reads the customer's own website (saved in his identity) with the free reading step, and waits for it. Returns the reading's job id. */
  async function readSite(i: number): Promise<string | null> {
    const fail = (t: string) => { setState((m) => ({ ...m, [i]: t })); return null; };
    if (!website) return fail("أضف رابط موقعك بهويتك التجارية أول.");
    setState((m) => ({ ...m, [i]: "جاري قراءة موقعك..." }));
    const r = await fetch("/api/site-video", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: website }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.jobId) return fail(d.error || "تعذّرت قراءة الموقع.");
    for (let k = 0; k < 80; k++) {
      await new Promise((res) => setTimeout(res, 3000));
      const g = await fetch(`/api/site-video?job=${d.jobId}`).then((x) => x.json()).catch(() => null);
      if (g?.status === "done") return d.jobId as string;
      if (g?.status === "failed" || g?.error) return fail(g.error || "تعذّرت قراءة الموقع.");
    }
    return fail("قراءة الموقع تأخرت. جرّب مرة ثانية.");
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

  const kinds = (
          <div className="flex flex-col gap-2">
            <b className="text-[14.5px]">{L("شو أنواع المنشورات اللي تبيها بالخطة؟")}</b>
            {([["قوالب جاهزة (سريعة وأقل سعراً)", ["post", "carousel", "ad", "reel", "site"]], ["مبتكر ✨ (تصميم فريد لكل منشور، أغلى)", ["fpost", "fcarousel", "fad", "creative", "anim", "fsite"]], ["صور وفيديو بالذكاء 🎥", ["scenes", "image"]]] as [string, PlanFormat[]][]).map(([title, list]) => { const here = list.filter((f) => available.includes(f)); return here.length > 0 && (
              <div key={title} className="flex flex-col gap-1.5"><span className="text-[13.5px] font-semibold text-muted">{L(title)}</span>
                <div className="flex flex-wrap gap-2">{here.map((f) => { const on = chosen.includes(f); const price = itemCost({ format: f } as PlanItem); return <button key={f} type="button" aria-pressed={on} onClick={() => { const n = on ? chosen.filter((x) => x !== f) : [...chosen, f]; if (n.length) void setPref({ formats: n }); }} className={chip(on)}>{FORMAT_ICON[f]} {L(FORMAT_LABEL[f])} <span className="text-[12px] opacity-75">· {LT(`${price} ريشة`, `${price} feathers`)}</span></button>; })}</div>
              </div>); })}
            <span className="text-[13px] text-subtle">{L("اختر نوع واحد أو أكثر، والخطة تتوزع عليها.")}</span>
          </div>
  );
  if (!identityName) return <div className="card flex flex-col items-start gap-3 p-6"><p>{LT("اكتب عن نشاطك بهويتك التجارية (أو أنشئ هوية)، وبعدها نسوي لك الخطة.", "Tell Shaheen about your business in your brand page (or create an identity), then we make your plan.")}</p><div className="flex flex-wrap gap-2"><Link href="/app/brand" className="btn btn-gold px-6 py-3 font-bold">{LT("هويتي التجارية", "My brand")}</Link><Link href="/app/brand/identity" className="btn btn-outline px-6 py-3 font-bold">✨ {L("إنشاء هوية")}</Link></div></div>;

  return (
    <div className="flex flex-col gap-5">
      {!plan && (
        <div className="card flex max-w-2xl flex-col gap-3 p-6">
          <p className="leading-7">{L("هويتك المعتمدة")}: <b>{identityName}</b>. {L("شاهين يحلل نشاطك ويكتب لك خطة شهر كاملة مع برومبتات جاهزة.")}</p>
          {kinds}
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => generate("week")} disabled={busy} className="btn btn-gold px-7 py-3.5 text-[16px] font-bold disabled:opacity-50">{busy ? L("شاهين يكتب خطتك...") : `📆 ${L("خطة هذا الأسبوع")} (${LT(`${weekCostPrice} ريشة`, `${weekCostPrice} feathers`)})`}</button>
            <button type="button" onClick={() => generate("month")} disabled={busy} className="btn btn-primary px-7 py-3.5 text-[16px] font-bold disabled:opacity-50">{busy ? L("دقيقة أو دقيقتين...") : `🗓️ ${L("خطة الشهر كامل")} (${LT(`${cost} ريشة`, `${cost} feathers`)})`}</button>
          </div>
          <span className="text-[13px] text-subtle">{L("الأسبوعية: أقرب 3 منشورات من اليوم (سبت/اثنين/أربعاء). الشهرية: 4 أسابيع.")}</span>
        </div>
      )}
      {msg && <p role="status" className="rounded-xl bg-gold-100 p-3 text-sm font-semibold text-navy-900">{L(msg)}</p>}

      {analysis && (
        <details className="card group p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xl font-bold text-navy-900">{L("تحليل نشاطك")}<span className="text-base transition group-open:rotate-180">▾</span></summary>
          <div className="mt-4 flex flex-col gap-4">
          <p className="leading-7">{analysis.positioning}</p>
          <div className="grid gap-3 text-[14.5px] leading-7 sm:grid-cols-2">
            <div className="rounded-2xl bg-tint p-3"><b>{L("جمهورك")}</b><p>{analysis.audience}</p></div>
            <div className="rounded-2xl bg-tint p-3"><b>{L("نبرة صوتك")}</b><p>{analysis.voice}</p></div>
            {([["نقاط قوتك", analysis.strengths], ["فجوات لازم تعالجها", analysis.gaps], ["فرص أمامك", analysis.opportunities], ["اللي يميزك", analysis.differentiators]] as [string, string[]][]).map(([t, l]) => l.length > 0 && <div key={t} className="rounded-2xl bg-tint p-3"><b>{L(t)}</b><ul className="list-disc ps-5">{l.map((x) => <li key={x}>{x}</li>)}</ul></div>)}
          </div>
          {analysis.competitors && <p className="text-[14px] leading-7 text-muted"><b className="text-navy-900">{L("المنافسة")}:</b> {analysis.competitors}</p>}
        </div>
        </details>
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
          <details className="card group p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-bold text-navy-900">🧩 {L("أنواع المنشورات (للخطة الجديدة)")}<span className="transition group-open:rotate-180">▾</span></summary><div className="mt-3">{kinds}</div></details>
          <details className="card group p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-bold text-navy-900">🖼️ {L("خلفيات الكاروسيل")}<span className="transition group-open:rotate-180">▾</span></summary><div className="mt-3 flex flex-wrap items-center gap-2 text-[14px]">
            <button type="button" aria-pressed={bg === "shapes"} onClick={() => pickBg("shapes")} className={chip(bg === "shapes")}>{L("زخارف مصمّمة")}</button>
            <button type="button" aria-pressed={bg === "ai"} onClick={() => pickBg("ai")} className={chip(bg === "ai")}>{L("بالذكاء الاصطناعي ✨")}</button></div></details>
          <details className="card group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-navy-900">🎨 {L("ألوان البوستات والكاروسيل")}<span className="transition group-open:rotate-180">▾</span></summary>
            <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!prefs.postColors} onClick={() => setPref({ postColors: null })} className={chip(!prefs.postColors)}>{L("ألوان هويتي (تلقائي)")}</button>
              {PALETTES.map((p) => (
                <button key={p.name} type="button" aria-pressed={sameColors(prefs.postColors, p.colors)} onClick={() => { setCustom(p.colors); void setPref({ postColors: p.colors }); }} className={`flex items-center gap-1.5 ${chip(sameColors(prefs.postColors, p.colors))}`}>
                  <span className="flex overflow-hidden rounded-full">{[p.colors.bg, p.colors.accent, p.colors.ink].map((c) => <span key={c} className="h-5 w-3.5" style={{ background: c }} />)}</span>{L(p.name)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[14px]">
              <span className="font-semibold">{L("أو اختر لونك:")}</span>
              <label className="flex items-center gap-2">{L("الخلفية")}<input type="color" value={custom.bg} onChange={(e) => pickCustom(e.target.value, custom.accent)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" /></label>
              <label className="flex items-center gap-2">{L("اللون المميز")}<input type="color" value={custom.accent} onChange={(e) => pickCustom(custom.bg, e.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" /></label>
            </div>
            <span className="text-[13px] text-subtle">{L("يطبَّق على المنشورات اللي تجهّزها من هنا (وعلى التجهيز التلقائي). وتقدر تغيّر أي لون بعدها داخل استوديو التصميم.")}</span>
          </div></details>
          <details className="card group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-navy-900">🎙️ {L("اللهجة والتعليق الصوتي")}<span className="transition group-open:rotate-180">▾</span></summary>
            <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">{dialectList.map(([v, l]) => <button key={v} type="button" aria-pressed={dialect === v} onClick={() => setPref({ dialect: v })} className={chip(dialect === v)}>{L(l)}</button>)}</div>
            <label className="flex items-center gap-3 text-[14.5px]"><input type="checkbox" checked={voiceover} onChange={(e) => setPref({ voiceover: e.target.checked })} className="h-5 w-5" />{L("الريلز تجي مع تعليق صوتي (نص وصوت)")}</label>
            {voiceover && <>
              <VoicePick voices={voices} value={prefs.voice ?? ""} onChange={(id) => setPref({ voice: id })} auto="تلقائي" />
              <div className="flex flex-wrap gap-2">{TONES.map(([v, l]) => <button key={v} type="button" aria-pressed={(prefs.tone || "auto") === v} onClick={() => setPref({ tone: v === "auto" ? "" : v })} className={chip((prefs.tone || "auto") === v)}>{L(l)}</button>)}</div>
            </>}
            <span className="text-[13px] text-subtle">{L("اللهجة تنطبق على نص الريلز وصوتها، وعلى نصوص البوستات.")}</span>
          </div></details>
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
                  : <button type="button" disabled={state[i] === "جاري التجهيز..." || state[i] === "جاري قراءة موقعك..."} onClick={() => prepare(i, plan)} className="btn btn-gold px-5 py-2.5 text-[14px] font-bold disabled:opacity-50">{state[i] === "جاري التجهيز..." ? L("جاري التجهيز...") : state[i] === "جاري قراءة موقعك..." ? L("جاري قراءة موقعك...") : `⚡ ${L("جهّزه لي")} (${LT(`${itemCost(x)} ريشة`, `${itemCost(x)} feathers`)})`}</button>}
                <Link href={link(x)} className="btn btn-outline px-4 py-2.5 text-[14px]">{L("افتح بالأداة وعدّل بنفسك")}</Link>
                <button type="button" onClick={() => copy(x.prompt)} className="btn btn-outline px-4 py-2.5 text-[14px]">{L("نسخ البرومبت")}</button>
              </div>
              {state[i] && state[i] !== "جاري التجهيز..." && state[i] !== "جاري قراءة موقعك..." && <p role="alert" className="text-sm font-semibold text-red-700">{L(state[i])}</p>}
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
