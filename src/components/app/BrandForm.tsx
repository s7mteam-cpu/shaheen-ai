"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveBrand } from "@/app/app/brand/actions";

export function BrandForm({ initial }: { initial: { business_name: string; logo_url: string | null; logo_preview: string | null; colors: string[] } }) {
  const [name, setName] = useState(initial.business_name);
  const [logo, setLogo] = useState(initial.logo_url);
  const [preview, setPreview] = useState(initial.logo_preview);
  const [colors, setColors] = useState(initial.colors.length ? initial.colors : ["#0B2A4A", "#C9A45C", "#FFFFFF"]);
  const [msg, setMsg] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "image", type: file.type, size: file.size, name: file.name }) });
    const d = await r.json();
    if (!r.ok) return setMsg(d.error);
    await createClient().storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
    setLogo(d.path); setPreview(URL.createObjectURL(file));
  }
  async function save() {
    const r = await saveBrand({ business_name: name, logo_url: logo, colors });
    setMsg(r.ok ? "تم الحفظ. بتنطبق هويتك على كل تصميم جديد." : "تعذّر الحفظ.");
  }

  return (
    <div className="card flex max-w-2xl flex-col gap-5 p-7">
      <div className="flex flex-col gap-2"><label htmlFor="bn" className="label">اسم النشاط</label><input id="bn" value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="مثال: مطعم الديرة" /></div>
      <div className="flex flex-col gap-2">
        <span className="label">الشعار</span>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-tint text-xs text-subtle">{preview ? <img src={preview} alt="شعارك" className="h-full w-full object-contain" /> : "بدون شعار"}</div>
          <label className="btn btn-outline cursor-pointer px-4 py-2.5 text-sm">رفع شعار<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} /></label>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="label">ألوان الهوية</span>
        <div className="flex flex-wrap gap-3">
          {colors.map((c, i) => (
            <label key={i} className="flex items-center gap-2 rounded-xl border border-field px-2 py-1.5">
              <input type="color" value={c} onChange={(e) => setColors(colors.map((x, j) => (j === i ? e.target.value : x)))} className="h-8 w-8 cursor-pointer border-0 bg-transparent" aria-label={`اللون ${i + 1}`} />
              <span dir="ltr" className="font-latin text-sm">{c}</span>
            </label>
          ))}
          {colors.length < 5 && <button type="button" onClick={() => setColors([...colors, "#999999"])} className="btn btn-outline px-3 text-sm">+ لون</button>}
        </div>
      </div>
      {msg && <p role="status" className="text-sm text-navy-700">{msg}</p>}
      <button type="button" onClick={save} className="btn btn-primary self-start px-6 py-3">حفظ الهوية</button>
    </div>
  );
}
