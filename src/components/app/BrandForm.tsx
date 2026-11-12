"use client";
import { L, LT } from "@/lib/i18n/ui";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resetBrand, saveBrand } from "@/app/app/brand/actions";

const FONTS = [["Cairo", "كايرو"], ["Tajawal", "تجوال"], ["Almarai", "المراعي"], ["Changa", "تشانغا"], ["Amiri", "أميري"]];

export function BrandForm({ initial }: { initial: { business_name: string; logo_url: string | null; logo_preview: string | null; colors: string[]; handle?: string | null; font?: string | null; website?: string | null; instagram?: string | null; refs?: { path: string; url: string }[] } }) {
  const [name, setName] = useState(initial.business_name);
  const [logo, setLogo] = useState(initial.logo_url);
  const [preview, setPreview] = useState(initial.logo_preview);
  const [colors, setColors] = useState(initial.colors.length ? initial.colors : ["#0B2A4A", "#C9A45C", "#FFFFFF"]);
  const [handle, setHandle] = useState(initial.handle ?? "");
  const [font, setFont] = useState(initial.font ?? "");
  const [msg, setMsg] = useState("");
  const [website, setWebsite] = useState(initial.website ?? "");
  const [instagram, setInstagram] = useState(initial.instagram ?? "");
  const [refs, setRefs] = useState(initial.refs ?? []);
  async function addRefs(files: FileList | null) {
    for (const file of Array.from(files ?? []).slice(0, 6 - refs.length)) {
      const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "image", type: file.type, size: file.size, name: file.name }) });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error); return; }
      await createClient().storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
      setRefs((x) => [...x, { path: d.path, url: URL.createObjectURL(file) }]);
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "image", type: file.type, size: file.size, name: file.name }) });
    const d = await r.json();
    if (!r.ok) return setMsg(d.error);
    await createClient().storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
    setLogo(d.path); setPreview(URL.createObjectURL(file));
  }
  const [confirmReset, setConfirmReset] = useState(false);
  async function reset() {
    const r = await resetBrand();
    setConfirmReset(false);
    if (!r.ok) { setMsg(L("تعذّر التصفير.")); return; }
    setName(""); setLogo(null); setPreview(null); setColors([]); setHandle(""); setFont(""); setWebsite(""); setInstagram(""); setRefs([]);
    setMsg(L("تم تصفير الهوية. التصاميم الجديدة بتكون بدون هوية لين تحفظ هوية جديدة."));
  }
  async function save() {
    const r = await saveBrand({ business_name: name, logo_url: logo, colors, handle, font, website, instagram, style_refs: refs.map((x) => x.path) });
    setMsg(r.ok ? L("تم الحفظ. بتنطبق هويتك على كل تصميم جديد.") : L("تعذّر الحفظ."));
  }

  return (
    <div className="card flex max-w-2xl flex-col gap-5 p-7">
      <div className="flex flex-col gap-2"><label htmlFor="bn" className="label">{L("اسم النشاط")}</label><input id="bn" value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder={L("مثال: مطعم الديرة")} /></div>
      <div className="flex flex-col gap-2">
        <span className="label">{L("الشعار")}</span>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-tint text-xs text-subtle">{preview ? <img src={preview} alt={L("شعارك")} className="h-full w-full object-contain" /> : L("بدون شعار")}</div>
          <label className="btn btn-outline cursor-pointer px-4 py-2.5 text-sm">{L("رفع شعار")}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} /></label>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="label">{L("ألوان الهوية")}</span>
        <div className="flex flex-wrap gap-3">
          {colors.map((c, i) => (
            <label key={i} className="flex items-center gap-2 rounded-xl border border-field px-2 py-1.5">
              <input type="color" value={c} onChange={(e) => setColors(colors.map((x, j) => (j === i ? e.target.value : x)))} className="h-8 w-8 cursor-pointer border-0 bg-transparent" aria-label={LT(`اللون ${i + 1}`, `Color ${i + 1}`)} />
              <span dir="ltr" className="font-latin text-sm">{c}</span>
            </label>
          ))}
          {colors.length < 5 && <button type="button" onClick={() => setColors([...colors, "#999999"])} className="btn btn-outline px-3 text-sm">{L("+ لون")}</button>}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <span className="label">{L("بيانات التواصل")}</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{L("موقعك الإلكتروني")}</span><input dir="ltr" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} className="field" placeholder="example.com" /></label>
          <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{L("حسابك على إنستغرام")}</span><input dir="ltr" value={instagram} onChange={(e) => setInstagram(e.target.value)} maxLength={120} className="field" placeholder="@yourbrand" /></label>
        </div>
        <label className="flex flex-col gap-1.5"><span className="text-[14px] font-semibold">{L("حسابك أو رقم التواصل")} <span className="font-normal text-subtle">{L("(يطلع بنهاية الفيديوهات والتصاميم)")}</span></span><input id="bh" value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={60} className="field" dir="auto" placeholder={L("مثال: @aldeira.kw أو 9999 9999")} /></label>
        <p className="text-[12px] text-subtle">{L("شاهين يقرا موقعك عشان يفهم نشاطك، ويحط حسابك بالتصاميم إذا ما كتبت رقم تواصل.")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="label">{L("خط الهوية")}</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!font} onClick={() => setFont("")} className="chip">{L("يختاره شاهين")}</button>
          {FONTS.map(([id, l]) => <button key={id} type="button" aria-pressed={font === id} onClick={() => setFont(id)} className="chip" style={{ fontFamily: id }}>{L(l)}</button>)}
        </div>
      </div>
      <div className="flex flex-col gap-4 rounded-2xl bg-tint p-4">
        <div><span className="label">{L("ستايلك المفضّل")}</span><p className="text-[13px] text-subtle">{L("شاهين يتعلّم منها أسلوبك، ويصمّم لك بنفس الإحساس.")}</p></div>
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold">{L("ارفع 3-6 صور من أحلى بوستاتك")} <span className="font-normal text-subtle">{L("(سكرين شوت من إنستغرام يكفي)")}</span></span>
          <div className="flex flex-wrap gap-2.5">
            {refs.map((r, i) => (
              <div key={r.path} className="relative h-20 w-16 overflow-hidden rounded-lg bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label={L("حذف")} onClick={() => setRefs(refs.filter((_, j) => j !== i))} className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] text-white">✕</button>
              </div>
            ))}
            {refs.length < 6 && <label className="grid h-20 w-16 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-field bg-white text-[22px] text-subtle">+<input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => addRefs(e.target.files)} /></label>}
          </div>
        </div>
      </div>
      {msg && <p role="status" className="text-sm text-navy-700">{L(msg)}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={save} className="btn btn-primary px-6 py-3">{L("حفظ الهوية")}</button>
        {!confirmReset ? (
          <button type="button" onClick={() => setConfirmReset(true)} className="text-[14px] font-semibold text-red-700 underline">{L("↺ تصفير الهوية")}</button>
        ) : (
          <div role="alertdialog" aria-label={L("تصفير الهوية")} className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-900">
            <span>{L("بينمسح الاسم والشعار والألوان وبيانات التواصل والصور، كأنك ما حطيت هوية. متأكد؟")}</span>
            <button type="button" onClick={reset} className="rounded-lg bg-red-700 px-3 py-1.5 font-bold text-white">{L("نعم، صفّرها")}</button>
            <button type="button" onClick={() => setConfirmReset(false)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold">{L("لا")}</button>
          </div>
        )}
      </div>
    </div>
  );
}
