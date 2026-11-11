/** Animated explainer scenes (timer, counter, steps, compare…) drawn inside a box: the split panel, or a card over the footage. */
import React from "react";
import { Easing, interpolate, spring } from "remotion";
import { MIcon } from "./icons";
import { DARK_BOARDS, MFPS, type Graphic, type MontageSpec } from "./montage";

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type Theme = { text: string; soft: string; accent: string; card: string; line: string; good: string; bad: string };
export function themeFor(m: MontageSpec, light: boolean): Theme {
  if (m.board === "chalk" && !light) return { text: "#F4F1E8", soft: "rgba(244,241,232,.7)", accent: m.colors.accent, card: "rgba(255,255,255,.07)", line: "rgba(244,241,232,.25)", good: "#8FE3A8", bad: "#FF8A80" };
  return light
    ? { text: "#0E1B2C", soft: "rgba(14,27,44,.62)", accent: m.colors.accent, card: "#FFFFFF", line: "rgba(14,27,44,.14)", good: "#1F9D55", bad: "#E0453A" }
    : { text: "#FFFFFF", soft: "rgba(255,255,255,.72)", accent: m.colors.accent, card: "rgba(255,255,255,.08)", line: "rgba(255,255,255,.2)", good: "#3DDC84", bad: "#FF6B5E" };
}

/** Light or dark text for this panel (chalkboard, blueprint and night are always dark). */
export const isLight = (m: MontageSpec) => !DARK_BOARDS.includes(m.board ?? "soft") && (m.panel ?? "light") === "light";

/** Background of the graphics panel / lesson board. */
export function panelBackground(m: MontageSpec, light: boolean) {
  const a = m.colors.accent;
  switch (m.board ?? "soft") {
    case "paper": return "radial-gradient(130% 100% at 50% 0%, #FFFCF5 0%, #F6EFE1 100%)";
    case "grid": return `linear-gradient(rgba(14,27,44,.06) 2px, transparent 2px) 0 0 / 64px 64px, linear-gradient(90deg, rgba(14,27,44,.06) 2px, transparent 2px) 0 0 / 64px 64px, #F7F8FA`;
    case "dots": return `radial-gradient(rgba(14,27,44,.13) 3px, transparent 3.5px) 0 0 / 48px 48px, linear-gradient(180deg, #FFFFFF, #F1F4F7)`;
    case "notebook": return `linear-gradient(90deg, transparent calc(100% - 92px), rgba(224,69,58,.45) calc(100% - 92px), rgba(224,69,58,.45) calc(100% - 88px), transparent calc(100% - 88px)), repeating-linear-gradient(180deg, transparent 0 70px, rgba(47,91,234,.16) 70px 73px), #FFFDF8`;
    case "chalk": return "radial-gradient(120% 90% at 50% 30%, #2C4538 0%, #1C2E25 70%, #14221B 100%)";
    case "blueprint": return `linear-gradient(rgba(255,255,255,.07) 2px, transparent 2px) 0 0 / 60px 60px, linear-gradient(90deg, rgba(255,255,255,.07) 2px, transparent 2px) 0 0 / 60px 60px, radial-gradient(120% 90% at 50% 20%, #165A9A 0%, #0D3966 100%)`;
    case "night": return `radial-gradient(120% 90% at 85% 10%, ${m.colors.bg} 0%, #070B14 100%)`;
    case "pastel": return "linear-gradient(160deg, #FFE9F0 0%, #FFF6DD 45%, #E3F4FF 100%)";
    case "sunrise": return `radial-gradient(110% 80% at 80% 0%, ${a}33 0%, transparent 60%), linear-gradient(180deg, #FFF4E6 0%, #FDE7D3 100%)`;
    default: return light
      ? "radial-gradient(120% 90% at 85% 10%, #FFF8EC 0%, #F3EEE6 45%, #E6ECEE 100%)"
      : `radial-gradient(120% 90% at 85% 10%, ${m.colors.bg} 0%, #0A0F18 100%)`;
  }
}

const pop = (f: number, delay = 0, damping = 12) => spring({ frame: f - delay, fps: MFPS, config: { damping, mass: 0.6 } });

