"use client";
import { L } from "@/lib/i18n/ui";
import { useEffect, useRef, useState } from "react";
import { cleanEls, elSelector, type ElEdit } from "@/remotion/spec";

export type Picked = { sel: string; text: string } | null;
const blank = (sel: string): ElEdit => ({ sel, s: 1, x: 0, y: 0 });
const upsert = (els: ElEdit[], sel: string, fn: (e: ElEdit) => ElEdit) => { const cur = els.find((e) => e.sel === sel) ?? blank(sel); return [...els.filter((e) => e.sel !== sel), fn(cur)]; };

/** A transparent layer over the live player: click an element of the video to choose it, drag to move it. Elements are found under the pointer inside the scene wrappers ([data-sc]). */
export function ElPicker({ els, picked, onPick, onChange }: { els: ElEdit[]; picked: Picked; onPick: (p: Picked) => void; onChange: (els: ElEdit[]) => void }) {
  const layer = useRef<HTMLDivElement>(null);
  const drag = useRef<{ sx: number; sy: number; bx: number; by: number; k: number; sel: string } | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 200); return () => clearInterval(t); }, []);
  const host = () => layer.current?.parentElement ?? null;
  const find = (sel: string) => { try { return host()?.querySelector(elSelector(sel)) as HTMLElement | null; } catch { return null; } };

  function down(e: React.PointerEvent) {
    const h = host(); if (!h) return;
    let hit: HTMLElement | null = null, root: HTMLElement | null = null;
    for (const el of document.elementsFromPoint(e.clientX, e.clientY) as HTMLElement[]) {
      const r = el.closest?.("[data-sc]") as HTMLElement | null;
      if (r && r !== el && h.contains(el)) { hit = el; root = r; break; }
    }
    const cur = picked ? find(picked.sel) : null;
    if (cur && hit && cur.contains(hit)) { hit = cur; root = cur.closest("[data-sc]") as HTMLElement; }
    if (!hit || !root) { onPick(null); return; }
    while (hit !== root && hit.parentElement && hit.parentElement !== root && getComputedStyle(hit).display === "inline") hit = hit.parentElement;
    const path: number[] = []; let el: HTMLElement = hit;
    while (el !== root) { const par = el.parentElement; if (!par) return; path.unshift(Array.prototype.indexOf.call(par.children, el) + 1); el = par; }
    const sel = `${root.dataset.sc}/${path.join("/")}`;
    if (cleanEls([{ sel, hide: true }]).length === 0) return;
    onPick({ sel, text: (hit.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40) });
    const base = els.find((x) => x.sel === sel) ?? blank(sel);
    drag.current = { sx: e.clientX, sy: e.clientY, bx: base.x, by: base.y, k: root.offsetWidth ? root.getBoundingClientRect().width / root.offsetWidth : 1, sel };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) < 4) return;
    onChange(upsert(els, d.sel, (x) => ({ ...x, x: Math.round(d.bx + dx / (d.k || 1)), y: Math.round(d.by + dy / (d.k || 1)) })));
  }
  const target = picked ? find(picked.sel) : null, lr = layer.current?.getBoundingClientRect(), tr = target?.getBoundingClientRect();
  return (
    <div ref={layer} className="absolute inset-x-0 top-0 bottom-12 z-20 cursor-pointer" style={{ touchAction: "none" }} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      {lr && tr && <div className="pointer-events-none absolute rounded-md border-2 border-dashed border-gold-500 bg-gold-500/15" style={{ left: tr.left - lr.left - 3, top: tr.top - lr.top - 3, width: tr.width + 6, height: tr.height + 6 }} />}
    </div>
  );
}

/** the buttons that go with the picker */
export function ElBar({ on, onToggle, els, picked, onPick, onChange }: { on: boolean; onToggle: () => void; els: ElEdit[]; picked: Picked; onPick: (p: Picked) => void; onChange: (els: ElEdit[]) => void }) {
  const cur = picked ? els.find((e) => e.sel === picked.sel) ?? blank(picked.sel) : null;
  const edit = (fn: (e: ElEdit) => ElEdit) => { if (picked) onChange(upsert(els, picked.sel, fn)); };
  const active = cleanEls(els).length;
  return (
    <div className={`rounded-2xl border p-3 ${on ? "border-gold-500 bg-gold-500/10" : "border-line bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" aria-pressed={on} onClick={onToggle} className={`btn px-4 py-2 text-[14px] ${on ? "btn-gold" : "btn-outline"}`}>{on ? L("✓ خلصت تحريك العناصر") : L("✋ حرّك أو امسح عنصر بالفيديو")}</button>
        {active > 0 && <button type="button" className="text-[13px] text-red-700 underline" onClick={() => { onChange([]); onPick(null); }}>{L("رجّع كل العناصر لأصلها")} ({active})</button>}
      </div>
      {on && (
        <div className="mt-3 flex flex-col gap-2">
          {!picked || !cur ? <p className="text-[13px] text-subtle">{L("اضغط على أي نص أو شكل داخل الفيديو لتحديده، واسحبه بالماوس أو الإصبع لتغيير مكانه.")}</p> : (
            <>
              <p className="truncate text-[13px] text-navy-900">{L("العنصر المحدد")}: <b>{picked.text || L("شكل بدون نص")}</b> · {Math.round(cur.s * 100)}%</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="chip" onClick={() => edit((e) => ({ ...e, s: Math.min(3, +(e.s + 0.1).toFixed(2)) }))}>{L("➕ كبّر")}</button>
                <button type="button" className="chip" onClick={() => edit((e) => ({ ...e, s: Math.max(0.3, +(e.s - 0.1).toFixed(2)) }))}>{L("➖ صغّر")}</button>
                <button type="button" className="chip" onClick={() => edit((e) => ({ ...e, hide: !e.hide }))}>{cur.hide ? L("👁 رجّعه") : L("🗑 امسحه")}</button>
                <button type="button" className="chip" disabled={picked.sel.split("/").length <= 2} onClick={() => onPick({ sel: picked.sel.split("/").slice(0, -1).join("/"), text: "" })}>{L("⬆ حدّد المجموعة الأكبر")}</button>
                <button type="button" className="chip" onClick={() => edit((e) => blank(e.sel))}>{L("↺ أصله")}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
