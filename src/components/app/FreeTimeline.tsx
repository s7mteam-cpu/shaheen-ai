"use client";
import { L } from "@/lib/i18n/ui";
import { useRef, useState } from "react";

export type Trim = { start: number; end: number };

/** Drag helper: calls onMove(deltaSeconds) while the pointer is down on the element. */
function useDrag(pps: number, onMove: (dSec: number) => void, onEnd?: () => void) {
  const st = useRef<{ x: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); st.current = { x: e.clientX }; },
    onPointerMove: (e: React.PointerEvent) => { if (!st.current) return; const d = (e.clientX - st.current.x) / pps; st.current.x = e.clientX; onMove(d); },
    onPointerUp: () => { st.current = null; onEnd?.(); },
  };
}

/**
 * The studio timeline: ruler + video (with start/end handles) + voice + music + the customer's own sound (drag to move).
 * Always drawn left-to-right like every video editor.
 */
export function FreeTimeline({ total, playhead, trim, onTrim, voice, music, own, onOwnMove, onSeek, disabled }: {
  total: number; playhead: number; trim: Trim; onTrim: (t: Trim) => void;
  voice: { at: number; dur: number } | null; music: boolean; own: { at: number; len: number; name: string } | null;
  onOwnMove: (at: number) => void; onSeek: (sec: number) => void; disabled?: boolean;
}) {
  const [zoom, setZoom] = useState(16); // pixels per second
  const pps = zoom;
  const W = Math.max(200, Math.round(total * pps));
  const tr = useRef(trim); tr.current = trim;
  const ownAt = useRef(own?.at ?? 0); ownAt.current = own?.at ?? 0;
  const MIN = 2;
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const dStart = useDrag(pps, (d) => onTrim({ start: clamp(tr.current.start + d, 0, tr.current.end - MIN), end: tr.current.end }));
  const dEnd = useDrag(pps, (d) => onTrim({ start: tr.current.start, end: clamp(tr.current.end + d, tr.current.start + MIN, total) }));
  const dOwn = useDrag(pps, (d) => own && onOwnMove(clamp(ownAt.current + d, 0, Math.max(0, total - 0.5))));
  const ticks: number[] = []; const step = total > 90 ? 10 : total > 30 ? 5 : 2;
  for (let t = 0; t <= total; t += step) ticks.push(t);
  const x = (s: number) => s * pps;
  const bar = "absolute top-1 h-6 rounded-md text-[11px] leading-6 px-2 overflow-hidden whitespace-nowrap";
  const row = "relative h-8 border-t border-line/60";
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  return (
    <div dir="ltr" className="w-full max-w-[560px] rounded-2xl border border-line bg-white p-3 text-navy-900">
      <div className="mb-2 flex items-center justify-between text-[12px] text-subtle">
        <span>{L("الخط الزمني")} · {L("المقطع")}: {fmt(trim.start)} → {fmt(trim.end)} ({(trim.end - trim.start).toFixed(1)}s)</span>
        <label className="flex items-center gap-2">{L("تكبير")}<input type="range" min={6} max={60} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-24 accent-navy-700" aria-label={L("تكبير")} /></label>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="relative select-none" style={{ width: W }}>
          <div className="relative h-5 cursor-pointer" onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); onSeek(clamp((e.clientX - r.left) / pps, 0, total)); }}>
            {ticks.map((t) => <span key={t} className="absolute top-0 text-[10px] text-subtle" style={{ left: x(t) }}>{fmt(t)}</span>)}
          </div>
          <div className={row} title={L("الفيديو")}>
            <div className={`${bar} bg-navy-700/15 text-navy-900`} style={{ left: 0, width: x(total) }}>{L("🎬 الفيديو")}</div>
            <div className="absolute top-1 h-6 rounded-md bg-gold-400/70" style={{ left: x(trim.start), width: x(trim.end - trim.start) }} />
            <div {...(disabled ? {} : dStart)} className={`absolute top-0 h-8 w-3 cursor-ew-resize rounded-sm bg-gold-600 ${disabled ? "opacity-40" : ""}`} style={{ left: x(trim.start) - 6, touchAction: "none" }} aria-label={L("بداية المقطع")} />
            <div {...(disabled ? {} : dEnd)} className={`absolute top-0 h-8 w-3 cursor-ew-resize rounded-sm bg-gold-600 ${disabled ? "opacity-40" : ""}`} style={{ left: x(trim.end) - 6, touchAction: "none" }} aria-label={L("نهاية المقطع")} />
          </div>
          {voice && <div className={row}><div className={`${bar} bg-emerald-200 text-emerald-900`} style={{ left: x(voice.at), width: x(voice.dur) }}>{L("🎙️ التعليق")}</div></div>}
          {music && <div className={row}><div className={`${bar} bg-sky-200 text-sky-900`} style={{ left: 0, width: x(total) }}>{L("🎵 الموسيقى")}</div></div>}
          {own && <div className={row}><div {...(disabled ? {} : dOwn)} className={`${bar} cursor-grab bg-violet-200 text-violet-900`} style={{ left: x(own.at), width: Math.max(30, x(own.len)), touchAction: "none" }}>{"🎧 "}{own.name}</div></div>}
          <div className="pointer-events-none absolute top-0 h-full w-px bg-red-500" style={{ left: x(playhead) }} />
        </div>
      </div>
      <p className="mt-1 text-[12px] text-subtle">{L("اسحب المقبضين الذهبيين لقص بداية الفيديو ونهايته. التصدير يطلع المقطع المحدد فقط.")}</p>
    </div>
  );
}
