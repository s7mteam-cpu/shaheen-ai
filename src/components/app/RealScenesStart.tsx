"use client";
import { GULF_DIALECTS, myDialect } from "@/lib/countries";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { IndustryPicker } from "@/components/app/IndustryPicker";
import { PhotoPicker, type Photo } from "@/components/app/PhotoPicker";
import { More } from "@/components/app/Collapse";
import { TONES, VOICE_AGES, voiceDialects } from "@/lib/voiceMatch";

const sizes = [["9:16", "📱 ريلز / تيك توك 9:16"], ["16:9", "▶️ يوتيوب 16:9"], ["1:1", "⬜ مربع 1:1"], ["4:5", "🖼️ طولي 4:5"]] as const;
const lengths = [[15, "15 ثانية"], [30, "30 ثانية"], [60, "دقيقة"]] as const;
const dialects: (readonly [string, string])[] = [...GULF_DIALECTS.map(([v, ar]) => [v, ar] as const), ["en", "English"]];

/** «مشاهد واقعية»: write the ad / the words, Shaheen reads them aloud over real stock footage that fits each sentence. */
export function RealScenesStart({ costPer15, balance, brand, voices = [] }: { costPer15: number; balance: number; brand?: string; voices?: { id: string; name: string; note?: string; dialects?: string[] }[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [mine, setMine] = useState(false);
  const [ai, setAi] = useState(false);
  const [spoken, setSpoken] = useState("");
  const [aspect, setAspect] = useState<string>("9:16");
  const [seconds, setSeconds] = useState(30);
  const [dialect, setDialect] = useState<string>("kuwaiti");
  useEffect(() => { setDialect(myDialect()); }, []);
  const [industry, setIndustry] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [voiceover, setVoiceover] = useState(true);
  const availD = voiceDialects(voices);
  useEffect(() => { if (voiceover && availD && !availD.has(dialect)) setDialect(dialects.find(([v]) => availD.has(v))?.[0] ?? "kuwaiti"); }, [availD, voiceover, dialect]);
  const [vgender, setVgender] = useState("");
  const [vage, setVage] = useState("");
  const [tone, setTone] = useState("auto");
  const [voice, setVoice] = useState("");
  const [withMusic, setWithMusic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const cost = Math.max(1, Math.round(seconds / 15)) * costPer15 * (ai ? 2 : 1); // same factor as the server
  useEffect(() => {
    if (!busy) return;
    setPct(2);
    const t = setInterval(() => setPct((p) => p + (95 - p) * 0.04), 500);
    return () => clearInterval(t);
  }, [busy]);

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{L(l)}</button>)}</div>
  );

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/lesson", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        tool: "real-scenes", source: ai ? "ai" : "stock", topic: mine ? `${text.trim()}${text.trim() ? "\n\n" : ""}الكلام الذي يُقرأ بالحرف:\n${spoken.trim()}` : text, notes: mine ? "اقرأ «الكلام الذي يُقرأ بالحرف» كتعليق صوتي بدون أي تغيير أو إضافة أو حذف، وقسّمه لجمل فقط، واختر لكل جملة مشهداً يناسبها. باقي النص وصف للمشاهد فقط ولا يُقرأ." : "", brand, industry, seconds, aspect, dialect,
        voiceover, voice, vgender, vage, tone, music: withMusic, photos: photos.map((p) => ({ path: p.path, bucket: p.bucket, label: p.label })) }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/real-scenes?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  const showVoice = voiceover && voices.length > 0;
  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("نوع اللقطات")}</span>
        <div className="flex flex-wrap gap-2">{([[false, "لقطات جاهزة (أرخص وأسرع)"], [true, "بالذكاء الاصطناعي (جودة أعلى، سعر ضعف)"]] as const).map(([v, l]) => <button key={String(v)} type="button" aria-pressed={ai === v} onClick={() => setAi(v)} className="chip">{L(l)}</button>)}</div>
        {ai && <span className="text-[13px] text-subtle">{L("كل مشهد يتولّد من جملته بالضبط، فياخذ وقت أطول (دقائق).")}</span>}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("الكلام اللي ينقال بالفيديو")}</span>
        <div className="flex flex-wrap gap-2">{([[false, "شاهين يأخذ الكلام من نصي"], [true, "أنا أكتب الكلام اللي ينقال"]] as const).map(([v, l]) => <button key={String(v)} type="button" aria-pressed={mine === v} onClick={() => setMine(v)} className="chip">{L(l)}</button>)}</div></div>
      <label className="flex flex-col gap-2"><span className="font-semibold">{mine ? L("وصف المشاهد (اختياري): شو تبي يبان بالفيديو؟") : L("اكتب نص الإعلان أو الفكرة")}</span>
        <textarea required={!mine} minLength={mine ? 0 : 5} maxLength={6000} rows={mine ? 4 : 6} value={text} onChange={(e) => setText(e.target.value)} className="field"
          placeholder={mine ? L("مثال: فندق فخم، قاعة تدريب، مصافحة مهنية. (تقدر تخليه فاضي وشاهين يختار اللقطات من كلامك)") : L("مثال: تدوّر على شقة تناسب عائلتك؟ في برج الأفق شقق جاهزة للسكن، إطلالة بحرية وموقف خاص. زورونا اليوم واحجز شقتك بدون مقدم.")} /></label>
      {mine && (
        <label className="flex flex-col gap-2"><span className="font-semibold">{L("الكلام اللي يقوله المعلّق (ينقرأ بالحرف)")}</span>
          <textarea required minLength={5} maxLength={2000} rows={5} value={spoken} onChange={(e) => setSpoken(e.target.value)} className="field" placeholder={L("اكتب الكلام اللي تبيه ينقال بالضبط، وشاهين ما يغيّر فيه شي.")} /></label>
      )}
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("مقاس الفيديو")}</span>{chips(sizes, aspect, setAspect)}
        <span className="text-[13px] text-subtle">{L("شاهين يقص اللقطات ويظبطها على المقاس اللي تختاره.")}</span></div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المدة")}</span>{chips(lengths, seconds, setSeconds)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("اللهجة")}</span>{chips(voiceover && availD ? dialects.filter(([v]) => availD.has(v)) : dialects, dialect, setDialect)}</div>
      <label className="flex items-center gap-3"><input type="checkbox" checked={voiceover} onChange={(e) => setVoiceover(e.target.checked)} className="h-5 w-5" /><span>{L("تعليق صوتي")}</span></label>
      {showVoice && (
        <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
          <span className="font-semibold">{L("🎙 الصوت")}</span>
          <div className="flex flex-col gap-1.5"><span className="text-[13px] text-subtle">{L("رجل أو امرأة")}</span>{chips([["", "أي صوت"], ["m", "رجل"], ["f", "امرأة"]] as readonly (readonly [string, string])[], vgender, setVgender)}</div>
          <div className="flex flex-col gap-1.5"><span className="text-[13px] text-subtle">{L("العمر")}</span>{chips([["", "أي عمر"], ...VOICE_AGES] as readonly (readonly [string, string])[], vage, setVage)}</div>
          <div className="flex flex-col gap-1.5"><span className="text-[13px] text-subtle">{L("نبرة الصوت")}</span>{chips(TONES as readonly (readonly [string, string])[], tone, setTone)}</div>
          <label className="flex flex-col gap-1.5"><span className="text-[13px] text-subtle">{L("أو اختر صوت بعينه")}</span>
            <select value={voice} onChange={(e) => setVoice(e.target.value)} className="field"><option value="">{L("تلقائي: الأنسب للهجة واختياراتك")}</option>
              {voices.filter((v) => !v.dialects?.length || v.dialects.includes("any") || v.dialects.includes(dialect) || (v.dialects.includes("gulf") && ["kuwaiti", "saudi", "emirati", "qatari", "bahraini", "omani"].includes(dialect))).map((v) => <option key={v.id} value={v.id}>{v.name}{v.note ? ` — ${v.note}` : ""}</option>)}</select></label>
        </div>
      )}
      <More label={L("خيارات إضافية (المجال، صورك أنت، الموسيقى)")}>
        <IndustryPicker value={industry} onChange={setIndustry} title={false} optional hint="مجالك (اختياري): يساعد شاهين يختار لقطات ونبرة تناسبك." />
        <PhotoPicker photos={photos} onChange={setPhotos} title="صورك أنت (منتج، مكان…)" hint="تنحط بين اللقطات الجاهزة." />
        <label className="flex items-center gap-3"><input type="checkbox" checked={withMusic} onChange={(e) => setWithMusic(e.target.checked)} className="h-5 w-5" /><span>{L("موسيقى خلفية")}</span></label>
      </More>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L("شاهين يكتب ويدوّر على اللقطات ويركّب الفيديو…")} /> : (
        <button disabled={(mine ? spoken.trim().length < 5 : text.trim().length < 5) || balance < cost} className="btn btn-gold py-3.5 text-[16px]">🎬 {L("أنشئ الفيديو")} · {cost} {L("ريشة")}</button>
      )}
      <p className="text-center text-[13px] text-subtle">{L("السعر يعتمد على المدة:")} {costPer15 * (ai ? 2 : 1)} {L("ريشة لكل 15 ثانية.")}</p>
      {balance < cost && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
      <p className="text-center text-[13px] text-subtle">{L("بعدها يفتح لك الاستوديو: تعدّل النصوص والألوان والصوت، وتغيّر اللي تبيه.")}</p>
    </form>
  );
}
