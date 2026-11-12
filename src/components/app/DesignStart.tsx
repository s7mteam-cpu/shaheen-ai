"use client";
import { L, LT } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Progress } from "@/components/app/Progress";
import { createClient } from "@/lib/supabase/client";
import { DIcon } from "@/design/icons";
import { INDUSTRIES, industryById } from "@/design/industries";

const aspects = [["4:5", "بوست طولي 4:5"], ["1:1", "مربع 1:1"], ["9:16", "ستوري 9:16"]] as const;
const dialects = [["gulf", "خليجي أبيض"], ["kuwaiti", "كويتي"], ["msa", "فصحى"], ["same", "مثل ما كتبت"]] as const;
const COPY: Record<string, { label: string; ph: string; btn: string; wait: string }> = {
  post: { label: "اكتب كل معلومات البوست", btn: "صمّم البوست", wait: "شاهين يصمّم البوست…", ph: "مثال: ورشة تصوير منتجات بالجوال، الخميس 20 نوفمبر من 6 إلى 9 مساءً في الشويخ، المدربة سارة العلي، السعر 25 د.ك بدل 40، 12 مقعد فقط، تشمل شهادة. الحجز واتساب 9999 9999" },
  carousel: { label: "موضوع الكاروسيل ومعلوماته", btn: "صمّم الكاروسيل", wait: "شاهين يصمّم الشرائح…", ph: "مثال: 5 نصائح للعناية بالبشرة في الصيف من عيادتنا، ونختم بدعوة لحجز استشارة" },
  "ad-design": { label: "المنتج أو العرض ومعلوماته", btn: "صمّم الإعلانات", wait: "شاهين يصمّم الإعلانات…", ph: "مثال: عرض الويكند بمطعمنا، خصم 30% على المشاوي الجمعة والسبت، توصيل مجاني، للطلب 9999 9999" },
};

type Up = { path: string; preview: string };

async function uploadImage(file: File): Promise<Up> {
  const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "image", type: file.type, size: file.size, name: file.name }) });
  const d = await r.json();
  if (!r.ok) throw new Error(L(d.error));
  const { error } = await createClient().storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
  if (error) throw new Error(L("ما نجح رفع الصورة."));
  return { path: d.path, preview: URL.createObjectURL(file) };
}
export { uploadImage };

