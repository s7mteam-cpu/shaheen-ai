"use client";
import { L, LT } from "@/lib/i18n/ui";
import { useState } from "react";
import { detectBeats } from "@/lib/beats";
import { BEAT_FX, GRAIN_LEVELS, STICKER_FX, type MontageSpec, type Sticker, type StickerId } from "@/remotion/montage";

type Set = (f: (s: MontageSpec) => MontageSpec) => void;

const SPOTS: [number, number, string][] = [
  [0.75, 0.2, "فوق يمين"], [0.5, 0.2, "فوق"], [0.25, 0.2, "فوق يسار"],
  [0.75, 0.5, "يمين"], [0.5, 0.5, "بالوسط"], [0.25, 0.5, "يسار"],
  [0.75, 0.78, "تحت يمين"], [0.5, 0.78, "تحت"], [0.25, 0.78, "تحت يسار"],
];
const ICON: Record<StickerId, string> = { arrow: "↙️", circle: "⭕", underline: "〰️", new: "🆕", sale: "🏷️", hot: "🔥", like: "❤️", follow: "➕", star: "⭐", check: "✅", click: "👆", sparkles: "✨" };
const TEXTED: StickerId[] = ["new", "sale", "hot", "follow"];
const spotOf = (s: Sticker) => SPOTS.reduce((b, p, i) => (Math.hypot(p[0] - s.x, p[1] - s.y) < Math.hypot(SPOTS[b][0] - s.x, SPOTS[b][1] - s.y) ? i : b), 0);