export function Words({ text, hl, f, size, th, delay = 0, fx }: { text: string; hl?: string; f: number; size: number; th: Theme; delay?: number; fx?: Graphic["fx"] }) {
  const hot = new Set((hl ?? "").split(/\s+/).filter(Boolean));
  if (fx === "typewriter") {
    const n = Math.floor(interpolate(f, [delay, delay + text.length * 1.4], [0, text.length], cl));
    const caret = Math.floor(f / 8) % 2 === 0;
    return (
      <div style={{ direction: "rtl", textAlign: "center", fontSize: size, fontWeight: 800, lineHeight: 1.2, color: th.text }}>
        {text.slice(0, n).split(/(\s+)/).map((w, k) => <span key={k} style={{ color: hot.has(w) ? th.accent : th.text }}>{w}</span>)}
        <span style={{ display: "inline-block", width: size * 0.08, height: size * 0.9, marginInlineStart: size * 0.06, background: th.accent, verticalAlign: "middle", opacity: n < text.length || caret ? 1 : 0 }} />
      </div>
    );
  }
  const words = text.split(/\s+/).filter(Boolean);
  const after = delay + words.length * 3 + 6;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${size * 0.05}px ${size * 0.24}px`, direction: "rtl", textAlign: "center" }}>
      {words.map((w, k) => {
        const q = Math.min(1, pop(f, delay + k * 3, 11));
        const isHot = hot.has(w);
        const draw = interpolate(f, [after, after + 12], [0, 1], { ...cl, easing: ease });
        return (
          <span key={k} style={{ position: "relative", display: "inline-block", fontSize: size, fontWeight: 800, lineHeight: 1.18, color: isHot && fx !== "marker" ? th.accent : th.text, opacity: q, transform: `translateY(${(1 - q) * size * 0.35}px) scale(${0.75 + 0.25 * q})`, zIndex: 1 }}>
            {isHot && fx === "marker" && <span style={{ position: "absolute", zIndex: -1, right: -size * 0.08, bottom: size * 0.08, height: size * 0.42, width: `calc(${draw * 100}% + ${size * 0.16 * draw}px)`, background: th.accent, opacity: 0.55, borderRadius: size * 0.08, transform: "skewX(-8deg)" }} />}
            {isHot && fx === "underline" && <span style={{ position: "absolute", right: 0, bottom: -size * 0.04, height: size * 0.1, width: `${draw * 100}%`, background: th.accent, borderRadius: 99 }} />}
            {isHot && fx === "circle" && (
              <svg viewBox="0 0 100 60" preserveAspectRatio="none" style={{ position: "absolute", inset: `${-size * 0.18}px ${-size * 0.3}px`, width: `calc(100% + ${size * 0.6}px)`, height: `calc(100% + ${size * 0.36}px)`, overflow: "visible" }}>
                <path d="M88 12 C70 0 20 2 8 18 C-4 36 22 58 55 56 C90 54 104 32 86 14" fill="none" stroke={th.accent} strokeWidth={3.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} style={{ strokeWidth: size * 0.06 }} />
              </svg>
            )}
            {w}
          </span>
        );
      })}
    </div>
  );
}

function Badge({ text, f, delay, s, th, light }: { text: string; f: number; delay: number; s: number; th: Theme; light: boolean }) {
  const q = Math.min(1, pop(f, delay, 10));
  return <div style={{ marginTop: 26 * s, padding: `${10 * s}px ${30 * s}px`, borderRadius: 999, background: light ? th.text : th.accent, color: light ? "#fff" : "#0E1B2C", fontSize: 38 * s, fontWeight: 800, transform: `scale(${q})`, boxShadow: `0 ${8 * s}px ${0}px ${th.accent}` }}>{text}</div>;
}

function Tile({ children, s, th, light, q }: { children: React.ReactNode; s: number; th: Theme; light: boolean; q: number }) {
  return (
    <div style={{ width: 170 * s, height: 170 * s, borderRadius: 40 * s, background: light ? "#16202C" : "rgba(255,255,255,.1)", border: `${3 * s}px solid ${light ? "#2A3646" : th.line}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${q}) rotate(${(1 - q) * -12}deg)`, boxShadow: `0 ${16 * s}px ${36 * s}px rgba(0,0,0,.25)` }}>{children}</div>
  );
}

/** One graphic. f = frames since it started, len = its length in frames, w/h = box size. */
export function GraphicView({ g, m, f, len, w, h, light, boost = 1 }: { g: Graphic; m: MontageSpec; f: number; len: number; w: number; h: number; light: boolean; boost?: number }) {
  const th = themeFor(m, light);
  const s = Math.min(w / 1080, h / 760) * boost;
  const out = interpolate(f, [len - 8, len], [1, 0], cl);
  const big = 104 * s;
  let body: React.ReactNode = null;

  switch (g.kind) {
    case "timer": {
      const R = 150 * s;
      const sweep = interpolate(f, [4, Math.max(10, len - 10)], [0, 1], { ...cl, easing: Easing.inOut(Easing.quad) });
      const q = Math.min(1, pop(f, 0, 12));
      const C = 2 * Math.PI * (R - 12 * s);
      body = (
        <div style={{ display: "flex", alignItems: "center", gap: 50 * s, direction: "rtl" }}>
          <div style={{ flex: 1, minWidth: 0 }}>{g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.9} th={th} delay={4} />}{g.sub && <div style={{ display: "flex", justifyContent: "center" }}><Badge text={g.sub} f={f} delay={14} s={s} th={th} light={light} /></div>}</div>
          <div style={{ position: "relative", width: R * 2, height: R * 2, transform: `scale(${q})`, flexShrink: 0 }}>
            <svg width={R * 2} height={R * 2} style={{ position: "absolute", inset: 0 }}>
              <circle cx={R} cy={R} r={R - 12 * s} fill={light ? "#fff" : "rgba(255,255,255,.06)"} stroke={light ? "#1A2433" : "#fff"} strokeWidth={14 * s} />
              <circle cx={R} cy={R} r={R - 12 * s} fill="none" stroke={th.accent} strokeWidth={16 * s} strokeDasharray={C} strokeDashoffset={C * (1 - sweep)} transform={`rotate(-90 ${R} ${R})`} strokeLinecap="round" />
              <line x1={R} y1={R} x2={R} y2={R - (R - 46 * s)} stroke={light ? "#1A2433" : "#fff"} strokeWidth={12 * s} strokeLinecap="round" transform={`rotate(${sweep * 360} ${R} ${R})`} />
              <circle cx={R} cy={R} r={14 * s} fill={light ? "#1A2433" : "#fff"} />
            </svg>
            <div style={{ position: "absolute", top: -10 * s, right: -10 * s, width: 62 * s, height: 62 * s, borderRadius: 999, background: th.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><MIcon name="clock" size={38 * s} color="#fff" stroke={2.4} /></div>
          </div>
        </div>
      );
      break;
    }
    case "counter": {
      const v = g.value ?? 0;
      const n = interpolate(f, [2, Math.min(len - 6, 40)], [0, v], { ...cl, easing: ease });
      const shown = v >= 100 ? Math.round(n).toLocaleString("en-US") : Number.isInteger(v) ? Math.round(n).toString() : n.toFixed(1);
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * s }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 * s, direction: "rtl" }}>
            <span style={{ fontSize: 230 * s, fontWeight: 900, lineHeight: 1, color: th.accent, fontVariantNumeric: "tabular-nums", direction: "ltr" }}>{shown}</span>
            {g.suffix && <span style={{ fontSize: 96 * s, fontWeight: 800, color: th.text }}>{g.suffix}</span>}
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.62} th={th} delay={8} />}
        </div>
      );
      break;
    }
    case "steps":
    case "checklist": {
      const items = g.items ?? [];
      body = (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 * s, width: "100%", direction: "rtl" }}>
          {g.text && <div style={{ marginBottom: 8 * s }}><Words text={g.text} hl={g.hl} f={f} size={big * 0.68} th={th} /></div>}
          {items.map((it, i) => {
            const d = 8 + i * Math.max(6, Math.min(16, (len - 30) / Math.max(1, items.length)));
            const q = Math.min(1, pop(f, d, 14));
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 24 * s, padding: `${16 * s}px ${26 * s}px`, borderRadius: 26 * s, background: th.card, border: `${2 * s}px solid ${th.line}`, opacity: q, transform: `translateX(${(1 - q) * -60 * s}px)`, boxShadow: light ? `0 ${6 * s}px ${18 * s}px rgba(14,27,44,.08)` : "none" }}>
                <div style={{ width: 70 * s, height: 70 * s, flexShrink: 0, borderRadius: 999, background: g.kind === "checklist" ? th.good : th.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * s, fontWeight: 900 }}>
                  {g.kind === "checklist" ? <MIcon name="check" size={44 * s} color="#fff" stroke={3} /> : it.icon ? <MIcon name={it.icon} size={40 * s} color="#fff" stroke={2.2} /> : (i + 1).toLocaleString("ar-EG")}
                </div>
                <div style={{ fontSize: 52 * s, fontWeight: 700, color: th.text, lineHeight: 1.25 }}>{it.label}</div>
              </div>
            );
          })}
        </div>
      );
      break;
    }
    case "compare": {
      const q1 = Math.min(1, pop(f, 2, 13)), q2 = Math.min(1, pop(f, Math.min(len * 0.4, 30), 13));
      const strike = interpolate(f, [12, 24], [0, 1], cl);
      const row = (ok: boolean, text: string, q: number) => (
        <div style={{ display: "flex", alignItems: "center", gap: 24 * s, padding: `${20 * s}px ${30 * s}px`, borderRadius: 28 * s, background: th.card, border: `${3 * s}px solid ${ok ? th.good : th.bad}`, opacity: q, transform: `scale(${0.8 + 0.2 * q})`, direction: "rtl", width: "100%" }}>
          <div style={{ width: 76 * s, height: 76 * s, flexShrink: 0, borderRadius: 999, background: ok ? th.good : th.bad, display: "flex", alignItems: "center", justifyContent: "center" }}><MIcon name={ok ? "check" : "x"} size={46 * s} color="#fff" stroke={3.2} /></div>
          <div style={{ position: "relative", fontSize: 54 * s, fontWeight: 800, color: ok ? th.text : th.soft }}>
            {text}
            {!ok && <div style={{ position: "absolute", top: "54%", right: 0, height: 6 * s, width: `${strike * 100}%`, background: th.bad, borderRadius: 9 }} />}
          </div>
        </div>
      );
      body = (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 * s, width: "100%" }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.6} th={th} />}
          {g.bad && row(false, g.bad, q1)}
          {g.good && row(true, g.good, q2)}
        </div>
      );
      break;
    }
    case "icon": {
      const q = Math.min(1, pop(f, 0, 9));
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * s }}>
          <Tile s={s * 1.25} th={th} light={light} q={q}>{g.emoji ? <span style={{ fontSize: 120 * s }}>{g.emoji}</span> : <MIcon name={g.icon ?? "sparkle"} size={120 * s} color={th.accent} stroke={2} />}</Tile>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.82} th={th} delay={6} />}
          {g.sub && <Badge text={g.sub} f={f} delay={16} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "flow": {
      const items = (g.items ?? []).slice(0, 3);
      const gap = 70 * s;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 * s }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap, direction: "rtl" }}>
            {items.map((it, i) => {
              const q = Math.min(1, pop(f, i * 12, 10));
              const dash = interpolate(f, [i * 12 + 6, i * 12 + 16], [0, 1], cl);
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <div style={{ position: "relative", width: gap * 1.6, height: 170 * s, marginInline: -gap * 0.8, display: "flex", alignItems: "center", justifyContent: "center", opacity: dash }}>
                      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", borderTop: `${5 * s}px dotted ${th.accent}`, clipPath: `inset(0 0 0 ${(1 - dash) * 100}%)` }} />
                      <div style={{ width: 56 * s, height: 56 * s, borderRadius: 999, background: th.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${dash})`, zIndex: 1 }}><span style={{ color: "#fff", fontSize: 34 * s, fontWeight: 900, lineHeight: 1 }}>←</span></div>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * s, width: 210 * s }}>
                    <Tile s={s} th={th} light={light} q={q}><MIcon name={it.icon ?? "sparkle"} size={92 * s} color={th.accent} stroke={2} /></Tile>
                    {it.label && <div style={{ fontSize: 40 * s, fontWeight: 800, color: th.text, textAlign: "center", opacity: q, lineHeight: 1.2 }}>{it.label}</div>}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.75} th={th} delay={items.length * 12} />}
        </div>
      );
      break;
    }
    case "bars": {
      const items = (g.items ?? []).slice(0, 5);
      const max = Math.max(1, ...items.map((i) => i.value ?? 0));
      const H = 300 * s;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * s, width: "100%" }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.6} th={th} />}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 34 * s, height: H + 90 * s, direction: "rtl", borderBottom: `${4 * s}px solid ${th.line}` }}>
            {items.map((it, i) => {
              const k = interpolate(f, [6 + i * 5, 26 + i * 5], [0, 1], { ...cl, easing: ease });
              const v = it.value ?? 0;
              const best = v === max;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * s, width: 120 * s }}>
                  <div style={{ fontSize: 40 * s, fontWeight: 900, color: best ? th.accent : th.text, opacity: k }}>{Math.round(v * k).toLocaleString("en-US")}{g.suffix ?? ""}</div>
                  <div style={{ width: 92 * s, height: Math.max(6 * s, (H * v * k) / max), borderRadius: `${18 * s}px ${18 * s}px 0 0`, background: best ? th.accent : light ? "#1A2433" : "rgba(255,255,255,.35)" }} />
                  <div style={{ fontSize: 32 * s, fontWeight: 700, color: th.soft, textAlign: "center", lineHeight: 1.15, height: 0, overflow: "visible", whiteSpace: "nowrap" }}>{it.label}</div>
                </div>
              );
            })}
          </div>
          <div style={{ height: 30 * s }} />
        </div>
      );
      break;
    }
    case "donut": {
      const v = Math.max(0, Math.min(100, g.value ?? 0));
      const R = 140 * s, sw = 36 * s, C = 2 * Math.PI * (R - sw / 2);
      const k = interpolate(f, [4, 34], [0, 1], { ...cl, easing: ease });
      body = (
        <div style={{ display: "flex", alignItems: "center", gap: 50 * s, direction: "rtl" }}>
          <div style={{ position: "relative", width: R * 2, height: R * 2, flexShrink: 0 }}>
            <svg width={R * 2} height={R * 2}>
              <circle cx={R} cy={R} r={R - sw / 2} fill="none" stroke={th.line} strokeWidth={sw} />
              <circle cx={R} cy={R} r={R - sw / 2} fill="none" stroke={th.accent} strokeWidth={sw} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (v / 100) * k)} transform={`rotate(-90 ${R} ${R})`} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 92 * s, fontWeight: 900, color: th.text, direction: "ltr" }}>{Math.round(v * k)}%</div>
          </div>
          {g.text && <div style={{ flex: 1, minWidth: 0 }}><Words text={g.text} hl={g.hl} f={f} size={big * 0.68} th={th} delay={8} /></div>}
        </div>
      );
      break;
    }
    case "line": {
      const vals = g.values?.length ? g.values : [2, 3, 2.6, 4, 5.2, 7];
      const W = 760 * s, H = 300 * s;
      const mx = Math.max(...vals), mn = Math.min(0, ...vals);
      const pts = vals.map((v, i) => [(i / Math.max(1, vals.length - 1)) * W, H - ((v - mn) / Math.max(1e-6, mx - mn)) * H] as const);
      const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      const k = interpolate(f, [4, 36], [0, 1], { ...cl, easing: ease });
      const last = pts[pts.length - 1];
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * s }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.62} th={th} />}
          <svg width={W + 40 * s} height={H + 40 * s} style={{ overflow: "visible", direction: "ltr" }}>
            <g transform={`translate(${20 * s},${20 * s})`}>
              {[0, 0.5, 1].map((y) => <line key={y} x1={0} x2={W} y1={H * y} y2={H * y} stroke={th.line} strokeWidth={2 * s} />)}
              <path d={`${d} L${W},${H} L0,${H} Z`} fill={th.accent} opacity={0.14 * k} />
              <path d={d} fill="none" stroke={th.accent} strokeWidth={12 * s} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
              <circle cx={last[0]} cy={last[1]} r={18 * s * Math.min(1, Math.max(0, (k - 0.85) / 0.15))} fill={th.accent} />
            </g>
          </svg>
        </div>
      );
      break;
    }
    case "quote": {
      const q = Math.min(1, pop(f, 0, 14));
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * s, width: "100%" }}>
          <div style={{ fontSize: 220 * s, lineHeight: 0.6, height: 110 * s, color: th.accent, fontWeight: 900, opacity: q, transform: `scale(${q})` }}>”</div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.7} th={th} delay={4} fx={g.fx} />}
          {g.sub && <div style={{ marginTop: 14 * s, fontSize: 38 * s, fontWeight: 700, color: th.soft, opacity: interpolate(f, [16, 26], [0, 1], cl) }}>— {g.sub}</div>}
        </div>
      );
      break;
    }
    case "arrow": {
      const k = interpolate(f, [2, 18], [0, 1], { ...cl, easing: ease });
      const bob = Math.sin(f / 5) * 12 * s * k;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * s }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.8} th={th} fx={g.fx} />}
          <svg width={160 * s} height={200 * s} viewBox="0 0 80 100" style={{ transform: `translateY(${bob}px)`, opacity: k }}>
            <path d="M40 6 C42 40 38 60 40 88 M18 66 L40 90 L62 66" fill="none" stroke={th.accent} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
          </svg>
        </div>
      );
      break;
    }
    case "definition": {
      const q = Math.min(1, pop(f, 0, 14));
      const line = interpolate(f, [8, 22], [0, 1], { ...cl, easing: ease });
      body = (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * s, padding: `${36 * s}px ${40 * s}px`, borderRadius: 36 * s, background: th.card, border: `${3 * s}px solid ${th.line}`, transform: `scale(${0.85 + 0.15 * q})`, opacity: q }}>
          <div style={{ fontSize: 34 * s, fontWeight: 800, color: th.accent, letterSpacing: 1 }}>{g.hl || "تعريف"}</div>
          <div style={{ fontSize: big * 0.95, fontWeight: 900, color: th.text, lineHeight: 1.15, textAlign: "center" }}>{g.text}</div>
          <div style={{ width: `${line * 60}%`, height: 8 * s, borderRadius: 9, background: th.accent }} />
          {g.sub && <Words text={g.sub} f={f} size={big * 0.5} th={{ ...th, text: th.soft }} delay={14} />}
        </div>
      );
      break;
    }
    case "quiz": {
      const items = (g.items ?? []).slice(0, 4);
      const right = Math.max(1, Math.min(items.length, Math.round(g.value ?? 1))) - 1;
      const reveal = f > len * 0.62;
      const letters = ["أ", "ب", "ج", "د"];
      body = (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 * s, width: "100%", direction: "rtl" }}>
          {g.text && <div style={{ display: "flex", alignItems: "center", gap: 18 * s, justifyContent: "center" }}><MIcon name="question" size={70 * s} color={th.accent} stroke={2.2} /><Words text={g.text} hl={g.hl} f={f} size={big * 0.6} th={th} /></div>}
          {items.map((it, i) => {
            const q = Math.min(1, pop(f, 8 + i * 6, 14));
            const ok = reveal && i === right, dim = reveal && i !== right;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 * s, padding: `${16 * s}px ${24 * s}px`, borderRadius: 24 * s, background: ok ? th.good : th.card, border: `${3 * s}px solid ${ok ? th.good : th.line}`, opacity: q * (dim ? 0.45 : 1), transform: `translateY(${(1 - q) * 30 * s}px) scale(${ok ? 1.04 : 1})` }}>
                <div style={{ width: 62 * s, height: 62 * s, borderRadius: 999, flexShrink: 0, background: ok ? "#fff" : th.accent, color: ok ? th.good : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 * s, fontWeight: 900 }}>{ok ? <MIcon name="check" size={40 * s} color={th.good} stroke={3.2} /> : letters[i]}</div>
                <div style={{ fontSize: 48 * s, fontWeight: 700, color: ok ? "#fff" : th.text }}>{it.label}</div>
              </div>
            );
          })}
        </div>
      );
      break;
    }
    case "truefalse": {
      const yes = (g.value ?? 1) >= 1;
      const k = Math.min(1, pop(f, Math.round(len * 0.55), 9));
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 * s }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.72} th={th} />}
          <div style={{ display: "flex", gap: 30 * s }}>
            {[true, false].map((v) => {
              const on = v === yes && k > 0.05;
              return <div key={String(v)} style={{ display: "flex", alignItems: "center", gap: 14 * s, padding: `${16 * s}px ${36 * s}px`, borderRadius: 999, fontSize: 50 * s, fontWeight: 900, color: on ? "#fff" : th.soft, background: on ? (v ? th.good : th.bad) : th.card, border: `${3 * s}px solid ${v ? th.good : th.bad}`, transform: `scale(${on ? 1 + 0.15 * k : 1})`, opacity: k > 0.05 && !on ? 0.4 : 1 }}><MIcon name={v ? "check" : "x"} size={46 * s} color={on ? "#fff" : v ? th.good : th.bad} stroke={3.2} />{v ? "صح" : "خطأ"}</div>;
            })}
          </div>
          {g.sub && <div style={{ fontSize: 40 * s, fontWeight: 600, color: th.soft, opacity: k, textAlign: "center" }}>{g.sub}</div>}
        </div>
      );
      break;
    }
    case "timeline": {
      const items = (g.items ?? []).slice(0, 5);
      const n = Math.max(1, items.length);
      const grow = interpolate(f, [4, 4 + n * 10], [0, 1], cl);
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * s, width: "100%" }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.6} th={th} />}
          <div style={{ position: "relative", width: "100%", height: 260 * s, direction: "rtl" }}>
            <div style={{ position: "absolute", top: 90 * s, right: "6%", width: `${88 * grow}%`, height: 8 * s, borderRadius: 9, background: th.accent }} />
            {items.map((it, i) => {
              const q = Math.min(1, pop(f, 6 + i * 10, 12));
              const x = 6 + (88 * (i + 0.5)) / n;
              return (
                <div key={i} style={{ position: "absolute", top: 0, right: `${x}%`, transform: `translateX(50%) scale(${q})`, display: "flex", flexDirection: "column", alignItems: "center", width: (900 / n) * s, gap: 10 * s }}>
                  <div style={{ height: 60 * s, display: "flex", alignItems: "flex-end", fontSize: 34 * s, fontWeight: 900, color: th.accent }}>{it.icon ? <MIcon name={it.icon} size={50 * s} color={th.accent} stroke={2} /> : ""}</div>
                  <div style={{ width: 44 * s, height: 44 * s, borderRadius: 999, background: th.card, border: `${8 * s}px solid ${th.accent}` }} />
                  <div style={{ fontSize: 34 * s, fontWeight: 700, color: th.text, textAlign: "center", lineHeight: 1.2 }}>{it.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
      break;
    }
    case "cycle": {
      const items = (g.items ?? []).slice(0, 5);
      const n = Math.max(2, items.length);
      const R = 210 * s;
      const spin = interpolate(f, [0, len], [0, 360]);
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * s }}>
          <div style={{ position: "relative", width: R * 2 + 240 * s, height: R * 2 + 140 * s }}>
            <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }} viewBox={`0 0 ${R * 2 + 240 * s} ${R * 2 + 140 * s}`}>
              <circle cx={R + 120 * s} cy={R + 70 * s} r={R} fill="none" stroke={th.line} strokeWidth={6 * s} strokeDasharray={`${14 * s} ${12 * s}`} />
              <g transform={`rotate(${spin} ${R + 120 * s} ${R + 70 * s})`}><circle cx={R + 120 * s} cy={70 * s} r={14 * s} fill={th.accent} /></g>
            </svg>
            {g.text && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: `0 ${R * 0.6}px` }}><Words text={g.text} hl={g.hl} f={f} size={big * 0.5} th={th} delay={n * 6} /></div>}
            {items.map((it, i) => {
              const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
              const q = Math.min(1, pop(f, i * 6, 12));
              return (
                <div key={i} style={{ position: "absolute", left: R + 120 * s + Math.cos(ang) * R, top: R + 70 * s + Math.sin(ang) * R, transform: `translate(-50%,-50%) scale(${q})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * s }}>
                  <div style={{ width: 96 * s, height: 96 * s, borderRadius: 999, background: th.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>{it.icon ? <MIcon name={it.icon} size={54 * s} color="#fff" stroke={2.2} /> : <span style={{ color: "#fff", fontSize: 44 * s, fontWeight: 900 }}>{(i + 1).toLocaleString("ar-EG")}</span>}</div>
                  <div style={{ fontSize: 32 * s, fontWeight: 800, color: th.text, whiteSpace: "nowrap", padding: `${4 * s}px ${12 * s}px`, borderRadius: 12 * s, background: th.card }}>{it.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
      break;
    }
    case "mindmap": {
      const items = (g.items ?? []).slice(0, 6);
      const n = Math.max(1, items.length);
      const W = Math.min(w * 0.94, 940 * s), H = Math.min(h * 0.86, 560 * s), cx = W / 2, cy = H / 2;
      const rx = W * 0.34, ry = H * 0.36;
      const q0 = Math.min(1, pop(f, 0, 12));
      body = (
        <div style={{ position: "relative", width: W, height: H }}>
          <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
            {items.map((_, i) => { const ang = (i / n) * Math.PI * 2 - Math.PI / 2 + (n % 2 === 0 ? Math.PI / n : 0); const k = interpolate(f, [6 + i * 5, 14 + i * 5], [0, 1], cl); return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(ang) * rx * k} y2={cy + Math.sin(ang) * ry * k} stroke={th.accent} strokeWidth={6 * s} strokeLinecap="round" opacity={0.7} />; })}
          </svg>
          {items.map((it, i) => {
            const ang = (i / n) * Math.PI * 2 - Math.PI / 2 + (n % 2 === 0 ? Math.PI / n : 0);
            const q = Math.min(1, pop(f, 12 + i * 5, 12));
            return <div key={i} style={{ position: "absolute", left: cx + Math.cos(ang) * rx, top: cy + Math.sin(ang) * ry, transform: `translate(-50%,-50%) scale(${q})`, padding: `${12 * s}px ${22 * s}px`, borderRadius: 22 * s, background: th.card, border: `${3 * s}px solid ${th.accent}`, fontSize: 34 * s, fontWeight: 800, color: th.text, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 * s }}>{it.icon && <MIcon name={it.icon} size={36 * s} color={th.accent} stroke={2.2} />}{it.label}</div>;
          })}
          <div style={{ position: "absolute", left: cx, top: cy, transform: `translate(-50%,-50%) scale(${q0})`, padding: `${22 * s}px ${36 * s}px`, borderRadius: 999, background: th.accent, color: "#fff", fontSize: 50 * s, fontWeight: 900, whiteSpace: "nowrap", boxShadow: `0 ${10 * s}px ${30 * s}px rgba(0,0,0,.2)` }}>{g.text}</div>
        </div>
      );
      break;
    }
    case "proscons": {
      const items = (g.items ?? []).slice(0, 6);
      const col = (pro: boolean) => (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 * s, padding: `${20 * s}px`, borderRadius: 26 * s, background: th.card, border: `${3 * s}px solid ${pro ? th.good : th.bad}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 * s, fontSize: 42 * s, fontWeight: 900, color: pro ? th.good : th.bad }}><MIcon name={pro ? "check" : "x"} size={42 * s} color={pro ? th.good : th.bad} stroke={3} />{pro ? "المزايا" : "العيوب"}</div>
          {items.filter((i) => (i.value ?? 1) >= 1 === pro).map((it, i) => { const q = Math.min(1, pop(f, (pro ? 6 : 14) + i * 6, 14)); return <div key={i} style={{ fontSize: 38 * s, fontWeight: 700, color: th.text, opacity: q, transform: `translateY(${(1 - q) * 20 * s}px)` }}>• {it.label}</div>; })}
        </div>
      );
      body = (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 * s, width: "100%" }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.6} th={th} />}
          <div style={{ display: "flex", gap: 22 * s, direction: "rtl" }}>{col(true)}{col(false)}</div>
        </div>
      );
      break;
    }
    case "equation": {
      const toks = String(g.text ?? "").split(/\s+/).filter(Boolean);
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 * s, direction: "ltr", flexWrap: "wrap", justifyContent: "center" }}>
            {toks.map((tk, i) => {
              const q = Math.min(1, pop(f, i * 6, 10));
              const op = /^[=+\-×÷x*/<>≤≥≠]$/.test(tk);
              const res = i === toks.length - 1 && toks.includes("=");
              return <span key={i} style={{ fontSize: (op ? 110 : 140) * s, fontWeight: 900, color: res ? th.accent : op ? th.soft : th.text, opacity: q, transform: `scale(${0.6 + 0.4 * q})`, display: "inline-block", padding: res ? `0 ${20 * s}px` : 0, borderRadius: 20 * s, border: res ? `${6 * s}px solid ${th.accent}` : "none" }}>{tk}</span>;
            })}
          </div>
          {g.sub && <Words text={g.sub} hl={g.hl} f={f} size={big * 0.5} th={th} delay={toks.length * 6} />}
        </div>
      );
      break;
    }
    case "fraction": {
      const [num, den] = [Math.max(0, Math.round(g.values?.[0] ?? g.value ?? 1)), Math.max(1, Math.min(16, Math.round(g.values?.[1] ?? 4)))];
      const R = 170 * s;
      const slice = (i: number) => { const a0 = (i / den) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / den) * Math.PI * 2 - Math.PI / 2; return `M${R},${R} L${R + Math.cos(a0) * R},${R + Math.sin(a0) * R} A${R},${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${R + Math.cos(a1) * R},${R + Math.sin(a1) * R} Z`; };
      body = (
        <div style={{ display: "flex", alignItems: "center", gap: 60 * s, direction: "rtl" }}>
          <svg width={R * 2} height={R * 2} style={{ flexShrink: 0, overflow: "visible" }}>
            {Array.from({ length: den }, (_, i) => { const on = i < num && f > 8 + i * 5; return <path key={i} d={slice(i)} fill={on ? th.accent : th.card} stroke={light ? "#fff" : "rgba(0,0,0,.3)"} strokeWidth={5 * s} style={{ transformOrigin: `${R}px ${R}px`, transform: on ? `scale(${Math.min(1.04, pop(f, 8 + i * 5, 12))})` : "none" }} />; })}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * s }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 120 * s, fontWeight: 900, color: th.text, lineHeight: 1 }}><span style={{ color: th.accent }}>{num}</span><span style={{ width: 120 * s, height: 10 * s, background: th.text, borderRadius: 9, margin: `${10 * s}px 0` }} /><span>{den}</span></div>
            {g.text && <div style={{ marginTop: 16 * s, fontSize: 42 * s, fontWeight: 700, color: th.soft }}>{g.text}</div>}
          </div>
        </div>
      );
      break;
    }
    case "vocab": {
      const q = Math.min(1, pop(f, 0, 12));
      const rtl = /[\u0600-\u06FF]/.test(g.text ?? "");
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * s, width: "100%" }}>
          <div dir={rtl ? "rtl" : "ltr"} style={{ fontSize: 150 * s, fontWeight: 900, color: th.accent, transform: `scale(${q})`, lineHeight: 1.1 }}>{g.text}</div>
          {g.hl && <div dir="ltr" style={{ fontSize: 38 * s, fontWeight: 600, color: th.soft, opacity: interpolate(f, [8, 16], [0, 1], cl) }}>/{g.hl}/</div>}
          {g.sub && <div style={{ fontSize: 60 * s, fontWeight: 800, color: th.text, opacity: interpolate(f, [12, 22], [0, 1], cl) }}>= {g.sub}</div>}
          {g.good && <div dir="auto" style={{ marginTop: 10 * s, padding: `${14 * s}px ${26 * s}px`, borderRadius: 22 * s, background: th.card, border: `${2 * s}px solid ${th.line}`, fontSize: 40 * s, fontWeight: 600, color: th.text, opacity: interpolate(f, [22, 32], [0, 1], cl) }}>{g.good}</div>}
        </div>
      );
      break;
    }
    case "pyramid": {
      const items = (g.items ?? []).slice(0, 5);
      const n = Math.max(1, items.length);
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * s, width: "100%" }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.58} th={th} />}
          {[...items].reverse().map((it, j) => {
            const i = n - 1 - j; // items[0] = base
            const q = Math.min(1, pop(f, 4 + i * 7, 13));
            return <div key={j} style={{ width: `${40 + (60 * (i + 1)) / n}%`, padding: `${14 * s}px`, textAlign: "center", fontSize: 40 * s, fontWeight: 800, color: "#fff", background: th.accent, opacity: (0.55 + (0.45 * (n - i)) / n) * q, borderRadius: 16 * s, transform: `scaleX(${q})`, filter: `brightness(${0.85 + (0.25 * j) / n})` }}>{it.label}</div>;
          })}
        </div>
      );
      break;
    }
    case "table": {
      const items = (g.items ?? []).slice(0, 6);
      body = (
        <div style={{ display: "flex", flexDirection: "column", gap: 0, width: "100%", borderRadius: 26 * s, overflow: "hidden", border: `${3 * s}px solid ${th.line}`, direction: "rtl" }}>
          {g.text && <div style={{ padding: `${16 * s}px ${26 * s}px`, background: th.accent, color: "#fff", fontSize: 44 * s, fontWeight: 900, textAlign: "center" }}>{g.text}</div>}
          {items.map((it, i) => {
            const q = interpolate(f, [6 + i * 5, 14 + i * 5], [0, 1], cl);
            const [k, v] = it.label.includes(":") ? it.label.split(/:(.+)/) : [it.label, it.value !== undefined ? `${it.value}${g.suffix ?? ""}` : ""];
            return <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 20 * s, padding: `${16 * s}px ${26 * s}px`, background: i % 2 ? th.card : "transparent", opacity: q, fontSize: 40 * s }}><span style={{ fontWeight: 700, color: th.text }}>{k}</span><span style={{ fontWeight: 900, color: th.accent }}>{v}</span></div>;
          })}
        </div>
      );
      break;
    }
    case "fillblank": {
      const parts = String(g.text ?? "").split(/_{2,}|…|\.\.\./);
      const fill = Math.min(1, pop(f, Math.round(len * 0.55), 12));
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * s }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "center", gap: 16 * s, direction: "rtl", fontSize: big * 0.72, fontWeight: 800, color: th.text, opacity: Math.min(1, pop(f, 0, 14)) }}>
            <span>{parts[0]}</span>
            <span style={{ display: "inline-flex", justifyContent: "center", minWidth: 240 * s, padding: `0 ${14 * s}px`, borderBottom: `${8 * s}px solid ${th.accent}`, color: th.accent }}><span style={{ transform: `scale(${fill})`, display: "inline-block" }}>{fill > 0.05 ? g.good ?? "" : "\u00a0"}</span></span>
            {parts[1] && <span>{parts[1]}</span>}
          </div>
          {g.sub && <div style={{ fontSize: 38 * s, color: th.soft, fontWeight: 600 }}>{g.sub}</div>}
        </div>
      );
      break;
    }
    default: // headline
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={Math.min(big * 1.25, (w * 0.86) / Math.max(4, g.text.length * 0.42))} th={th} fx={g.fx} />}
          {g.sub && <Badge text={g.sub} f={f} delay={10} s={s} th={th} light={light} />}
        </div>
      );
  }
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: `${40 * s}px ${60 * s}px`, opacity: out, transform: `translateY(${(1 - out) * -20 * s}px)` }}>
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>{body}</div>
    </div>
  );
}
