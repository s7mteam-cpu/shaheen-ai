"use client";
import { GULF_DIALECTS, myDialect } from "@/lib/countries";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { More } from "@/components/app/Collapse";
import { TONES, voiceDialects } from "@/lib/voiceMatch";
import { VoicePick } from "@/components/app/VoicePick";
import { PhotoPicker, type Photo } from "@/components/app/PhotoPicker";
import { SITE_GROUPS, SITE_STYLES, type SBg } from "@/remotion/siteStyles";

const sizes = [["9:16", "📱 ريلز / تيك توك 9:16"], ["16:9", "▶️ يوتيوب 16:9"], ["1:1", "⬜ مربع 1:1"], ["4:5", "🖼️ طولي 4:5"]] as const;
const lengths = [[15, "15 ثانية"], [30, "30 ثانية"], [60, "دقيقة"]] as const;
const dialects: (readonly [string, string])[] = [...GULF_DIALECTS.map(([v, ar]) => [v, ar] as const), ["en", "English"]];
const SWATCH: Record<SBg, string> = {
  dark: "linear-gradient(135deg,#0b1220,#26324d)", aurora: "linear-gradient(135deg,#1b1147,#12a4c9)", neon: "linear-gradient(135deg,#06060f,#c026d3)", light: "linear-gradient(135deg,#ffffff,#dfe6f5)",
  pastel: "linear-gradient(135deg,#ffe3ef,#d9e6ff)", spot: "radial-gradient(circle at 50% 20%,#4a4f5e,#08090c)", brand: "linear-gradient(135deg,#e8b44c,#a56a10)", stripes: "repeating-linear-gradient(115deg,#1d2b4a 0 6px,#3a5aa8 6px 12px)",
  dots: "radial-gradient(#e8b44c 20%,#fff2d6 22%)", orbs: "radial-gradient(circle at 30% 30%,#ffd37a,#5b3b8c)", sunset: "linear-gradient(135deg,#ffb36b,#ff5e7e,#5b3b8c)", paper: "linear-gradient(135deg,#f3ead8,#e4d6b8)",
};

type Site = { host: string; title: string; desc: string; text: string; sections: string[]; mobileUrl: string; desktopUrl: string };

