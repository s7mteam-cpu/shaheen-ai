"use client";
import { L, LT } from "@/lib/i18n/ui";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Music } from "@/remotion/montage";

const AUDIO_EXT: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", webm: "audio/webm", flac: "audio/flac", caf: "audio/x-caf" };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}${s % 1 >= 0.05 ? `.${Math.floor((s % 1) * 10)}` : ""}`;
const FADES = [0, 0.5, 1, 2, 3];

/** Reads the length of an audio file / URL in the browser. */
function audioLength(src: string): Promise<number | null> {
  return new Promise((res) => {
    const a = new Audio();
    a.preload = "metadata";
    const done = (v: number | null) => { a.src = ""; res(v); };
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    a.src = src;
  });
}

/**
 * Upload a sound from the phone + trim it, place it on the timeline, set volume and fades.
 * `total` = full video length in seconds; `playhead` = where the preview player is now (seconds).
 */
export function MusicEditor({ music, onChange, total, playhead, disabled }: { music: Music | null | undefined; onChange: (m: Music | null) => void; total: number; playhead: () => number; disabled?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const preview = useRef<HTMLAudioElement | null>(null);

  // learn the file length for tracks picked before this editor existed
  useEffect(() => {
    if (music?.url && music.dur == null) audioLength(music.url).then((d) => { if (d) onChange({ ...music, dur: +d.toFixed(2) }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [music?.url]);
  useEffect(() => () => preview.current?.pause(), []);

  async function upload(file: File) {
    setUploading(true); setErr(null);
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const type = file.type && file.type.startsWith("audio/") ? file.type : AUDIO_EXT[ext] || (/^video\/(mp4|quicktime)$/.test(file.type) || ext === "mp4" || ext === "mov" ? "audio/mp4" : "");
      if (!type) throw new Error(L("هذا الملف مو صوت. اختر ملف mp3 أو m4a أو wav."));
      const dur = await audioLength(URL.createObjectURL(file));
      const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "audio", type, size: file.size, name: file.name }) });
      const d = await r.json();
      if (!r.ok) throw new Error(L(d.error));
      const supabase = createClient();
      const up = await supabase.storage.from("uploads").uploadToSignedUrl(d.path, d.token, file, { contentType: type });
      if (up.error) throw new Error(L("تعذّر رفع الصوت."));
      const signed = await supabase.storage.from("uploads").createSignedUrl(d.path, 60 * 60 * 6);
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 60) || L("صوت من جوالي");
      const len = dur ? +dur.toFixed(2) : null;
      onChange({ url: signed.data?.signedUrl ?? "", name, path: d.path, bucket: "uploads", own: true, dur: len, start: 0, end: len, at: 0, volume: 0.6, fadeIn: 0, fadeOut: len && len > total ? 1 : 0 });
    } catch (e) { setErr((e as Error).message || L("تعذّر رفع الصوت.")); } finally { setUploading(false); }
  }

  const m = music;
  const dur = m?.dur ?? null;
  const start = m?.start ?? 0;
  const end = m?.end ?? dur ?? null;
  const set = (p: Partial<Music>) => m && onChange({ ...m, ...p });
  const clip = end != null ? Math.max(0, end - start) : null;
  const plays = clip != null ? Math.min(clip, Math.max(0, total - (m?.at ?? 0))) : Math.max(0, total - (m?.at ?? 0));

  function listen() {
    if (!m) return;
    if (playing) { preview.current?.pause(); setPlaying(false); return; }
    const a = preview.current ?? new Audio();
    preview.current = a;
    a.src = m.url; a.currentTime = start; a.volume = Math.min(1, m.volume ?? 0.6);
    a.ontimeupdate = () => { if (end != null && a.currentTime >= end) { a.pause(); setPlaying(false); } };
    a.onended = () => setPlaying(false);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  return (
    <div className="flex flex-col gap-4">
      <label className={`btn btn-outline self-start px-5 py-2.5 ${uploading || disabled ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
        {uploading ? L("جاري رفع الصوت…") : L("📱 ارفع صوت من جوالك")}
        <input type="file" accept="audio/*,video/mp4,video/quicktime,.mp3,.m4a,.wav,.aac,.ogg,.opus,.flac,.mp4,.mov" className="sr-only" disabled={uploading || disabled} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </label>
      <p className="text-[12px] leading-6 text-subtle">
        {L("mp3 أو m4a أو wav (أو فيديو من جوالك وناخذ صوته)، لين 25 ميجا. تبي موسيقى مجانية للاستخدام التجاري؟ حمّلها من")}{" "}
        <a href="https://pixabay.com/music/" target="_blank" rel="noopener noreferrer" className="underline">Pixabay Music</a>{" "}{L("أو")}{" "}
        <a href="https://studio.youtube.com/" target="_blank" rel="noopener noreferrer" className="underline">{L("مكتبة يوتيوب الصوتية")}</a>{" "}
        {L("وارفعها هني. تأكد إن عندك حق استخدام أي صوت ترفعه.")}
      </p>
      {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-[13px] text-red-800">{err}</p>}

      {m && (
        <div className="flex flex-col gap-4 rounded-2xl border border-gold-500/50 bg-gold-500/5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex-1 font-semibold">{m.own ? "📱 " : "🎵 "}{L(m.name)}{dur ? <span className="ms-2 text-[12px] font-normal text-subtle" dir="ltr">{mmss(dur)}</span> : null}</span>
            <button type="button" onClick={listen} className="rounded-lg bg-navy-800 px-3.5 py-1.5 text-[14px] font-semibold text-white">{playing ? L("⏸ وقف") : L("▶️ اسمع المقطع")}</button>
            <button type="button" onClick={() => { preview.current?.pause(); setPlaying(false); onChange(null); }} className="text-[13px] text-red-700 underline">{L("إزالة")}</button>
          </div>

          {dur ? (
            <>
              <Range label={L("✂️ بداية المقطع من الملف")} value={start} min={0} max={dur} onChange={(v) => set({ start: Math.min(v, Math.max(0, (end ?? dur) - 0.5)) })} />
              <Range label={L("✂️ نهاية المقطع من الملف")} value={end ?? dur} min={0} max={dur} onChange={(v) => set({ end: Math.max(v, Math.min(dur, start + 0.5)) })} />
            </>
          ) : <p className="text-[12px] text-subtle">{L("جاري قراءة طول الملف…")}</p>}

          <div className="flex flex-col gap-1.5">
            <Range label={L("📍 يبدأ في الفيديو عند")} value={m.at ?? 0} min={0} max={Math.max(0, total - 0.5)} onChange={(v) => set({ at: v })} />
            <button type="button" onClick={() => set({ at: +Math.max(0, Math.min(total - 0.5, playhead())).toFixed(1) })} className="self-start text-[13px] font-semibold text-navy-800 underline">{L("خلّه يبدأ من مكان المؤشر الحين")}</button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-subtle">{L("🔊 علو الصوت")}</span>
              <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" checked={m.volume == null} onChange={(e) => set({ volume: e.target.checked ? null : 0.5 })} />{L("تلقائي (يوطى تحت الكلام)")}</label>
            </div>
            {m.volume != null && <input type="range" dir="ltr" min={0} max={1} step={0.05} value={m.volume} onChange={(e) => set({ volume: +e.target.value })} aria-label={L("علو الصوت")} />}
            {m.volume != null && <span className="text-[12px] text-subtle">{Math.round(m.volume * 100)}%</span>}
          </div>

          <div className="flex flex-wrap gap-4">
            <Fade label={L("ظهور تدريجي")} value={m.fadeIn ?? 0} onChange={(v) => set({ fadeIn: v })} />
            <Fade label={L("اختفاء تدريجي")} value={m.fadeOut ?? 0} onChange={(v) => set({ fadeOut: v })} />
          </div>

          <p className="text-[12px] text-subtle">
            {LT(`يشتغل ${mmss(plays)} من الفيديو (من ${mmss(m.at ?? 0)} إلى ${mmss((m.at ?? 0) + plays)}).`, `Plays for ${mmss(plays)} (from ${mmss(m.at ?? 0)} to ${mmss((m.at ?? 0) + plays)}).`)}
          </p>
        </div>
      )}
    </div>
  );
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-[13px] font-semibold text-subtle"><span>{label}</span><span dir="ltr" className="font-mono">{mmss(value)}</span></span>
      <input type="range" dir="ltr" min={min} max={Math.max(min, max)} step={0.1} value={Math.min(Math.max(value, min), Math.max(min, max))} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

function Fade({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="font-semibold text-subtle">{label}</span>
      <select value={value} onChange={(e) => onChange(+e.target.value)} className="field !w-auto !py-1.5">
        {FADES.map((f) => <option key={f} value={f}>{f === 0 ? L("بدون") : LT(`${f} ث`, `${f}s`)}</option>)}
      </select>
    </label>
  );
}
