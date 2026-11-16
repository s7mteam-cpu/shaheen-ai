"use client";
import Link from "next/link";
import { useState } from "react";
import { L, LT } from "@/lib/i18n/ui";
import { createClient } from "@/lib/supabase/client";
import { chooseIdentity } from "@/app/app/brand/actions";
import { TILE_LABEL, type Concept } from "@/lib/identity";

const TONES = ["فخم وهادئ", "جريء وحيوي", "دافئ وقريب", "عصري ومينيمال", "رسمي وموثوق", "مرح وشبابي"];

type Initial = { about: string; cv: string; logo_url: string | null; logo_preview: string | null; options: Concept[]; chosen: string | null };

export function IdentityCreator({ initial, cost }: { initial: Initial; cost: { base: number; marks: number } }) {
  const [about, setAbout] = useState(initial.about);
  const [audience, setAudience] = useState("");
  const [tones, setTones] = useState<string[]>([]);
  const [cv, setCv] = useState(initial.cv);
  const [website, setWebsite] = useState("");
  const [igImgs, setIgImgs] = useState<{ path: string; name: string }[]>([]);
  const [cvImgs, setCvImgs] = useState<{ path: string; name: string }[]>([]);
  const [useLogo, setUseLogo] = useState(!!initial.logo_url);
  const [logo, setLogo] = useState<{ path: string | null; url: string | null }>({ path: initial.logo_url, url: initial.logo_preview });
  const [draw, setDraw] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [concepts, setConcepts] = useState<Concept[]>(initial.options);
  const [sel, setSel] = useState(0);
  const [chosen, setChosen] = useState<string | null>(initial.chosen);
  const [showForm, setShowForm] = useState(initial.options.length === 0);

  async function up(file: File) {
    const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "image", type: file.type, size: file.size, name: file.name }) });
    const d = await r.json();
    if (!r.ok) { setMsg(d.error); return null; }
    await createClient().storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
    return d.path as string;
  }
  async function pickLogo(file?: File) { if (!file) return; const p = await up(file); if (p) { setLogo({ path: p, url: URL.createObjectURL(file) }); setUseLogo(true); } }
  async function pickCv(files: FileList | null) {
    for (const f of Array.from(files ?? []).slice(0, 4 - cvImgs.length)) { const p = await up(f); if (p) setCvImgs((x) => [...x, { path: p, name: f.name }]); }
  }
  async function pickIg(files: FileList | null) {
    for (const f of Array.from(files ?? []).slice(0, 6 - igImgs.length)) { const p = await up(f); if (p) setIgImgs((x) => [...x, { path: p, name: f.name }]); }
  }
  const total = cost.base + (!useLogo && draw ? cost.marks : 0);

  async function generate() {
    setMsg(""); setBusy(true);
    try {
      const r = await fetch("/api/brand/identity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ about, audience, tone: tones.join("، "), cv, cvImages: cvImgs.map((x) => x.path), igImages: igImgs.map((x) => x.path), website, logo: useLogo ? logo.path : null, drawMarks: !useLogo && draw }) });
      const d = await r.json();
      if (!r.ok) { setMsg((d.error ?? "تعذّر إنشاء الهوية.") + (d.detail ? ` [${d.detail}]` : "")); return; }
      setConcepts(d.concepts); setSel(0); setChosen(null); setShowForm(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setMsg("تعذّر الاتصال. جرّب مرة ثانية."); } finally { setBusy(false); }
  }
  async function choose(c: Concept) {
    const r = await chooseIdentity(c.id);
    if (r.ok) { setChosen(c.id); setMsg("تم اعتماد الهوية. ألوانها وخطها طبقت على كل تصاميمك الجديدة."); } else setMsg("تعذّر الحفظ.");
  }

  const chip = (on: boolean) => `rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-navy-800 bg-navy-800 text-white" : "border-field bg-white text-ink hover:border-navy-700"}`;

  return (
    <div className="flex flex-col gap-6">
      {showForm ? (
        <div className="card flex max-w-3xl flex-col gap-5 p-6 sm:p-7">
          <label className="flex flex-col gap-2"><span className="label">{L("وصف نشاطك أو شخصيتك")}</span>
            <textarea rows={5} value={about} onChange={(e) => setAbout(e.target.value)} maxLength={2500} className="field" placeholder={L("مثال: مركز تجميل نسائي بالكويت، نقدّم عناية بالبشرة وليزر، جمهورنا سيدات 25-45، نبي نظهر بشكل راقي وموثوق...")} /></label>
          <label className="flex flex-col gap-2"><span className="label">{L("الجمهور المستهدف")} <span className="font-normal text-subtle">{L("(اختياري)")}</span></span>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={400} className="field" placeholder={L("مثال: سيدات 25-45 بالكويت")} /></label>
          <div className="flex flex-col gap-2"><span className="label">{L("الإحساس اللي تبيه")} <span className="font-normal text-subtle">{L("(اختر واحد أو أكثر، أو اتركها لشاهين)")}</span></span>
            <div className="flex flex-wrap gap-2">{TONES.map((t) => <button key={t} type="button" aria-pressed={tones.includes(t)} onClick={() => setTones((x) => x.includes(t) ? x.filter((y) => y !== t) : [...x, t])} className={chip(tones.includes(t))}>{L(t)}</button>)}</div></div>

          <div className="flex flex-col gap-3 rounded-2xl bg-tint p-4">
            <div><span className="label">{L("موقعك وحسابك الحالي")} <span className="font-normal text-subtle">{L("(اختياري)")}</span></span>
              <p className="text-[13px] text-subtle">{L("شاهين يقرا موقعك عشان يفهم وش تبيع فعلاً. إنستغرام ما نقدر ندخله لأنه يحتاج تسجيل دخول، فارفع لقطات شاشة من حسابك الحالي (صفحتك وكم بوست) ويحلل أسلوبك ويطوّره.")}</p></div>
            <input dir="ltr" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} className="field" placeholder="www.example.com" />
            <div className="flex flex-wrap items-center gap-2.5">
              {igImgs.map((x, i) => <span key={x.path} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px]">{x.name.slice(0, 18)}<button type="button" aria-label={L("حذف")} onClick={() => setIgImgs(igImgs.filter((_, j) => j !== i))} className="text-red-700">×</button></span>)}
              {igImgs.length < 6 && <label className="btn btn-outline cursor-pointer px-4 py-2 text-sm">{L("رفع لقطات من حسابي (حتى 6)")}<input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickIg(e.target.files)} /></label>}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-tint p-4">
            <span className="label">{L("الشعار")}</span>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" aria-pressed={useLogo} onClick={() => setUseLogo(true)} className={chip(useLogo)}>{L("عندي شعار")}</button>
              <button type="button" aria-pressed={!useLogo} onClick={() => setUseLogo(false)} className={chip(!useLogo)}>{L("ما عندي شعار")}</button>
            </div>
            {useLogo ? (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white text-xs text-subtle">{logo.url ? <img src={logo.url} alt={L("شعارك")} className="h-full w-full object-contain" /> : L("بدون")}</div>
                <label className="btn btn-outline cursor-pointer px-4 py-2.5 text-sm">{logo.url ? L("تغيير الشعار") : L("رفع الشعار")}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0])} /></label>
              </div>
            ) : (
              <label className="flex items-start gap-2 text-[14px]"><input type="checkbox" checked={draw} onChange={(e) => setDraw(e.target.checked)} className="mt-1" /><span>{L("ارسم لي رمز شعار لكل هوية")} <span className="text-subtle">({LT(`+${cost.marks} ريشة`, `+${cost.marks} feathers`)})</span></span></label>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl bg-tint p-4">
            <div><span className="label">{L("السيرة الذاتية")} <span className="font-normal text-subtle">{L("(اختياري، تعطي شاهين معلومات أكثر)")}</span></span>
              <p className="text-[13px] text-subtle">{L("للأشخاص والخبراء والمدربين: شاهين يستخرج منها تخصصك وخبرتك ويكتب بايو وكابشنات تعبّر عنك. ما يخترع شي مو مذكور فيها.")}</p></div>
            <textarea rows={5} value={cv} onChange={(e) => setCv(e.target.value)} maxLength={9000} className="field" placeholder={L("الصق نص سيرتك الذاتية هنا...")} />
            <div className="flex flex-wrap items-center gap-2.5">
              {cvImgs.map((x, i) => <span key={x.path} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px]">{x.name.slice(0, 18)}<button type="button" aria-label={L("حذف")} onClick={() => setCvImgs(cvImgs.filter((_, j) => j !== i))} className="text-red-700">×</button></span>)}
              {cvImgs.length < 4 && <label className="btn btn-outline cursor-pointer px-4 py-2 text-sm">{L("أو ارفع صور السيرة (حتى 4 صفحات)")}<input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pickCv(e.target.files)} /></label>}
            </div>
            <p className="text-[12px] text-subtle">{L("إذا سيرتك PDF: خذ لها لقطة شاشة لكل صفحة وارفعها، أو الصق النص.")}</p>
          </div>

          {msg && <p role="alert" className="text-sm font-semibold text-red-700">{L(msg)}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy || about.trim().length < 15} onClick={generate} className="btn btn-gold px-7 py-3.5 text-[16px] font-bold disabled:opacity-50">{busy ? L("شاهين يشتغل على هويتك... (قد ياخذ دقيقة أو دقيقتين)") : `✨ ${L("أنشئ هويتي")}`}</button>
            <span className="text-[13px] text-subtle">{LT(`التكلفة: ${total} ريشة`, `Cost: ${total} feathers`)}</span>
            {concepts.length > 0 && <button type="button" onClick={() => setShowForm(false)} className="text-sm text-muted underline">{L("رجوع للهويات")}</button>}
          </div>
        </div>
      ) : concepts.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {concepts.map((c, i) => <button key={c.id} type="button" aria-pressed={sel === i} onClick={() => setSel(i)} className={chip(sel === i)}>{i + 1}. {c.name}{chosen === c.id ? " ✓" : ""}</button>)}
            <button type="button" onClick={() => setShowForm(true)} className="ms-auto text-sm font-semibold text-navy-700 underline">{L("↻ هويات جديدة")}</button>
          </div>
          {msg && <p role="status" className="rounded-xl bg-gold-100 p-3 text-sm font-semibold text-navy-900">{L(msg)}</p>}
          <Board c={concepts[sel]} chosen={chosen === concepts[sel].id} onChoose={() => choose(concepts[sel])} logoPreview={initial.logo_preview && !concepts[sel].logo.url ? initial.logo_preview : null} />
        </>
      ) : null}
    </div>
  );
}