/** «فيديو من موقعك»: the customer pastes his website; Shaheen opens it, reads it, and makes a video that browses it and explains what it offers. */
export function SiteVideoStart({ costPer15, balance, voices = [], fresh = false, ready = true, hasStyle = false }: { costPer15: number; balance: number; fresh?: boolean; ready?: boolean; hasStyle?: boolean; voices?: { id: string; name: string; note?: string; dialects?: string[] }[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [reading, setReading] = useState(false);
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("auto");
  const [shots, setShots] = useState<Photo[]>([]);
  const [readImgs, setReadImgs] = useState(true);
  const [aspect, setAspect] = useState<string>("9:16");
  const [seconds, setSeconds] = useState(30);
  const [dialect, setDialect] = useState<string>("kuwaiti");
  useEffect(() => { setDialect(myDialect()); }, []);
  const [voiceover, setVoiceover] = useState(true);
  const [voice, setVoice] = useState("");
  const [vgender, setVgender] = useState("");
  const [vage, setVage] = useState("");
  const [tone, setTone] = useState("auto");
  const [withMusic] = useState(false); // v302: no AI background music (customers add their own sound in the studio)
  const availD = voiceDialects(voices);
  useEffect(() => { if (voiceover && availD && !availD.has(dialect)) setDialect(dialects.find(([v]) => availD.has(v))?.[0] ?? "kuwaiti"); }, [availD, voiceover, dialect]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  // `fresh` = the separate tool «فيديو مبتكر من موقعك»: a new design drawn from scratch every time, with the website's pictures inside it
  const per15 = costPer15;
  const [useLogo, setUseLogo] = useState(true);
  const [useStyle, setUseStyle] = useState(true);
  const cost = Math.max(1, Math.round(seconds / 15)) * per15;
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);

  // fake progress while waiting (reading takes ~20-40 seconds, building the video a minute or two)
  useEffect(() => {
    if (!busy && !reading) return;
    setPct(3);
    const t = setInterval(() => setPct((p) => p + (95 - p) * 0.035), 600);
    return () => clearInterval(t);
  }, [busy, reading]);

  async function read(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSite(null); setReading(true);
    try {
      const r = await fetch("/api/site-video", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      setJobId(d.jobId);
      for (let i = 0; i < 120 && !stop.current; i++) {
        await new Promise((res) => setTimeout(res, 2000));
        const p = await (await fetch(`/api/site-video?job=${d.jobId}`)).json();
        if (p.status === "failed" || p.error) throw new Error(L(p.error || "ما قدرنا نقرأ الموقع."));
        if (p.status === "done") { setSite(p.site); setTopic(`فيديو يعرّف بموقع ${p.site.title || p.site.host}: ماذا يقدّم وخدماته ولمن`); setReading(false); return; }
      }
      throw new Error(L("القراءة تأخرت. جرّب مرة ثانية."));
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setReading(false); }
  }

  async function make() {
    if (!jobId) return;
    setBusy(true); setError(null);
    if (fresh) {
      try {
        const r = await fetch("/api/free-motion", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
          siteJob: jobId, useLogo, useStyle, idea: topic, seconds, aspect, dialect, voiceover, voice, music: withMusic, useIdentity: false }) });
        const d = await r.json();
        if (!r.ok) throw new Error(L(d.error));
        setPct(100);
        router.push(`/app/tools/site-free?fm=${d.jobId}`);
      } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
      return;
    }
    try {
      const r = await fetch("/api/lesson", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        siteJob: jobId, siteStyle: style, readShots: readImgs, shots: shots.map((x) => ({ path: x.path, bucket: x.bucket, label: x.label })), topic, seconds, aspect, dialect, voiceover, voice, tone, music: withMusic, brand: site?.title ?? "" }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/site-video?job=${d.jobId}`); // stays on this tool's own page (was: motion-video)
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{L(l)}</button>)}</div>
  );

  if (fresh && !ready) return <p className="card max-w-2xl p-5 text-[15px] text-muted">{L("هذي الأداة متوقفة مؤقتاً. جرّب بعدين.")}</p>;
  if (!site) {
    return (
      <form onSubmit={read} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
        <label className="flex flex-col gap-2"><span className="font-semibold">{L("رابط موقعك")}</span>
          <input dir="ltr" required value={url} onChange={(e) => setUrl(e.target.value)} className="field text-start" placeholder="example.com" inputMode="url" maxLength={300} disabled={reading} />
          <span className="text-[13px] text-subtle">{fresh ? L("أي موقع عام: مطعم، عقارات، مدرّب، متجر، شركة… شاهين يفتحه ويقرأه ويرسم لك فيديو إعلاني جديد من الصفر، ولقطات موقعك داخله.") : L("أي موقع عام: مطعم، عقارات، مدرّب، متجر، شركة… شاهين يفتحه ويقرأ صفحاته ويسوي فيديو يتصفّحه ويشرح اللي يقدّمه.")}</span></label>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}
        {reading ? <Progress value={pct} label={L("شاهين يفتح موقعك ويقرأه…")} /> : <button disabled={url.trim().length < 4} className="btn btn-gold py-3.5 text-[16px]">🔎 {L("اقرأ الموقع")}</button>}
        <p className="text-center text-[13px] text-subtle">{L("قراءة الموقع مجانية. الريش تنخصم بس لما تضغط «أنشئ الفيديو».")}</p>
      </form>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:p-6">
        <div className="mx-auto h-[360px] w-[170px] shrink-0 overflow-y-auto rounded-[26px] border-[6px] border-neutral-800 bg-white shadow-md" aria-label={L("معاينة الموقع")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={site.mobileUrl} alt="" className="block w-full" />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <h2 className="text-[20px] font-bold text-navy-900">{site.title || site.host}</h2>
          <p dir="ltr" className="text-start text-[13px] text-subtle">{site.host}</p>
          {site.desc && <p className="text-[14px] text-muted">{site.desc}</p>}
          {site.sections.length > 0 && <div className="flex flex-wrap gap-1.5">{site.sections.slice(0, 10).map((x, i) => <span key={i} className="rounded-full bg-navy-50 px-3 py-1 text-[12px] text-navy-800">{x}</span>)}</div>}
          <button type="button" onClick={() => { setSite(null); setJobId(null); }} className="mt-auto self-start text-[13px] text-navy-700 underline">{L("موقع ثاني")}</button>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); make(); }} className="card flex flex-col gap-5 p-5 sm:p-6">
        <label className="flex flex-col gap-2"><span className="font-semibold">{L("شنو تبي الفيديو يركّز عليه؟")}</span>
          <textarea required minLength={5} maxLength={800} rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} className="field" />
          {fresh && <span className="text-[13px] text-subtle">{L("اكتب وصفك بحرية: الفكرة، الأسلوب، الألوان، والرسالة. كل فيديو يطلع تصميم جديد مبني على وصفك ومحتوى موقعك.")}</span>}
          <span className="text-[13px] text-subtle">{L("شاهين يشرح الموقع من محتواه الفعلي (ما يخترع أسعار ولا خدمات). تقدر تضيف: ركّز على الخدمات، أو على العروض، أو على التواصل.")}</span></label>
        {!fresh && <>
        <PhotoPicker photos={shots} onChange={setShots} max={6} title="صفحات من داخل موقعك (لقطات شاشة)" hint="لو موقعك فيه صفحات ما تنفتح إلا بتسجيل دخول (لوحة تحكم، حجوزات، طلبات)، صوّرها بنفسك وارفعها هنا، واكتب تحت كل صورة وش هي. ما نطلب منك يوزر ولا كلمة سر أبداً." />
        {shots.length > 0 && <label className="flex items-start gap-3 rounded-2xl border border-line p-3"><input type="checkbox" checked={readImgs} onChange={(e) => setReadImgs(e.target.checked)} className="mt-1 h-5 w-5" /><span>{L("خلّ شاهين يقرأ محتوى الصور ويشرح ميزاتها")}<span className="block text-[13px] text-subtle">{L("يقرأ النص والأقسام الظاهرة بكل لقطة، ويتكلم عنها بالتعليق حتى لو ما كتبت وصف.")}</span></span></label>}
        </>}
        {fresh && hasStyle && <label className="flex items-start gap-2.5 text-[14px]"><input type="checkbox" checked={useStyle} onChange={(e) => setUseStyle(e.target.checked)} className="mt-1 size-4" /><span><span className="font-semibold">{L("صمّم بأسلوبي ✨")}</span><span className="block text-[13px] text-subtle">{L("شاهين يستلهم من وصف ذوقك وصورك المرجعية المحفوظة في «هويتي».")}</span></span></label>}
        {fresh && <label className="flex items-start gap-2.5"><input type="checkbox" checked={useLogo} onChange={(e) => setUseLogo(e.target.checked)} className="mt-1 size-4" /><span><span className="font-semibold">{L("حط شعاري بالفيديو")}</span><span className="block text-[13px] text-subtle">{L("شعارك المحفوظ في «هويتي» يظهر بالافتتاح والختام. إذا ما عندك شعار محفوظ ينكتب اسم الموقع بداله.")}</span></span></label>}
        <div className="flex flex-col gap-2"><span className="font-semibold">{L("المقاس")}</span>{chips(sizes, aspect, setAspect)}</div>
        <div className="flex flex-col gap-2"><span className="font-semibold">{L("المدة")}</span>{chips(lengths, seconds, setSeconds)}</div>
        {!fresh && <>
        <div className="flex flex-col gap-2">
          <span className="font-semibold">{L("الستايل")}</span>
          <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={style === "auto"} onClick={() => setStyle("auto")} className="chip">✨ {L("تلقائي (شاهين يختار الأنسب لموقعك)")}</button></div>
          <More label={L("اختر ستايل بنفسك (50 ستايل)")}>
            {SITE_GROUPS.map((g) => (
              <div key={g} className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-subtle">{L(g)}</span>
                <div className="flex flex-wrap gap-2">{SITE_STYLES.filter((x) => x.group === g).map((x) => (
                  <button key={x.id} type="button" aria-pressed={style === x.id} onClick={() => setStyle(x.id)} className="chip gap-2"><span aria-hidden className="inline-block h-4 w-4 rounded-full border border-black/10" style={{ background: SWATCH[x.bg] }} />{L(x.name)}</button>
                ))}</div>
              </div>
            ))}
          </More>
        </div>
        </>}
        <div className="flex flex-col gap-2"><span className="font-semibold">{L("اللهجة")}</span>{chips(voiceover && availD ? dialects.filter(([v]) => availD.has(v)) : dialects, dialect, setDialect)}</div>
        <label className="flex items-center gap-3"><input type="checkbox" checked={voiceover} onChange={(e) => setVoiceover(e.target.checked)} className="h-5 w-5" /><span>{L("تعليق صوتي يشرح")}</span></label>
        <More label={L("خيارات إضافية (الصوت، الموسيقى)")}>
          {voiceover && (
            <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
            <VoicePick voices={voices} value={voice} onChange={setVoice} />
              {!fresh && <div className="flex flex-col gap-1.5"><span className="text-[13px] text-subtle">{L("نبرة الصوت")}</span>{chips(TONES as readonly (readonly [string, string])[], tone, setTone)}</div>}
            </div>
          )}
        </More>
        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{error}</p>}
        {busy ? <Progress value={pct} label={fresh ? L("شاهين يجهّز الطلب…") : L("شاهين يكتب السيناريو ويركّب فيديو تصفّح موقعك…")} /> : <button disabled={topic.trim().length < 5 || balance < cost} className="btn btn-gold py-3.5 text-[16px]">🎬 {L("أنشئ الفيديو")} · {cost} {L("ريشة")}</button>}
        <p className="text-center text-[13px] text-subtle">{L("السعر يعتمد على المدة:")} {per15} {L("ريشة لكل 15 ثانية.")}</p>
        {balance < cost && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
        <p className="text-center text-[13px] text-subtle">{L("بعدها يفتح لك الاستوديو: تعدّل النصوص والألوان والصوت، وتغيّر اللي تبيه.")}</p>
      </form>
    </div>
  );
}
