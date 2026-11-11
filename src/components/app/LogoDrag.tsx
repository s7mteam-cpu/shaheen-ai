"use client";
import { L } from "@/lib/i18n/ui";
import { useRef } from "react";

/** Logo placement as fractions of the frame: centre (x, y) and width w. */
export type LogoBox = { x: number; y: number; w: number };
export const DEFAULT_LOGO_BOX: LogoBox = { x: 0.85, y: 0.09, w: 0.18 };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * A draggable, resizable frame drawn over a live preview. Drag it to move the logo, pull the corner to resize.
 * The preview underneath draws the real logo, so this only shows the handles.
 */
export function LogoDrag({ box, onChange }: { box: LogoBox; onChange: (b: LogoBox) => void }) {
  const area = useRef<HTMLDivElement>(null);
  const start = useRef<{ px: number; py: number; b: LogoBox; mode: "move" | "size" } | null>(null);

  const down = (mode: "move" | "size") => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    start.current = { px: e.clientX, py: e.clientY, b: box, mode };
  };
  const move = (e: React.PointerEvent) => {
    const s = start.current, r = area.current?.getBoundingClientRect();
    if (!s || !r) return;
    const dx = (e.clientX - s.px) / r.width, dy = (e.clientY - s.py) / r.height;
    if (s.mode === "move") onChange({ ...s.b, x: clamp(s.b.x + dx, 0.03, 0.97), y: clamp(s.b.y + dy, 0.03, 0.97) });
    else onChange({ ...s.b, w: clamp(s.b.w + (dy - dx), 0.06, 0.7) });
  };
  const up = () => { start.current = null; };

  return (
    <div ref={area} className="pointer-events-none absolute inset-0 z-10" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div
        role="slider" aria-label={L("مكان الشعار")} aria-valuenow={Math.round(box.x * 100)} aria-valuetext={`${Math.round(box.x * 100)}% × ${Math.round(box.y * 100)}%`}
        onPointerDown={down("move")} onPointerMove={move} onPointerUp={up}
        className="pointer-events-auto absolute cursor-move touch-none rounded-md border-2 border-dashed border-gold-500 bg-white/5"
        style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, aspectRatio: "1 / 1", transform: "translate(-50%, -50%)" }}
      >
        <span onPointerDown={down("size")} onPointerMove={move} onPointerUp={up} aria-label={L("تكبير وتصغير الشعار")}
          className="absolute -bottom-2.5 -left-2.5 h-5 w-5 cursor-nesw-resize touch-none rounded-full border-2 border-white bg-gold-500 shadow" />
      </div>
    </div>
  );
}

/** Size slider + reset, shown under the logo controls. */
export function LogoSize({ box, onChange }: { box: LogoBox; onChange: (b: LogoBox) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[14px]">
      <label className="flex flex-1 items-center gap-2">{L("الحجم")}
        <input type="range" min={6} max={70} value={Math.round(box.w * 100)} onChange={(e) => onChange({ ...box, w: Number(e.target.value) / 100 })} className="flex-1 accent-navy-700" />
      </label>
      <span className="text-[13px] text-subtle">{L("اسحب الشعار بالمعاينة لتحريكه، واسحب الدائرة الصفرا لتكبيره.")}</span>
    </div>
  );
}