/** Animated stickers: pick one → it appears where the player is paused; choose the spot, size and text. */
export function StickerPanel({ spec, setSpec, nowAt }: { spec: MontageSpec; setSpec: Set; nowAt: () => number }) {
  const list = spec.stickers ?? [];
  const upd = (i: number, p: Partial<Sticker>) => setSpec((s) => ({ ...s, stickers: (s.stickers ?? []).map((x, j) => (j === i ? { ...x, ...p } : x)) }));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-subtle">{L("وقّف الفيديو عند اللحظة اللي تبيها، واضغط على ستيكر لإضافته.")}</p>
      <div className="flex flex-wrap gap-1.5">
        {STICKER_FX.map(([id, label]) => (
          <button key={id} type="button" className="chip" onClick={() => setSpec((s) => ({ ...s, stickers: [...(s.stickers ?? []), { id, at: +nowAt().toFixed(2), dur: 2, x: id === "follow" ? 0.5 : 0.5, y: id === "follow" ? 0.78 : 0.5, size: 1 }].sort((a, b) => a.at - b.at).slice(0, 16) }))}>
            <span aria-hidden>{ICON[id]}</span> {L(label)}
          </button>
        ))}
      </div>
      {list.length > 0 && (
        <ul className="flex flex-col gap-2">
          {list.map((st, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-[13px]">
              <span className="font-semibold">{ICON[st.id]} {L(STICKER_FX.find((x) => x[0] === st.id)?.[1] ?? "")}</span>
              <span className="text-subtle" dir="ltr">{st.at.toFixed(1)}s</span>
              <select aria-label={L("المكان")} value={spotOf(st)} onChange={(e) => { const p = SPOTS[+e.target.value]; upd(i, { x: p[0], y: p[1] }); }} className="field !w-auto !py-1 text-[13px]">
                {SPOTS.map((p, k) => <option key={k} value={k}>{L(p[2])}</option>)}
              </select>
              <select aria-label={L("الحجم")} value={st.size ?? 1} onChange={(e) => upd(i, { size: +e.target.value })} className="field !w-auto !py-1 text-[13px]">
                <option value={0.7}>{L("صغير")}</option><option value={1}>{L("وسط")}</option><option value={1.4}>{L("كبير")}</option>
              </select>
              <select aria-label={L("المدة")} value={st.dur} onChange={(e) => upd(i, { dur: +e.target.value })} className="field !w-auto !py-1 text-[13px]">
                {[1, 1.5, 2, 3, 4].map((d) => <option key={d} value={d}>{LT(`${d} ث`, `${d}s`)}</option>)}
              </select>
              {TEXTED.includes(st.id) && <input value={st.text ?? ""} maxLength={24} onChange={(e) => upd(i, { text: e.target.value || undefined })} placeholder={L("النص (اختياري)")} className="field !w-36 !py-1 text-[13px]" />}
              <button type="button" onClick={() => setSpec((s) => ({ ...s, stickers: (s.stickers ?? []).filter((_, j) => j !== i) }))} aria-label={L("حذف")} className="ms-auto rounded-full px-2 text-red-700 hover:bg-red-50">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GrainPicker({ spec, setSpec }: { spec: MontageSpec; setSpec: Set }) {
  return (
    <div className="flex flex-wrap gap-2">
      {GRAIN_LEVELS.map(([v, l]) => <button key={v} type="button" aria-pressed={(spec.grain ?? 0) === v} onClick={() => setSpec((s) => ({ ...s, grain: v }))} className="chip">{L(l)}</button>)}
    </div>
  );
}

/** Beat sync: reads the music's rhythm in the browser, then pulses / flashes / shakes the video on every beat. */
export function BeatPanel({ spec, setSpec, total }: { spec: MontageSpec; setSpec: Set; total: number }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const mu = spec.music;
  async function sync(fx = spec.beatFx && spec.beatFx !== "none" ? spec.beatFx : "pulse") {
    if (!mu?.url) return;
    setBusy(true); setErr(null);
    try {
      const r = await detectBeats(mu.url, mu.start ?? 0, mu.end ?? null);
      const at = mu.at ?? 0, start = mu.start ?? 0;
      const beats = r.beats.map((b) => +(at + (b - start)).toFixed(3)).filter((t) => t >= at && t < total);
      if (!beats.length) throw new Error(L("ما لقينا إيقاع واضح بهالموسيقى."));
      setBpm(r.bpm);
      setSpec((s) => ({ ...s, beats, beatFx: fx }));
    } catch (e) { setErr((e as Error).message && (e as Error).message !== "download" ? (e as Error).message : L("ما قدرنا نقرأ الموسيقى. جرّب ترفعها من جوالك.")); } finally { setBusy(false); }
  }
  if (!mu?.url) return <p className="text-[13px] text-subtle">{L("اختر موسيقى أو ارفعها أول (من كرت «موسيقى خلفية»)، بعدين زامن الفيديو مع إيقاعها.")}</p>;
  const n = spec.beats?.length ?? 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {BEAT_FX.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={(spec.beatFx ?? "none") === v} className="chip"
            onClick={() => (v === "none" ? setSpec((s) => ({ ...s, beatFx: "none" })) : n ? setSpec((s) => ({ ...s, beatFx: v })) : sync(v))}>{L(l)}</button>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={() => sync()} className="btn btn-outline self-start px-4 py-2 text-sm">{busy ? L("جاري قراءة الإيقاع…") : n ? L("🥁 أعد قراءة الإيقاع") : L("🥁 زامن مع الإيقاع")}</button>
      {n > 0 && <p className="text-[12px] text-subtle">{LT(`لقينا ${n} ضربة${bpm ? ` (${bpm} BPM)` : ""}. إذا غيّرت الموسيقى أو قصّها، اضغط «أعد قراءة الإيقاع».`, `Found ${n} beats${bpm ? ` (${bpm} BPM)` : ""}. If you change or trim the music, tap “Read the beat again”.`)}</p>}
      {err && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[13px] text-red-800">{err}</p>}
    </div>
  );
}

type Photo = { id: number; thumb: string; full: string; by: string; alt: string };

/** Free stock photos (Pixabay / Pexels) — saved to our storage and shown at the paused moment. */
export function StockSearch({ jobId, onAdd, disabled }: { jobId: string; onAdd: (p: { path: string; url: string; credit: string }) => void; disabled?: boolean }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Photo[] | null>(null);
  const [src, setSrc] = useState("Pixabay");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function post<T>(action: string, body: object): Promise<T | null> {
    setBusy(action); setErr(null);
    try {
      const r = await fetch(`/api/montage/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jobId, ...body }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      return d as T;
    } catch (e) { setErr((e as Error).message || L("صار خطأ، حاول مرة ثانية.")); return null; } finally { setBusy(null); }
  }
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-tint p-3">
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const d = await post<{ photos: Photo[]; source?: string }>("stock", { q }); if (d) { setRes(d.photos); if (d.source) setSrc(d.source); } }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} className="field flex-1" placeholder={L("🔎 دوّر صور مجانية: قهوة، بحر، سيارة…")} />
        <button type="submit" disabled={q.trim().length < 2 || !!busy || disabled} className="btn btn-primary px-4 py-2 text-sm">{busy === "stock" ? L("جاري…") : L("دوّر")}</button>
      </form>
      {err && <p role="alert" className="text-[13px] text-red-800">{err}</p>}
      {res && (res.length ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {res.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={!!busy} title={p.alt} className="group relative block w-full overflow-hidden rounded-lg border border-line"
                onClick={async () => { const d = await post<{ path: string; url: string }>("stockadd", { url: p.full }); if (d) onAdd({ ...d, credit: p.by }); }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt={p.alt} className="aspect-[3/4] w-full object-cover" loading="lazy" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 text-[10px] text-white" dir="ltr">📷 {p.by}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-[13px] text-subtle">{L("ما لقينا صور. جرّب كلمة ثانية.")}</p>)}
      {busy === "stockadd" && <p className="text-[13px] text-subtle">{L("جاري إضافة الصورة…")}</p>}
      <p className="text-[11px] text-subtle">{LT(`الصور من ${src} ومجانية للاستخدام التجاري.`, `Photos from ${src}, free for commercial use.`)}</p>
    </div>
  );
}
