"use client";
import { useState } from "react";
import { ARAB_DIALECTS } from "@/lib/countries";
import { TONES, VOICE_AGES } from "@/lib/voiceMatch";

type Preview = { id: string; audio: string };

/** Describe a voice (dialect, gender, age, tone), listen to 3 versions, keep the one you like. */
export function VoiceDesigner() {
  const [dialect, setDialect] = useState("egyptian");
  const [gender, setGender] = useState("f");
  const [age, setAge] = useState("adult");
  const [tone, setTone] = useState("energetic");
  const [extra, setExtra] = useState("");
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [prev, setPrev] = useState<Preview[]>([]);
  const body = { dialect, gender, age, tone, extra, text };

  async function go(action: "design" | "save", generated_id?: string) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/voice-design", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, action, generated_id, name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "صار خطأ.");
      if (action === "design") setPrev(d.previews);
      else { setMsg("انحفظ الصوت وانضاف لقائمة الأصوات. يطلع للعملاء حسب اللهجة والجنس."); setPrev([]); }
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }
  const chip = (on: boolean) => `chip ${on ? "" : ""}`;
  return (
    <div className="card flex max-w-2xl flex-col gap-4 p-5">
      <div className="flex flex-col gap-2"><span className="font-semibold">اللهجة</span><div className="flex flex-wrap gap-2">{ARAB_DIALECTS.map(([v, ar]) => <button key={v} type="button" aria-pressed={dialect === v} onClick={() => setDialect(v)} className={chip(dialect === v)}>{ar}</button>)}</div></div>
      <div className="flex flex-col gap-2"><span className="font-semibold">رجل أو امرأة</span><div className="flex gap-2">{[["m", "رجل"], ["f", "امرأة"]].map(([v, l]) => <button key={v} type="button" aria-pressed={gender === v} onClick={() => setGender(v)} className="chip">{l}</button>)}</div></div>
      <div className="flex flex-col gap-2"><span className="font-semibold">العمر</span><div className="flex flex-wrap gap-2">{VOICE_AGES.map(([v, l]) => <button key={v} type="button" aria-pressed={age === v} onClick={() => setAge(v)} className="chip">{l}</button>)}</div></div>
      <div className="flex flex-col gap-2"><span className="font-semibold">النبرة</span><div className="flex flex-wrap gap-2">{TONES.filter(([v]) => v !== "auto").map(([v, l]) => <button key={v} type="button" aria-pressed={tone === v} onClick={() => setTone(v)} className="chip">{l}</button>)}</div></div>
      <label className="flex flex-col gap-2"><span className="font-semibold">وصف إضافي (اختياري، بالإنجليزي أفضل)</span><input value={extra} onChange={(e) => setExtra(e.target.value)} className="field" placeholder="e.g. smooth radio-presenter voice, slightly husky" /></label>
      <label className="flex flex-col gap-2"><span className="font-semibold">نص تجريبي بهاللهجة (اختياري، 100 حرف أو أكثر)</span><textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="field" placeholder="اكتب جملة بنفس اللهجة عشان يسمعها الصوت…" /></label>
      <button type="button" disabled={busy} onClick={() => go("design")} className="btn btn-gold py-3">{busy ? "جاري التصميم…" : "🎙 صمّم الصوت (3 نسخ)"}</button>
      {msg && <p className="rounded-xl bg-tint px-4 py-3 text-[14px]">{msg}</p>}
      {prev.length > 0 && (
        <div className="flex flex-col gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="اسم الصوت، مثال: سارة مصرية متحمسة" />
          {prev.map((p, i) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3">
              <span className="font-semibold">النسخة {i + 1}</span>
              <audio controls src={`data:audio/mpeg;base64,${p.audio}`} className="max-w-full" />
              <button type="button" disabled={busy} onClick={() => go("save", p.id)} className="btn btn-primary ms-auto px-4 py-2 text-[14px]">احفظ هذا الصوت</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
