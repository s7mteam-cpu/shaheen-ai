"use client";
import { useRef } from "react";
import { L } from "@/lib/i18n/ui";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** A dashed bar over the player: drag it to put the captions anywhere on the video. */
export function CaptionDrag({ x, y, onChange }: { x: number; y: number; onChange: (p: { x: number; y: number }) => void }) {
  const area = useRef<HTMLDivElement>(null);
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const down = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, x, y };
  };
  const move = (e: React.PointerEvent) => {
    const s = start.current, r = area.current?.getBoundingClientRect();
    if (!s || !r) return;
    onChange({ x: clamp(s.x + (e.clientX - s.px) / r.width, 0.1, 0.9), y: clamp(s.y + (e.clientY - s.py) / r.height, 0.06, 0.94) });
  };
  const up = () => { start.current = null; };
  return (
    <div ref={area} className="pointer-events-none absolute inset-0 z-10" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div role="slider" aria-label={L("مكان الترجمة")} aria-valuenow={Math.round(y * 100)} aria-valuetext={`${Math.round(x * 100)}% × ${Math.round(y * 100)}%`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up}
        className="pointer-events-auto absolute flex cursor-move touch-none items-center justify-center rounded-lg border-2 border-dashed border-gold-500 bg-black/20 text-[11px] font-bold text-white"
        style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: "80%", height: "9%", transform: "translate(-50%, -50%)" }}>
        ✋ {L("اسحب الترجمة")}
      </div>
    </div>
  );
}
