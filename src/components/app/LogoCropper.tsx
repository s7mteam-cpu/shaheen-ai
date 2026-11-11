"use client";
import { L } from "@/lib/i18n/ui";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

type R = { x: number; y: number; w: number; h: number }; // fractions of the image
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Finds the logo inside empty margins (transparent, or the plain colour of the corners). */
function autoTrim(im: HTMLImageElement): R | null {
  const W = im.naturalWidth, H = im.naturalHeight;
  const k = Math.min(1, 600 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * k)), h = Math.max(1, Math.round(H * k));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); if (!g) return null;
  g.drawImage(im, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const at = (x: number, y: number) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
  const bg = at(0, 0);
  const empty = (p: number[]) => p[3] < 20 || (bg[3] > 200 && Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) < 40);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!empty(at(x, y))) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const pad = 0.02;
  return { x: clamp(x0 / w - pad, 0, 1), y: clamp(y0 / h - pad, 0, 1), w: clamp((x1 - x0 + 1) / w + pad * 2, 0.05, 1), h: clamp((y1 - y0 + 1) / h + pad * 2, 0.05, 1) };
}

/** Crop a logo before it is uploaded: drag the frame, pull the corners, or let Shaheen trim the empty margins. */
export function LogoCropper({ file, onDone, onCancel }: { file: File; onDone: (f: File) => void; onCancel: () => void }) {
  const [src] = useState(() => URL.createObjectURL(file));
  const img = useRef<HTMLImageElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const [r, setR] = useState<R>({ x: 0, y: 0, w: 1, h: 1 });
  const drag = useRef<{ px: number; py: number; r: R; mode: string } | null>(null);
  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const down = (mode: string) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, r, mode };
  };
  const move = (e: React.PointerEvent) => {
    const s = drag.current, box = area.current?.getBoundingClientRect();
    if (!s || !box) return;
    const dx = (e.clientX - s.px) / box.width, dy = (e.clientY - s.py) / box.height;
    let { x, y, w, h } = s.r;
    if (s.mode === "move") { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); }
    else {
      if (s.mode.includes("l")) { const nx = clamp(x + dx, 0, x + w - 0.05); w += x - nx; x = nx; }
      if (s.mode.includes("r")) w = clamp(w + dx, 0.05, 1 - x);
      if (s.mode.includes("t")) { const ny = clamp(y + dy, 0, y + h - 0.05); h += y - ny; y = ny; }
      if (s.mode.includes("b")) h = clamp(h + dy, 0.05, 1 - y);
    }
    setR({ x, y, w, h });
  };
  const up = () => { drag.current = null; };

  async function done() {
    const im = img.current;
    if (!im) return;
    const sx = Math.round(r.x * im.naturalWidth), sy = Math.round(r.y * im.naturalHeight);
    const sw = Math.max(1, Math.round(r.w * im.naturalWidth)), sh = Math.max(1, Math.round(r.h * im.naturalHeight));
    const c = document.createElement("canvas"); c.width = sw; c.height = sh;
    c.getContext("2d")?.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/png"));
    onDone(blob ? new File([blob], "logo.png", { type: "image/png" }) : file);
  }

  const handle = (pos: string, cls: string) => (
    <span onPointerDown={down(pos)} onPointerMove={move} onPointerUp={up} className={`absolute h-5 w-5 touch-none rounded-full border-2 border-white bg-gold-500 shadow ${cls}`} />
  );

  return (
    <div role="dialog" aria-modal="true" aria-label={L("قص الشعار")} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card flex w-full max-w-md flex-col gap-4 p-5">
        <h2 className="text-[18px] font-bold text-navy-900">{L("قص الشعار")}</h2>
        <div dir="ltr" ref={area} className="relative mx-auto select-none bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:20px_20px]" onPointerMove={move} onPointerUp={up}>
          <img ref={img} src={src} alt="" className="block max-h-[50vh] max-w-full" draggable={false} />
          <div className="pointer-events-none absolute inset-0 bg-black/45" style={{ clipPath: `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${r.x * 100}% ${r.y * 100}%, ${r.x * 100}% ${(r.y + r.h) * 100}%, ${(r.x + r.w) * 100}% ${(r.y + r.h) * 100}%, ${(r.x + r.w) * 100}% ${r.y * 100}%, ${r.x * 100}% ${r.y * 100}%)` }} />
          <div onPointerDown={down("move")} onPointerMove={move} onPointerUp={up} className="absolute cursor-move touch-none border-2 border-dashed border-gold-500"
            style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}>
            {handle("tl", "-left-2.5 -top-2.5 cursor-nwse-resize")}
            {handle("tr", "-right-2.5 -top-2.5 cursor-nesw-resize")}
            {handle("bl", "-bottom-2.5 -left-2.5 cursor-nesw-resize")}
            {handle("br", "-bottom-2.5 -right-2.5 cursor-nwse-resize")}
          </div>
        </div>
        <p className="text-center text-[13px] text-subtle">{L("اسحب الإطار، أو اسحب الدوائر الصفرا لتحدد الشعار.")}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { const t = img.current && autoTrim(img.current); if (t) setR(t); }} className="btn btn-outline px-4 py-2 text-sm">{L("✂️ قص الفراغ تلقائياً")}</button>
          <button type="button" onClick={() => setR({ x: 0, y: 0, w: 1, h: 1 })} className="btn btn-outline px-4 py-2 text-sm">{L("بدون قص")}</button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={done} className="btn btn-primary flex-1 py-3">{L("تم")}</button>
          <button type="button" onClick={onCancel} className="btn border border-line bg-white flex-1 py-3">{L("إلغاء")}</button>
        </div>
      </div>
    </div>
  );
}