/** Step 1 of the design studio: the customer's information. */
export function DesignStart({ toolId, cost, balance, industry: savedIndustry }: { toolId: string; cost: number; balance: number; industry?: string | null }) {
  const router = useRouter();
  const copy = COPY[toolId] ?? COPY.post;
  const [info, setInfo] = useState("");
  const [industry, setIndustry] = useState(savedIndustry ?? "");
  const [pickOpen, setPickOpen] = useState(!savedIndustry);
  const ind = industryById(industry);
  const [count, setCount] = useState(toolId === "carousel" ? 5 : 2);
  const [aspect, setAspect] = useState("4:5");
  const [dialect, setDialect] = useState("gulf");
  const [photos, setPhotos] = useState<Up[]>([]);
  const [person, setPerson] = useState<Up | null>(null);
  const [useBrand, setUseBrand] = useState(true);
  const [aiImages, setAiImages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const total = (toolId === "post" ? 1 : count) * cost;
  useEffect(() => {
    if (!busy) return;
    setPct(2);
    const t = setInterval(() => setPct((p) => p + (95 - p) * 0.05), 500);
    return () => clearInterval(t);
  }, [busy]);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setError(null);
    try { for (const f of Array.from(files).slice(0, 6 - photos.length)) { const u = await uploadImage(f); setPhotos((p) => [...p, u]); } }
    catch (e) { setError((e as Error).message); } finally { setUploading(false); }
  }
  async function addPerson(f?: File) {
    if (!f) return;
    setUploading(true); setError(null);
    try { setPerson(await uploadImage(f)); } catch (e) { setError((e as Error).message); } finally { setUploading(false); }
  }

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/design/start", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool: toolId, info, count, aspect, dialect, photos: photos.map((p) => p.path), person: person?.path, useBrand, aiImages, industry }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      setPct(100);
      router.push(`/app/tools/${toolId}?job=${d.jobId}`);
    } catch (err) { setError((err as Error).message || L("صار خطأ.")); setBusy(false); }
  }

  const chips = <T extends string | number>(list: readonly (readonly [T, string])[], value: T, set: (v: T) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(([v, l]) => <button key={String(v)} type="button" aria-pressed={value === v} onClick={() => set(v)} className="chip">{L(l)}</button>)}</div>
  );
  const toggle = (on: boolean, set: (v: boolean) => void, label: string, hint: string) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-3.5">
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} className="mt-1 h-5 w-5 accent-navy-700" />
      <span><span className="block font-semibold text-navy-900">{L(label)}</span><span className="block text-[13px] text-subtle">{hint}</span></span>
    </label>
  );

  return (
    <form onSubmit={go} className="card flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{L("مجالك")}</span>
          {ind && !pickOpen && <button type="button" onClick={() => setPickOpen(true)} className="text-[14px] text-navy-700 underline">{L("تغيير")}</button>}
        </div>
        {ind && !pickOpen ? (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-tint px-4 py-3">
            <DIcon name={ind.icon} size={22} color="#0B2A4A" /><span className="font-semibold text-navy-900">{L(ind.label)}</span>
            <span className="flex flex-1 justify-end gap-1">{ind.palettes.map((p, i) => <span key={i} className="flex overflow-hidden rounded-full">{[p.bg, p.accent, p.ink].map((c) => <span key={c} className="h-5 w-3" style={{ background: c }} />)}</span>)}</span>
          </div>
        ) : (
          <div className="flex max-h-[340px] flex-col gap-3 overflow-y-auto rounded-2xl border border-line p-3">
            {[...new Set(INDUSTRIES.map((i) => i.group))].map((g) => (
              <div key={g} className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-subtle">{L(g)}</span>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.filter((i) => i.group === g).map((i) => (
                    <button key={i.id} type="button" aria-pressed={industry === i.id} onClick={() => { setIndustry(i.id); setPickOpen(false); }} className="chip inline-flex items-center gap-1.5">
                      <DIcon name={i.icon} size={16} color="currentColor" />{L(i.label)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <span className="text-[13px] text-subtle">{L("شاهين يصمّم بأسلوب يناسب مجالك: الألوان، التخطيط، الخط، ونوع الصور.")}</span>
      </div>
      <label className="flex flex-col gap-2"><span className="font-semibold">{L(copy.label)}</span>
        <textarea required minLength={5} maxLength={3000} rows={6} value={info} onChange={(e) => setInfo(e.target.value)} className="field" placeholder={ind && ind.id !== "other" ? LT(`مثال: ${L(ind.example)}`, `e.g. ${L(ind.example)}`) : L(copy.ph)} />
        <span className="text-[13px] text-subtle">{L("اكتب كل شي عندك، حتى لو كثير. شاهين يختار المهم للتصميم، والباقي يحطه بالكابشن.")}</span></label>

      {toolId === "carousel" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("عدد الشرائح")}</span>{chips([[3, "3"], [4, "4"], [5, "5"], [6, "6"], [7, "7"], [8, "8"], [10, "10"]] as const, count as never, setCount as never)}</div>}
      {toolId === "ad-design" && <div className="flex flex-col gap-2"><span className="font-semibold">{L("عدد التصاميم")}</span>{chips([[1, "1"], [2, "2"], [3, "3"], [4, "4"]] as const, count as never, setCount as never)}</div>}
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("المقاس")}</span>{chips(aspects, aspect, setAspect)}</div>
      <div className="flex flex-col gap-2"><span className="font-semibold">{L("لهجة النصوص")}</span>{chips(dialects, dialect, setDialect)}</div>

      <div className="flex flex-col gap-2">
        <span className="font-semibold">{L("صورك")} <span className="font-normal text-subtle">{L("(اختياري، حتى 6: منتج، مكان، طبق…)")}</span></span>
        <span className="text-[13px] text-subtle">{L("صوّرت منتجك بالجوال؟ ارفعه، وشاهين يحطه بمشهد إعلاني احترافي (عباية، عطر، علبة…) ويكتب وصفه.")}</span>
        <div className="flex flex-wrap gap-2.5">
          {photos.map((p, i) => (
            <div key={p.path} className="relative h-20 w-20 overflow-hidden rounded-xl bg-tint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-full w-full object-cover" />
              <button type="button" aria-label={L("حذف الصورة")} onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute left-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-[13px] text-white">✕</button>
            </div>
          ))}
          {photos.length < 6 && (
            <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-field text-[26px] text-subtle">+
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} /></label>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-semibold">{L("صورة شخص")} <span className="font-normal text-subtle">{L("(اختياري: المدرب، الدكتور، صاحب النشاط)")}</span></span>
        <div className="flex items-center gap-3">
          {person && (
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-tint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={person.preview} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <label className="btn btn-outline cursor-pointer px-4 py-2 text-sm">{person ? L("تغيير") : L("رفع صورة")}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => addPerson(e.target.files?.[0])} /></label>
          {person && <button type="button" onClick={() => setPerson(null)} className="text-sm text-red-700 underline">{L("حذف")}</button>}
        </div>
      </div>
      {uploading && <p className="text-[14px] text-subtle">{L("جاري رفع الصور…")}</p>}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {toggle(useBrand, setUseBrand, L("طبّق هويتي"), L("شعارك وألوانك وخطك وحسابك من «هويتي التجارية»."))}
        {toggle(aiImages, setAiImages, L("صور بالذكاء الاصطناعي"), L("إذا التصميم يحتاج صورة وما رفعت، شاهين يولّدها."))}
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-800">{L(error)}</p>}
      {busy ? <Progress value={pct} label={L(copy.wait)} /> : (
        <button disabled={info.trim().length < 5 || balance < total || uploading} className="btn btn-gold py-3.5 text-[16px]">✨ {L(copy.btn)} ({total} {L("ريشة")})</button>
      )}
      {balance < total && <p className="text-center text-[14px] text-red-700">{L("رصيدك ما يكفي.")} <a href="/app/subscribe" className="underline">{L("زوّد رصيدك")}</a></p>}
      <p className="text-center text-[13px] text-subtle">{L("بعدها تعدّل النصوص والألوان والخط والصور مجاناً وتشوف التغيير مباشرة.")}</p>
    </form>
  );
}