function Copy({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1500); }); }} className="text-[13px] font-semibold text-navy-700 underline">{ok ? L("تم النسخ ✓") : label}</button>;
}

function Board({ c, chosen, onChoose, logoPreview }: { c: Concept; chosen: boolean; onChoose: () => void; logoPreview: string | null }) {
  const [head, body] = [c.fonts.head, c.fonts.body];
  const P = c.palette;
  const mark = c.logo.url ?? logoPreview;
  const avatarBg = P[0].hex;
  const handle = "@" + (c.name.replace(/\s+/g, "_").replace(/[^\w\u0600-\u06FF_]/g, "").slice(0, 18) || "brand");
  const sec = "card flex flex-col gap-3 p-5";
  return (
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      {/* Instagram page preview */}
      <div className="flex flex-col gap-3">
        <div className="mx-auto w-full max-w-[340px] rounded-[2.6rem] bg-neutral-900 p-2.5 shadow-xl">
          <div className="overflow-hidden rounded-[2.1rem] bg-white" style={{ fontFamily: body }}>
            <div className="flex items-center justify-between px-4 pb-1 pt-3 text-[11px] font-bold text-neutral-800" dir="ltr"><span>9:41</span><span className="h-4 w-16 rounded-full bg-neutral-900" /><span>●●●</span></div>
            <div className="flex items-center justify-between px-4 py-1.5" dir="rtl"><b className="text-[15px]" style={{ fontFamily: head }}>{handle}</b><span className="text-lg">☰</span></div>
            <div className="flex items-center gap-4 px-4 pb-2" dir="rtl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${P[2].hex}, ${P[0].hex})` }}><div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-white">{mark ? <img src={mark} alt="" className="h-full w-full object-contain p-1" /> : <span className="grid h-full w-full place-items-center text-2xl font-bold" style={{ background: avatarBg, color: P[3].hex, fontFamily: head }}>{c.name.slice(0, 1)}</span>}</div></div>
              <div className="grid flex-1 grid-cols-3 text-center"><div><b className="block text-[15px]">12</b><span className="text-[11px] text-neutral-600">{L("منشور")}</span></div><div><b className="block text-[15px]">—</b><span className="text-[11px] text-neutral-600">{L("متابع")}</span></div><div><b className="block text-[15px]">—</b><span className="text-[11px] text-neutral-600">{L("يتابع")}</span></div></div>
            </div>
            <div className="px-4 pb-2.5" dir="rtl"><b className="block text-[13px]" style={{ fontFamily: head }}>{c.name}</b><span className="whitespace-pre-line text-[12px] leading-[1.55] text-neutral-700">{c.bio}</span>
              <div className="mt-2 flex gap-1.5"><span className="flex-1 rounded-lg py-1.5 text-center text-[12px] font-bold" style={{ background: P[0].hex, color: readableOn(P[0].hex) }}>{L("متابعة")}</span><span className="flex-1 rounded-lg bg-neutral-100 py-1.5 text-center text-[12px] font-bold">{L("مراسلة")}</span></div></div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-2.5" dir="rtl">
              {c.highlights.map((h, i) => <div key={h} className="flex w-14 shrink-0 flex-col items-center gap-1"><span className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 p-[3px]" style={{ borderColor: P[(i + 1) % P.length].hex }}><span className="grid h-full w-full place-items-center rounded-full text-base font-bold" style={{ background: P[i % 2 ? 0 : 3].hex, color: readableOn(P[i % 2 ? 0 : 3].hex), fontFamily: head }}>{h.slice(0, 1)}</span></span><span className="w-full truncate text-center text-[10px]">{h}</span></div>)}
            </div>
            <div className="grid grid-cols-3 border-t border-neutral-200 text-center text-base text-neutral-400"><span className="border-b-2 border-neutral-900 py-1.5 text-neutral-900">▦</span><span className="py-1.5">🎬</span><span className="py-1.5">☺</span></div>
            <div className="grid grid-cols-3 gap-[2px] bg-white" dir="rtl">
              {c.feed.tiles.map((t, i) => <Tile key={i} t={t} P={P} head={head} body={body} />)}
            </div>
          </div>
        </div>
        <button type="button" onClick={onChoose} disabled={chosen} className="btn btn-gold py-3.5 text-[16px] font-bold disabled:opacity-60">{chosen ? `✓ ${L("هذي هويتك المعتمدة")}` : `✨ ${L("اعتمد هذي الهوية")}`}</button>
        {chosen && <Link href="/app/brand/plan" className="btn btn-primary py-3.5 text-center text-[16px] font-bold">📅 {L("اكتب لي خطة المحتوى الشهرية")}</Link>}
        
        <p className="text-[12px] text-subtle">{L("بعد الاعتماد تنحفظ الألوان والخط (والشعار إذا رسمناه) بـ«هويتي التجارية» وتنطبق على التصاميم والفيديوهات الجديدة.")}</p>
      </div>

      <div className="flex flex-col gap-5">
        <section className={sec}>
          <h2 className="text-xl font-bold text-navy-900" style={{ fontFamily: head }}>{c.name}</h2>
          <p className="leading-7">{c.idea}</p>
          <p className="text-[14px] leading-7 text-muted"><b className="text-navy-900">{L("ليش تناسبك؟")}</b> {c.why}</p>
          <div className="flex flex-wrap gap-2">{c.personality.map((p) => <span key={p} className="rounded-full bg-tint px-3 py-1 text-[13px] font-semibold">{p}</span>)}</div>
        </section>

        <section className={sec}>
          <h3 className="font-bold text-navy-900">{L("الألوان والخطوط")}</h3>
          <div className="grid grid-cols-5 overflow-hidden rounded-2xl">{P.map((p) => <div key={p.hex} className="flex h-24 flex-col justify-end p-2 text-[11px] font-bold" style={{ background: p.hex, color: readableOn(p.hex) }}><span>{p.name}</span><span dir="ltr" className="font-latin opacity-80">{p.hex}</span></div>)}</div>
          <div className="rounded-2xl p-4" style={{ background: P[3].hex, color: P[4].hex }}>
            <div className="text-2xl font-bold" style={{ fontFamily: head }}>{L("عنوان رئيسي بخط الهوية")}</div>
            <div className="mt-1 text-[15px] leading-7" style={{ fontFamily: body }}>{L("هذا نص أساسي بخط الكتابة، يعطيك إحساس الهوية بالتفاصيل الصغيرة.")}</div>
          </div>
          <p className="text-[13px] text-muted">{L("خط العناوين")}: <b style={{ fontFamily: head }}>{head}</b> · {L("خط النصوص")}: <b style={{ fontFamily: body }}>{body}</b></p>
          {c.logo.direction && <p className="text-[14px] leading-7"><b className="text-navy-900">{L("الشعار")}:</b> {c.logo.direction}</p>}
        </section>

        <section className={sec}>
          <h3 className="font-bold text-navy-900">{L("شكل الصفحة والبوستات")}</h3>
          <p className="leading-7">{c.feed.approach}</p>
          <ul className="flex list-disc flex-col gap-1.5 ps-5 text-[14.5px] leading-7">{c.feed.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>

        <section className={sec}>
          <h3 className="font-bold text-navy-900">{L("الريلز")}</h3>
          <dl className="grid gap-2 text-[14.5px] leading-7 sm:grid-cols-[110px_1fr]">
            <dt className="font-bold">{L("الغلاف")}</dt><dd>{c.reels.cover}</dd>
            <dt className="font-bold">{L("الحركة")}</dt><dd>{c.reels.motion}</dd>
            <dt className="font-bold">{L("الترجمة")}</dt><dd>{c.reels.captionStyle}</dd>
            <dt className="font-bold">{L("المدة")}</dt><dd>{c.reels.length}</dd>
            <dt className="font-bold">{L("جمل افتتاح")}</dt><dd><ul className="list-disc ps-5">{c.reels.hooks.map((h) => <li key={h}>{h}</li>)}</ul></dd>
          </dl>
        </section>

        <section className={sec}>
          <h3 className="font-bold text-navy-900">{L("أعمدة المحتوى")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">{c.content.pillars.map((p) => <div key={p.name} className="rounded-2xl bg-tint p-3"><b>{p.name} <span className="text-subtle">{p.share}</span></b><ul className="mt-1 list-disc ps-5 text-[13.5px] leading-6">{p.ideas.map((x) => <li key={x}>{x}</li>)}</ul></div>)}</div>
          {c.content.cadence && <p className="text-[14px] text-muted">{c.content.cadence}</p>}
        </section>

        <section className={sec}>
          <div className="flex items-center justify-between"><h3 className="font-bold text-navy-900">{L("البايو")}</h3><Copy text={c.bio} label={L("نسخ")} /></div>
          <p className="whitespace-pre-line rounded-2xl bg-tint p-3 leading-7">{c.bio}</p>
        </section>

        <section className={sec}>
          <h3 className="font-bold text-navy-900">{L("كابشنات جاهزة")}</h3>
          {c.captions.map((x, i) => <div key={i} className="rounded-2xl bg-tint p-3"><div className="mb-1 flex items-center justify-between"><b className="text-[13px]">{x.type}</b><Copy text={x.text} label={L("نسخ")} /></div><p className="whitespace-pre-line leading-7">{x.text}</p></div>)}
          {c.hashtags.length > 0 && <div className="flex items-center justify-between gap-3"><p dir="rtl" className="text-[13px] leading-7 text-navy-700">{c.hashtags.join(" ")}</p><Copy text={c.hashtags.join(" ")} label={L("نسخ")} /></div>}
        </section>
      </div>
    </div>
  );
}

function readableOn(hex: string) { const n = parseInt(hex.slice(1), 16); const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; return l > 0.6 ? "#111" : "#fff"; }

/** One feed tile, drawn like a real branded post: the layout depends on the kind (quote, offer, tip, product, testimonial, brand). */
function Tile({ t, P, head, body }: { t: Concept["feed"]["tiles"][number]; P: Concept["palette"]; head: string; body: string }) {
  const bg = P[t.bg].hex, fg = t.fg, ac = P[2].hex === bg ? P[0].hex : P[2].hex;
  const base = "relative flex aspect-[4/5] flex-col overflow-hidden p-2";
  if (t.kind === "offer") return <div className={`${base} items-center justify-center text-center`} style={{ background: bg, color: fg }}><span className="absolute -right-5 -top-5 h-16 w-16 rounded-full opacity-90" style={{ background: ac }} /><span className="relative text-[13px] font-extrabold leading-[1.3]" style={{ fontFamily: head }}>{t.text}</span><span className="relative mt-1.5 rounded-full px-2 py-0.5 text-[8px] font-bold" style={{ background: ac, color: readableOn(ac), fontFamily: body }}>{TILE_LABEL.offer}</span></div>;
  if (t.kind === "tip") return <div className={`${base} justify-between`} style={{ background: bg, color: fg }}><span className="text-[22px] font-black leading-none opacity-30" style={{ fontFamily: head }}>01</span><span className="text-[12px] font-bold leading-[1.4]" style={{ fontFamily: head }}>{t.text}</span><span className="h-0.5 w-8" style={{ background: ac }} /></div>;
  if (t.kind === "product") return <div className={`${base} items-center justify-between`} style={{ background: bg, color: fg }}><span className="mt-1 h-12 w-12 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, ${ac}, ${P[0].hex === bg ? P[1].hex : P[0].hex})` }} /><span className="text-center text-[11px] font-bold leading-[1.35]" style={{ fontFamily: head }}>{t.text}</span></div>;
  if (t.kind === "testimonial") return <div className={`${base} justify-center`} style={{ background: bg, color: fg }}><span className="text-[9px]" style={{ color: ac }}>★★★★★</span><span className="mt-1 text-[11px] font-semibold leading-[1.45]" style={{ fontFamily: body }}>“{t.text}”</span></div>;
  if (t.kind === "quote") return <div className={`${base} justify-center`} style={{ background: bg, color: fg }}><span className="text-3xl font-black leading-none" style={{ color: ac, fontFamily: head }}>”</span><span className="text-[12.5px] font-bold leading-[1.4]" style={{ fontFamily: head }}>{t.text}</span></div>;
  return <div className={`${base} items-center justify-center text-center`} style={{ background: bg, color: fg }}><span className="absolute inset-2 rounded-lg border opacity-40" style={{ borderColor: fg }} /><span className="relative text-[13px] font-extrabold leading-[1.35]" style={{ fontFamily: head }}>{t.text}</span></div>;
}
