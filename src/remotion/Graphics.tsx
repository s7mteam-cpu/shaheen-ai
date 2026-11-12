/** Animated explainer scenes (timer, counter, steps, compare…) drawn inside a box: the split panel, or a card over the footage. */
import React from "react";
import { Easing, Img, interpolate, random, spring } from "remotion";
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
const lum = (hex: string) => { const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };
export const isLight = (m: MontageSpec) => !DARK_BOARDS.includes(m.board ?? "soft") && (m.panel ?? "light") === "light";

/** Background of the graphics panel / lesson board. */
export function panelBackground(m: MontageSpec, light: boolean) {
  const a = m.colors.accent;
  switch (m.board ?? "soft") {
    case "paper": return "radial-gradient(130% 100% at 50% 0%, #FFFCF5 0%, #F6EFE1 100%)";
    case "sketch": return `repeating-linear-gradient(180deg, transparent 0 58px, rgba(27,42,74,.07) 58px 60px), #FBF8F1`;
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
  let overlay: React.ReactNode = null;

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
    case "scene": {
      // AI-drawn picture: slow push-in, a light sweep, our Arabic text on top
      const zoom = interpolate(f, [0, len], [1.04, 1.16]);
      const pan = interpolate(f, [0, len], [-1.5, 1.5]);
      const sweep = interpolate(f, [6, 30], [-60, 160], cl);
      const q = Math.min(1, pop(f, 4, 14));
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: out, borderRadius: 0 }}>
          {g.url ? <Img src={g.url} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom}) translateX(${pan}%)` }} />
            : <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${th.accent}55, ${m.colors.bg})` }} />}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(105deg, transparent ${sweep - 20}%, rgba(255,255,255,.28) ${sweep}%, transparent ${sweep + 20}%)` }} />
          {(g.text || g.sub) && (
            <div style={{ position: "absolute", left: 0, right: 0, top: 0, padding: `${50 * s}px ${50 * s}px ${90 * s}px`, background: "linear-gradient(180deg, rgba(0,0,0,.62), transparent)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * s }}>
              {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.82} th={{ ...th, text: "#fff" }} fx={g.fx} delay={6} />}
              {g.sub && <div style={{ padding: `${8 * s}px ${24 * s}px`, borderRadius: 999, background: th.accent, color: "#0E1B2C", fontSize: 36 * s, fontWeight: 800, transform: `scale(${q})` }}>{g.sub}</div>}
            </div>
          )}
        </div>
      );
    }
    case "cube": {
      const faces = (g.items ?? []).slice(0, 4);
      const size = 300 * s;
      const rot = interpolate(f, [0, len], [-30, -30 - 90 * Math.max(1, faces.length - 1)], { easing: Easing.inOut(Easing.cubic) });
      const q = Math.min(1, pop(f, 0, 14));
      const face = (i: number, tr: string) => (
        <div style={{ position: "absolute", width: size, height: size, transform: tr, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 * s, background: i % 2 ? th.accent : light ? "#16202C" : "#1E2B3E", border: `${4 * s}px solid rgba(255,255,255,.25)`, borderRadius: 26 * s, color: "#fff", fontSize: 44 * s, fontWeight: 900, textAlign: "center", padding: 20 * s, backfaceVisibility: "hidden" }}>
          {faces[i]?.icon && <MIcon name={faces[i].icon!} size={90 * s} color="#fff" stroke={2} />}{faces[i]?.label ?? ""}
        </div>
      );
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 90 * s }}>
          <div style={{ perspective: 1400 * s, width: size, height: size }}>
            <div style={{ position: "relative", width: size, height: size, transformStyle: "preserve-3d", transform: `scale(${q}) rotateX(-14deg) rotateY(${rot}deg)` }}>
              {face(0, `translateZ(${size / 2}px)`)}{face(1, `rotateY(90deg) translateZ(${size / 2}px)`)}{face(2, `rotateY(180deg) translateZ(${size / 2}px)`)}{face(3, `rotateY(-90deg) translateZ(${size / 2}px)`)}
            </div>
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.62} th={th} delay={6} />}
        </div>
      );
      break;
    }
    case "globe": {
      const R = 210 * s;
      const spin = (f * 2.2) % 360;
      const q = Math.min(1, pop(f, 0, 14));
      const lons = Array.from({ length: 8 }, (_, i) => ((i * 22.5 + spin) % 180) - 90);
      const pin = Math.min(1, pop(f, 16, 8));
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * s }}>
          <svg width={R * 2 + 20 * s} height={R * 2 + 20 * s} style={{ transform: `scale(${q})`, overflow: "visible" }}>
            <defs><radialGradient id="glb" cx="35%" cy="30%"><stop offset="0%" stopColor={th.accent} stopOpacity={0.55} /><stop offset="100%" stopColor={light ? "#16202C" : "#0A1A2E"} /></radialGradient></defs>
            <g transform={`translate(${R + 10 * s},${R + 10 * s})`}>
              <circle r={R} fill="url(#glb)" />
              {[-60, -30, 0, 30, 60].map((lat) => <ellipse key={lat} cx={0} cy={R * Math.sin((lat * Math.PI) / 180)} rx={R * Math.cos((lat * Math.PI) / 180)} ry={R * 0.12 * Math.cos((lat * Math.PI) / 180)} fill="none" stroke="rgba(255,255,255,.28)" strokeWidth={2 * s} />)}
              {lons.map((lo, i) => <ellipse key={i} cx={0} cy={0} rx={Math.abs(R * Math.sin((lo * Math.PI) / 180))} ry={R} fill="none" stroke="rgba(255,255,255,.32)" strokeWidth={2 * s} />)}
              <circle r={R} fill="none" stroke={th.accent} strokeWidth={4 * s} />
              <g transform={`translate(${R * 0.18},${-R * 0.22}) scale(${pin})`}><circle r={16 * s} fill={th.accent} /><circle r={34 * s} fill="none" stroke={th.accent} strokeWidth={4 * s} opacity={0.6 * (1 - ((f % 30) / 30))} transform={`scale(${1 + (f % 30) / 30})`} /></g>
            </g>
          </svg>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.62} th={th} delay={8} />}
        </div>
      );
      break;
    }
    case "text3d": {
      const rotY = interpolate(f, [0, len], [-24, 18], { easing: Easing.inOut(Easing.quad) });
      const q = Math.min(1, pop(f, 0, 12));
      const depth = 16;
      const shadow = Array.from({ length: depth }, (_, i) => `${(i + 1) * 1.6 * s}px ${(i + 1) * 1.6 * s}px 0 ${i < depth - 1 ? "#8A6A2A" : "rgba(0,0,0,.35)"}`).join(",");
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * s, perspective: 1200 * s }}>
          <div style={{ fontSize: Math.min(200 * s, (w * 0.85) / Math.max(3, (g.text ?? "").length * 0.5)), fontWeight: 900, color: th.accent, textShadow: shadow, transform: `rotateY(${rotY}deg) rotateX(8deg) scale(${q})`, lineHeight: 1.1, textAlign: "center" }}>{g.text}</div>
          {g.sub && <Badge text={g.sub} f={f} delay={12} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "plot": {
      const fn = String(g.hl || "sin");
      const F: Record<string, (x: number) => number> = { sin: Math.sin, cos: Math.cos, x2: (x) => (x * x) / 10, x3: (x) => (x * x * x) / 40, linear: (x) => x / 2, exp: (x) => Math.exp(x / 2.5) / 6, abs: (x) => Math.abs(x) / 2, sqrt: (x) => Math.sqrt(Math.abs(x)) * Math.sign(x) };
      const fx = F[fn] ?? Math.sin;
      const W = Math.min(w * 0.86, 880 * s), H = 420 * s, X0 = -6.3, X1 = 6.3;
      const ys = Array.from({ length: 121 }, (_, i) => fx(X0 + ((X1 - X0) * i) / 120));
      const Y = Math.max(1, ...ys.map(Math.abs));
      const px = (x: number) => ((x - X0) / (X1 - X0)) * W, py = (y: number) => H / 2 - (y / Y) * (H / 2 - 20 * s);
      const d = ys.map((y, i) => `${i ? "L" : "M"}${px(X0 + ((X1 - X0) * i) / 120).toFixed(1)},${py(y).toFixed(1)}`).join(" ");
      const k = interpolate(f, [6, Math.max(20, len - 12)], [0, 1], { ...cl, easing: Easing.inOut(Easing.quad) });
      const xk = X0 + (X1 - X0) * k;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * s }}>
          <div dir="ltr" style={{ fontSize: 64 * s, fontWeight: 800, fontStyle: "italic", color: th.text }}>{g.text || "y = sin(x)"}</div>
          <div style={{ padding: 24 * s, borderRadius: 30 * s, background: light ? "#14202E" : "rgba(0,0,0,.35)" }}>
            <svg width={W} height={H} style={{ overflow: "visible", direction: "ltr" }}>
              <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="rgba(255,255,255,.35)" strokeWidth={3 * s} />
              <line x1={W / 2} x2={W / 2} y1={0} y2={H} stroke="rgba(255,255,255,.35)" strokeWidth={3 * s} />
              <path d={d} fill="none" stroke={th.accent} strokeWidth={8 * s} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
              <circle cx={px(xk)} cy={py(fx(xk))} r={14 * s} fill="#fff" stroke={th.accent} strokeWidth={5 * s} />
            </svg>
            <div dir="ltr" style={{ textAlign: "center", fontSize: 34 * s, color: "rgba(255,255,255,.8)", fontWeight: 700, marginTop: 8 * s }}>x = {xk.toFixed(2)}</div>
          </div>
          {g.sub && <div style={{ fontSize: 40 * s, fontWeight: 700, color: th.soft }}>{g.sub}</div>}
        </div>
      );
      break;
    }
    case "geometry": {
      const shape = g.shape ?? "triangle";
      const S = 380 * s;
      const pts = shape === "triangle" ? [[S / 2, 20 * s], [S - 20 * s, S - 20 * s], [20 * s, S - 20 * s]] : shape === "hexagon" ? Array.from({ length: 6 }, (_, i) => [S / 2 + Math.cos((i * Math.PI) / 3) * S * 0.45, S / 2 + Math.sin((i * Math.PI) / 3) * S * 0.45]) : [[30 * s, 30 * s], [S - 30 * s, 30 * s], [S - 30 * s, S - 30 * s], [30 * s, S - 30 * s]];
      const d = shape === "circle" ? `M${S / 2},${30 * s} A${S / 2 - 30 * s},${S / 2 - 30 * s} 0 1 1 ${S / 2 - 0.1},${30 * s} Z` : `M${pts.map((p) => p.join(",")).join(" L")} Z`;
      const k = interpolate(f, [4, 30], [0, 1], { ...cl, easing: ease });
      const labels = g.items ?? [];
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * s }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.6} th={th} />}
          <svg width={S} height={S} style={{ overflow: "visible" }}>
            <path d={d} fill={th.accent} fillOpacity={0.14 * k} stroke={th.accent} strokeWidth={8 * s} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
            {shape !== "circle" && pts.map((p, i) => { const n = pts[(i + 1) % pts.length]; const lb = labels[i]?.label; if (!lb) return null; const mx = (p[0] + n[0]) / 2, my = (p[1] + n[1]) / 2; const cx = S / 2, cy = S / 2; return <text key={i} x={mx + (mx - cx) * 0.22} y={my + (my - cy) * 0.22} textAnchor="middle" dominantBaseline="middle" fontSize={38 * s} fontWeight={800} fill={th.text} opacity={interpolate(f, [24 + i * 4, 32 + i * 4], [0, 1], cl)}>{lb}</text>; })}
            {shape === "circle" && labels[0]?.label && <><line x1={S / 2} y1={S / 2} x2={S - 30 * s} y2={S / 2} stroke={th.text} strokeWidth={4 * s} strokeDasharray={`${10 * s} ${8 * s}`} opacity={k} /><text x={S * 0.7} y={S / 2 - 20 * s} textAnchor="middle" fontSize={38 * s} fontWeight={800} fill={th.text} opacity={k}>{labels[0].label}</text></>}
          </svg>
          {g.sub && <div dir="auto" style={{ fontSize: 46 * s, fontWeight: 800, color: th.accent, opacity: interpolate(f, [30, 40], [0, 1], cl) }}>{g.sub}</div>}
        </div>
      );
      break;
    }
    case "burst": {
      const q = Math.min(1.1, pop(f, 4, 8));
      const ring = interpolate(f, [0, len], [0, 140]);
      const parts = 18;
      body = (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * s }}>
          <div style={{ position: "relative", width: 300 * s, height: 300 * s }}>
            {Array.from({ length: parts }, (_, i) => {
              const a = (i / parts) * Math.PI * 2, r = interpolate(f, [4, 22], [40, 230 + random(`b${i}`) * 80], { ...cl, easing: ease }) * s;
              const o = interpolate(f, [4, 10, 26, 34], [0, 1, 1, 0], cl);
              return <div key={i} style={{ position: "absolute", left: 150 * s + Math.cos(a) * r, top: 150 * s + Math.sin(a) * r, width: (10 + (i % 3) * 6) * s, height: (10 + (i % 3) * 6) * s, borderRadius: i % 2 ? 999 : 3 * s, background: i % 3 ? th.accent : th.good, opacity: o, transform: `translate(-50%,-50%) rotate(${i * 30}deg)` }} />;
            })}
            <svg width={300 * s} height={300 * s} style={{ position: "absolute", inset: 0, transform: `rotate(${ring}deg) scale(${q})` }}><circle cx={150 * s} cy={150 * s} r={136 * s} fill="none" stroke={th.accent} strokeWidth={8 * s} strokeDasharray={`${18 * s} ${12 * s}`} /></svg>
            <div style={{ position: "absolute", inset: 30 * s, borderRadius: 999, background: th.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${q}) rotate(${(1 - Math.min(1, q)) * -30}deg)`, boxShadow: `0 ${14 * s}px ${40 * s}px rgba(0,0,0,.25)` }}>
              {g.icon ? <MIcon name={g.icon} size={120 * s} color="#fff" stroke={2.6} /> : <span style={{ color: "#fff", fontSize: 90 * s, fontWeight: 900 }}>{g.emoji || "تم"}</span>}
            </div>
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.72} th={th} delay={10} />}
        </div>
      );
      break;
    }
    case "confetti": {
      const n = 70;
      return (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: out }}>
          {Array.from({ length: n }, (_, i) => {
            const x = random(`cx${i}`) * w, delay = random(`cd${i}`) * 18, sp = 0.6 + random(`cs${i}`) * 0.8;
            const y = interpolate(f - delay, [0, 60 / sp], [-40, h + 40], { extrapolateLeft: "clamp" });
            const cols = [th.accent, th.good, th.bad, "#4F8BFF", "#FFD23F"];
            return <div key={i} style={{ position: "absolute", left: x + Math.sin((f + i * 7) / 8) * 30 * s, top: y, width: 18 * s, height: 30 * s, background: cols[i % cols.length], borderRadius: 4 * s, transform: `rotate(${(f + i * 13) * 6}deg) rotateX(${(f + i) * 9}deg)` }} />;
          })}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: `0 ${60 * s}px` }}>
            {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 1.05} th={th} delay={4} fx={g.fx} />}
          </div>
        </div>
      );
    }
    case "dotgrid": {
      const cols = 9, rows = 7, hi = Math.max(0, Math.round(g.value ?? 31)) % (cols * rows);
      const D = Math.min(w * 0.8, 820 * s) / cols;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * s }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${D}px)`, gap: 0 }}>
            {Array.from({ length: cols * rows }, (_, i) => {
              const c = i % cols, r = Math.floor(i / cols);
              const dist = Math.hypot(c - (hi % cols), r - Math.floor(hi / cols));
              const wave = Math.sin((f - dist * 3) / 6);
              const q = Math.min(1, pop(f, dist * 2, 14));
              return <div key={i} style={{ width: D, height: D, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: D * 0.5, height: D * 0.5, borderRadius: D * 0.12, background: i === hi ? "#FFC83D" : th.accent, opacity: i === hi ? 1 : 0.85, transform: `scale(${q * (i === hi ? 1.15 : 0.85 + wave * 0.12)}) rotate(${wave * 8}deg)` }} /></div>;
            })}
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.62} th={th} delay={10} />}
        </div>
      );
      break;
    }
    case "sketchbars": {
      const items = (g.items ?? []).slice(0, 4);
      const max = Math.max(1, ...items.map((i) => i.value ?? 0));
      const H = 340 * s, BW = 130 * s;
      const ink = light ? "#1B2A4A" : "#F1EEE6";
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * s, filter: "url(#rough)" }}>
          {g.text && <div style={{ fontSize: big * 0.6, fontWeight: 800, color: ink }}>{g.text}</div>}
          <svg width={items.length * (BW + 50 * s) + 40 * s} height={H + 80 * s} style={{ overflow: "visible", direction: "ltr" }}>
            <defs><pattern id="hatch" width={14 * s} height={14 * s} patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><line x1={0} y1={0} x2={0} y2={14 * s} stroke={th.accent} strokeWidth={5 * s} /></pattern></defs>
            <line x1={10 * s} y1={H} x2={items.length * (BW + 50 * s) + 30 * s} y2={H + 4 * s} stroke={ink} strokeWidth={5 * s} strokeLinecap="round" />
            {[...items].reverse().map((it, i) => {
              const k = interpolate(f, [6 + i * 6, 24 + i * 6], [0, 1], { ...cl, easing: ease });
              const bh = (H - 20 * s) * ((it.value ?? 0) / max) * k, x = 30 * s + i * (BW + 50 * s);
              return <g key={i}><rect x={x} y={H - bh} width={BW} height={bh} fill="url(#hatch)" stroke={ink} strokeWidth={5 * s} rx={4 * s} /><text x={x + BW / 2} y={H + 50 * s} textAnchor="middle" fontSize={36 * s} fontWeight={800} fill={ink}>{it.label}</text></g>;
            })}
          </svg>
        </div>
      );
      break;
    }
    case "price": {
      const oldV = g.values?.[0], newV = g.values?.[1] ?? g.value;
      const strike = interpolate(f, [10, 20], [0, 1], cl);
      const q = Math.min(1.05, pop(f, 16, 9));
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * s }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.7} th={th} />}
          <div style={{ display: "flex", alignItems: "center", gap: 40 * s, direction: "rtl" }}>
            {oldV !== undefined && <div style={{ position: "relative", fontSize: 90 * s, fontWeight: 800, color: th.soft }}>{oldV}<span style={{ fontSize: 40 * s }}> {g.suffix ?? "د.ك"}</span><div style={{ position: "absolute", top: "52%", right: -10 * s, width: `calc(${strike * 100}% + ${20 * s}px)`, height: 10 * s, background: th.bad, borderRadius: 9, transform: "rotate(-8deg)" }} /></div>}
            <div style={{ padding: `${16 * s}px ${36 * s}px`, borderRadius: 30 * s, background: th.accent, color: "#0E1B2C", fontSize: 140 * s, fontWeight: 900, lineHeight: 1, transform: `scale(${q}) rotate(${(1 - Math.min(1, q)) * 8}deg)`, boxShadow: `0 ${16 * s}px ${40 * s}px rgba(0,0,0,.25)` }}>{newV ?? ""}<span style={{ fontSize: 50 * s }}> {g.suffix ?? "د.ك"}</span></div>
          </div>
          {g.sub && <Badge text={g.sub} f={f} delay={22} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "offer": {
      const q = Math.min(1.08, pop(f, 0, 8));
      const R = 190 * s;
      const pts = Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * Math.PI * 2, r = i % 2 ? R * 0.86 : R; return `${R + Math.cos(a) * r},${R + Math.sin(a) * r}`; }).join(" ");
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * s }}>
          <div style={{ position: "relative", width: R * 2, height: R * 2, transform: `scale(${q}) rotate(${interpolate(f, [0, len], [-12, 6])}deg)` }}>
            <svg width={R * 2} height={R * 2} style={{ position: "absolute", inset: 0 }}><polygon points={pts} fill={th.bad} /></svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", lineHeight: 1 }}>
              <span style={{ fontSize: 40 * s, fontWeight: 800 }}>{g.hl || "خصم"}</span>
              <span dir="ltr" style={{ fontSize: 130 * s, fontWeight: 900 }}>{g.value ?? 30}%</span>
            </div>
          </div>
          {g.text && <Words text={g.text} f={f} size={big * 0.68} th={th} delay={10} />}
          {g.sub && <Badge text={g.sub} f={f} delay={18} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "menu": {
      const items = (g.items ?? []).slice(0, 6);
      body = (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 0, padding: `${30 * s}px ${36 * s}px`, borderRadius: 34 * s, background: th.card, border: `${3 * s}px solid ${th.line}`, direction: "rtl" }}>
          <div style={{ textAlign: "center", fontSize: 58 * s, fontWeight: 900, color: th.accent, marginBottom: 14 * s }}>{g.text || "المنيو"}</div>
          {items.map((it, i) => {
            const q = interpolate(f, [6 + i * 5, 14 + i * 5], [0, 1], cl);
            return <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 14 * s, padding: `${12 * s}px 0`, opacity: q, transform: `translateX(${(1 - q) * -40 * s}px)` }}>
              <span style={{ fontSize: 44 * s, fontWeight: 800, color: th.text, whiteSpace: "nowrap" }}>{it.label}</span>
              <span style={{ flex: 1, borderBottom: `${3 * s}px dotted ${th.line}`, transform: `translateY(-${8 * s}px)` }} />
              {it.value !== undefined && <span style={{ fontSize: 44 * s, fontWeight: 900, color: th.accent, whiteSpace: "nowrap" }}>{it.value} {g.suffix ?? "د.ك"}</span>}
            </div>;
          })}
        </div>
      );
      break;
    }
    case "rating":
    case "testimonial": {
      const stars = Math.max(1, Math.min(5, Math.round(g.value ?? 5)));
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * s, width: "100%", ...(g.kind === "testimonial" ? { padding: `${36 * s}px ${40 * s}px`, borderRadius: 34 * s, background: th.card, border: `${3 * s}px solid ${th.line}` } : {}) }}>
          <div style={{ display: "flex", gap: 14 * s, direction: "ltr" }}>
            {Array.from({ length: 5 }, (_, i) => { const q = Math.min(1, pop(f, 4 + i * 4, 9)); return <div key={i} style={{ transform: `scale(${q}) rotate(${(1 - q) * 90}deg)` }}><svg width={86 * s} height={86 * s} viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill={i < stars ? "#FFC83D" : th.line} /></svg></div>; })}
          </div>
          {g.kind === "rating" && (g.suffix || g.value) && <div dir="ltr" style={{ fontSize: 64 * s, fontWeight: 900, color: th.text }}>{!g.suffix ? `${g.value}/5` : /^[/%]/.test(g.suffix) ? `${g.value ?? 5}${g.suffix}` : g.suffix}</div>}
          {g.text && <Words text={g.kind === "testimonial" ? `“${g.text}”` : g.text} hl={g.hl} f={f} size={big * (g.kind === "testimonial" ? 0.55 : 0.65)} th={th} delay={20} />}
          {g.sub && <div style={{ fontSize: 38 * s, fontWeight: 700, color: th.soft, opacity: interpolate(f, [28, 38], [0, 1], cl) }}>— {g.sub}</div>}
        </div>
      );
      break;
    }
    case "contact":
    case "hours": {
      const items = (g.items ?? []).slice(0, 6);
      body = (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 * s, direction: "rtl" }}>
          {g.text && <div style={{ textAlign: "center", marginBottom: 8 * s }}><Words text={g.text} hl={g.hl} f={f} size={big * 0.62} th={th} /></div>}
          {items.map((it, i) => {
            const q = Math.min(1, pop(f, 8 + i * 6, 13));
            const [k, v] = it.label.includes(":") ? it.label.split(/:(.+)/) : [it.label, ""];
            return <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 * s, padding: `${16 * s}px ${24 * s}px`, borderRadius: 24 * s, background: th.card, border: `${2 * s}px solid ${th.line}`, opacity: q, transform: `translateY(${(1 - q) * 30 * s}px)` }}>
              <div style={{ width: 70 * s, height: 70 * s, borderRadius: 20 * s, flexShrink: 0, background: th.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><MIcon name={it.icon ?? (g.kind === "hours" ? "clock" : "phone")} size={40 * s} color="#fff" stroke={2.2} /></div>
              <span style={{ fontSize: 42 * s, fontWeight: 800, color: th.text }}>{k}</span>
              {v && <span dir="auto" style={{ marginInlineStart: "auto", fontSize: 40 * s, fontWeight: 700, color: th.accent }}>{v}</span>}
            </div>;
          })}
        </div>
      );
      break;
    }
    case "specs": {
      const items = (g.items ?? []).slice(0, 6);
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * s, width: "100%" }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.62} th={th} />}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length > 4 ? 3 : 2}, 1fr)`, gap: 18 * s, width: "100%", direction: "rtl" }}>
            {items.map((it, i) => { const q = Math.min(1, pop(f, 6 + i * 5, 13)); return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * s, padding: `${22 * s}px ${12 * s}px`, borderRadius: 26 * s, background: th.card, border: `${2 * s}px solid ${th.line}`, transform: `scale(${q})` }}>
                <MIcon name={it.icon ?? "check"} size={64 * s} color={th.accent} stroke={2} />
                {it.value !== undefined && <span style={{ fontSize: 54 * s, fontWeight: 900, color: th.text, lineHeight: 1 }}>{it.value}</span>}
                <span style={{ fontSize: 34 * s, fontWeight: 700, color: th.soft, textAlign: "center" }}>{it.label}</span>
              </div>); })}
          </div>
        </div>
      );
      break;
    }
    case "appointment": {
      const q = Math.min(1, pop(f, 0, 13));
      const tick = Math.min(1, pop(f, Math.round(len * 0.5), 9));
      const days = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس"];
      const pick = Math.max(0, Math.min(4, Math.round(g.value ?? 2)));
      body = (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 20 * s, padding: `${30 * s}px`, borderRadius: 34 * s, background: th.card, border: `${3 * s}px solid ${th.line}`, transform: `scale(${0.9 + 0.1 * q})`, opacity: q, direction: "rtl" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 * s, fontSize: 50 * s, fontWeight: 900, color: th.text }}><MIcon name="calendar" size={56 * s} color={th.accent} stroke={2.2} />{g.text || "احجز موعدك"}</div>
          <div style={{ display: "flex", gap: 12 * s }}>{days.map((d, i) => <div key={d} style={{ flex: 1, padding: `${18 * s}px 0`, borderRadius: 18 * s, textAlign: "center", fontSize: 32 * s, fontWeight: 800, background: i === pick && tick > 0.1 ? th.accent : "transparent", color: i === pick && tick > 0.1 ? "#fff" : th.soft, border: `${2 * s}px solid ${th.line}`, transform: i === pick ? `scale(${1 + 0.08 * tick})` : "none" }}>{d}</div>)}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 * s, padding: `${16 * s}px`, borderRadius: 999, background: th.good, color: "#fff", fontSize: 42 * s, fontWeight: 900, opacity: tick, transform: `scale(${tick})` }}><MIcon name="check" size={44 * s} color="#fff" stroke={3} />{g.sub || "تم الحجز"}</div>
        </div>
      );
      break;
    }
    case "beforeafter": {
      const k = interpolate(f, [8, Math.max(20, len * 0.7)], [0.92, 0.08], { ...cl, easing: Easing.inOut(Easing.cubic) });
      const W = Math.min(w * 0.9, 900 * s), H = Math.min(h * 0.7, 640 * s);
      const half = (after: boolean) => after
        ? <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${th.accent}, ${th.good})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 70 * s, fontWeight: 900, textAlign: "center", padding: 30 * s }}>{g.good || "بعد"}</div>
        : <div style={{ position: "absolute", inset: 0, background: light ? "#C9CED6" : "#2A3240", filter: "grayscale(1)", display: "flex", alignItems: "center", justifyContent: "center", color: light ? "#4A5568" : "#AAB", fontSize: 70 * s, fontWeight: 900, textAlign: "center", padding: 30 * s }}>{g.bad || "قبل"}</div>;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * s }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.6} th={th} />}
          <div style={{ position: "relative", width: W, height: H, borderRadius: 30 * s, overflow: "hidden", boxShadow: `0 ${16 * s}px ${40 * s}px rgba(0,0,0,.2)` }}>
            {half(true)}
            <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${k * 100}%)` }}>{half(false)}</div>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${k * 100}%`, width: 8 * s, background: "#fff", transform: "translateX(-50%)" }} />
            <div style={{ position: "absolute", top: "50%", left: `${k * 100}%`, width: 76 * s, height: 76 * s, borderRadius: 999, background: "#fff", transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 * s, fontWeight: 900, color: "#0E1B2C" }}>⇆</div>
          </div>
        </div>
      );
      break;
    }
    case "countdown": {
      const startS = Math.max(1, Math.round(g.value ?? 3 * 3600 + 59 * 60 + 59));
      const left = Math.max(0, startS - Math.floor(f / MFPS * 37));
      const hh = String(Math.floor(left / 3600)).padStart(2, "0"), mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
      const box = (v: string, l: string) => <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * s }}><div style={{ width: 190 * s, padding: `${18 * s}px 0`, borderRadius: 26 * s, background: light ? "#16202C" : "rgba(255,255,255,.1)", color: "#fff", fontSize: 120 * s, fontWeight: 900, textAlign: "center", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{v}</div><span style={{ fontSize: 30 * s, fontWeight: 700, color: th.soft }}>{l}</span></div>;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 * s }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.68} th={th} />}
          <div dir="ltr" style={{ display: "flex", gap: 18 * s, alignItems: "flex-start", opacity: Math.min(1, pop(f, 4, 14)) }}>{box(hh, "ساعة")}<span style={{ fontSize: 100 * s, fontWeight: 900, color: th.accent }}>:</span>{box(mm, "دقيقة")}<span style={{ fontSize: 100 * s, fontWeight: 900, color: th.accent }}>:</span>{box(ss, "ثانية")}</div>
          {g.sub && <Badge text={g.sub} f={f} delay={14} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "delivery": {
      const W = Math.min(w * 0.9, 900 * s);
      const k = interpolate(f, [4, Math.max(20, len - 10)], [0, 1], { ...cl, easing: Easing.inOut(Easing.quad) });
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * s }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.7} th={th} />}
          <div style={{ position: "relative", width: W, height: 200 * s, direction: "ltr" }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: 150 * s, borderTop: `${6 * s}px dashed ${th.line}` }} />
            <div style={{ position: "absolute", left: 0, width: `${k * 100}%`, top: 150 * s, borderTop: `${6 * s}px solid ${th.accent}` }} />
            <div style={{ position: "absolute", right: 0, top: 70 * s, transform: "translateX(30%)" }}><MIcon name="pin" size={90 * s} color={th.accent} stroke={2.2} /></div>
            <div style={{ position: "absolute", left: `calc(${k * 100}% - ${90 * s}px)`, top: 50 * s, fontSize: 110 * s, transform: `scaleX(-1) translateY(${Math.sin(f / 2) * 3 * s}px)` }}>🛵</div>
          </div>
          {g.sub && <Badge text={g.sub} f={f} delay={10} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "dish": {
      // a hot dish (or cup) with steam rising
      const q = Math.min(1, pop(f, 0, 12));
      const E = g.emoji || "🍲";
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * s }}>
          <div style={{ position: "relative", width: 420 * s, height: 420 * s, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <svg width={420 * s} height={260 * s} style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
              {[0, 1, 2].map((i) => {
                const ph = (f + i * 14) % 42, o = interpolate(ph, [0, 10, 32, 42], [0, 0.75, 0.5, 0], cl);
                const x = 150 * s + i * 60 * s, y = 230 * s - ph * 5 * s;
                return <path key={i} d={`M${x},${y + 60 * s} C${x - 26 * s},${y + 40 * s} ${x + 26 * s},${y + 20 * s} ${x},${y}`} fill="none" stroke={light ? "rgba(14,27,44,.35)" : "rgba(255,255,255,.7)"} strokeWidth={9 * s} strokeLinecap="round" opacity={o * q} />;
              })}
            </svg>
            <span style={{ fontSize: 250 * s, lineHeight: 1, transform: `scale(${q}) translateY(${(1 - q) * 40 * s}px)`, filter: `drop-shadow(0 ${20 * s}px ${30 * s}px rgba(0,0,0,.3))` }}>{E}</span>
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.75} th={th} delay={8} fx={g.fx} />}
          {g.sub && <Badge text={g.sub} f={f} delay={16} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "shine": {
      // any product (car, ring, phone, dress…) with a light sweep and sparkles
      const q = Math.min(1, pop(f, 0, 12));
      const sweep = interpolate(f % 50, [0, 30], [-60, 160], cl);
      const E = g.emoji || "✨";
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * s }}>
          <div style={{ position: "relative", width: 440 * s, height: 360 * s, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 260 * s, lineHeight: 1, transform: `scale(${q})`, WebkitMaskImage: "none" }}>{E}</span>
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(110deg, transparent ${sweep - 14}%, rgba(255,255,255,.75) ${sweep}%, transparent ${sweep + 14}%)`, mixBlendMode: "overlay" }} />
            {Array.from({ length: 6 }, (_, i) => { const ph = (f + i * 9) % 36, k = interpolate(ph, [0, 8, 18], [0, 1, 0], cl); return <svg key={i} width={60 * s} height={60 * s} viewBox="0 0 24 24" style={{ position: "absolute", left: `${12 + random(`sx${i}`) * 72}%`, top: `${8 + random(`sy${i}`) * 70}%`, transform: `scale(${k}) rotate(${ph * 5}deg)` }}><path d="M12 1l2.2 8.8L23 12l-8.8 2.2L12 23l-2.2-8.8L1 12l8.8-2.2z" fill={i % 2 ? "#fff" : th.accent} /></svg>; })}
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.75} th={th} delay={8} fx={g.fx} />}
          {g.sub && <Badge text={g.sub} f={f} delay={16} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "mist": {
      // perfume bottle drawn in SVG, golden mist drifting out
      const q = Math.min(1, pop(f, 0, 14));
      const W = 300 * s, H = 420 * s;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * s }}>
          <div style={{ position: "relative", width: W * 2, height: H }}>
            {Array.from({ length: 22 }, (_, i) => { const ph = (f + i * 5) % 60, x = W * 1.05 + ph * 6 * s * (0.6 + random(`m${i}`)), y = H * 0.18 - ph * 1.6 * s + Math.sin((f + i * 10) / 7) * 14 * s; return <div key={i} style={{ position: "absolute", left: x, top: y, width: (8 + (i % 4) * 6) * s, height: (8 + (i % 4) * 6) * s, borderRadius: 999, background: th.accent, opacity: interpolate(ph, [0, 10, 60], [0, 0.55, 0], cl) * q, filter: `blur(${(i % 3) * 2 * s}px)` }} />; })}
            <svg width={W} height={H} viewBox="0 0 100 140" style={{ position: "absolute", left: W * 0.5, top: 0, transform: `scale(${q})`, filter: `drop-shadow(0 ${16 * s}px ${30 * s}px rgba(0,0,0,.35))` }}>
              <defs><linearGradient id="btl" x1="0" x2="1"><stop offset="0" stopColor={th.accent} stopOpacity=".95" /><stop offset=".5" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor={th.accent} stopOpacity=".9" /></linearGradient></defs>
              <rect x="40" y="6" width="20" height="16" rx="3" fill={light ? "#1A2433" : "#E9E2D2"} />
              <rect x="44" y="22" width="12" height="10" fill={light ? "#2A3646" : "#CFC6B2"} />
              <rect x="14" y="32" width="72" height="100" rx="18" fill="url(#btl)" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" />
              <rect x="30" y="66" width="40" height="30" rx="4" fill="rgba(255,255,255,.75)" />
              <rect x={-60 + ((f * 3) % 220)} y="32" width="14" height="100" fill="rgba(255,255,255,.35)" transform="skewX(-12)" />
            </svg>
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.72} th={th} delay={8} fx={g.fx} />}
          {g.sub && <Badge text={g.sub} f={f} delay={16} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "ecg": {
      const W = Math.min(w * 0.88, 900 * s), H = 260 * s;
      const beat = (x: number) => { const p = x % 1; return p < 0.4 ? 0 : p < 0.45 ? -0.2 : p < 0.5 ? 1 : p < 0.55 ? -0.6 : p < 0.62 ? 0.15 : 0; };
      const pts = Array.from({ length: 241 }, (_, i) => `${(i / 240) * W},${H / 2 - beat(i / 60) * H * 0.42}`).join(" ");
      const k = interpolate(f, [0, Math.max(20, len - 8)], [0, 1], cl);
      const pulse = 1 + Math.max(0, Math.sin((f / MFPS) * Math.PI * 2 * 1.2)) * 0.12;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 * s, direction: "ltr" }}>
            <svg width={90 * s} height={90 * s} viewBox="0 0 24 24" style={{ transform: `scale(${pulse})` }}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={th.bad} /></svg>
            <span style={{ fontSize: 90 * s, fontWeight: 900, color: th.text }}>{g.value ?? 72}</span><span style={{ fontSize: 36 * s, fontWeight: 700, color: th.soft }}>{g.suffix ?? "BPM"}</span>
          </div>
          <svg width={W} height={H} style={{ overflow: "visible" }}><polyline points={pts} fill="none" stroke={th.good} strokeWidth={7 * s} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} /></svg>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.62} th={th} delay={10} />}
        </div>
      );
      break;
    }
    case "flight": {
      const W = Math.min(w * 0.9, 900 * s), H = 300 * s;
      const k = interpolate(f, [4, Math.max(20, len - 10)], [0, 1], { ...cl, easing: Easing.inOut(Easing.quad) });
      const P = (t: number) => ({ x: W * 0.06 + t * W * 0.88, y: H * 0.85 - Math.sin(t * Math.PI) * H * 0.7 });
      const a = P(k), b = P(Math.min(1, k + 0.01));
      const [from, to] = [g.items?.[0]?.label ?? "الكويت", g.items?.[1]?.label ?? ""];
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * s }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.7} th={th} />}
          <div style={{ position: "relative", width: W, height: H + 60 * s, direction: "ltr" }}>
            <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <path d={`M${P(0).x},${P(0).y} Q${W / 2},${-H * 0.55} ${P(1).x},${P(1).y}`} fill="none" stroke={th.line} strokeWidth={5 * s} strokeDasharray={`${12 * s} ${10 * s}`} />
              <circle cx={P(0).x} cy={P(0).y} r={14 * s} fill={th.accent} /><circle cx={P(1).x} cy={P(1).y} r={14 * s} fill={th.accent} />
            </svg>
            <div style={{ position: "absolute", left: a.x, top: a.y, fontSize: 80 * s, transform: `translate(-50%,-50%) rotate(${(Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 45}deg)` }}>✈️</div>
            <div style={{ position: "absolute", left: 0, top: H + 6 * s, fontSize: 38 * s, fontWeight: 800, color: th.text }}>{from}</div>
            <div style={{ position: "absolute", right: 0, top: H + 6 * s, fontSize: 38 * s, fontWeight: 800, color: th.accent, opacity: interpolate(k, [0.8, 1], [0.3, 1], cl) }}>{to}</div>
          </div>
          {g.sub && <Badge text={g.sub} f={f} delay={14} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "scales": {
      const tilt = interpolate(f, [8, 30], [0, (g.value ?? 1) >= 1 ? -12 : 12], { ...cl, easing: Easing.out(Easing.back(2)) });
      const S = 440 * s, ink = th.accent;
      const pan = (x: number, lbl?: string) => <g transform={`translate(${x},${0})`}><line x1={0} y1={0} x2={-50 * s} y2={110 * s} stroke={ink} strokeWidth={4 * s} /><line x1={0} y1={0} x2={50 * s} y2={110 * s} stroke={ink} strokeWidth={4 * s} /><path d={`M${-80 * s},${110 * s} Q0,${170 * s} ${80 * s},${110 * s} Z`} fill={ink} />{lbl && <text x={0} y={205 * s} textAnchor="middle" fontSize={34 * s} fontWeight={800} fill={th.text}>{lbl}</text>}</g>;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * s }}>
          <svg width={S} height={S * 0.9} style={{ overflow: "visible" }}>
            <rect x={S / 2 - 8 * s} y={60 * s} width={16 * s} height={S * 0.62} fill={ink} /><rect x={S / 2 - 90 * s} y={S * 0.7} width={180 * s} height={22 * s} rx={8 * s} fill={ink} /><circle cx={S / 2} cy={50 * s} r={20 * s} fill={ink} />
            <g transform={`rotate(${tilt} ${S / 2} ${60 * s})`}>
              <line x1={40 * s} y1={60 * s} x2={S - 40 * s} y2={60 * s} stroke={ink} strokeWidth={10 * s} strokeLinecap="round" />
              <g transform={`translate(0,${60 * s})`}>{pan(40 * s, g.items?.[0]?.label)}{pan(S - 40 * s, g.items?.[1]?.label)}</g>
            </g>
          </svg>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.62} th={th} delay={10} />}
        </div>
      );
      break;
    }
    case "shutter": {
      const flash = interpolate(f, [10, 13, 22], [0, 1, 0], cl);
      const close = interpolate(f, [4, 10, 14, 20], [0, 1, 1, 0], cl);
      const R = 170 * s;
      overlay = <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash * 0.85 }} />;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * s }}>
          <div style={{ position: "relative", width: R * 2, height: R * 2 }}>
            <svg width={R * 2} height={R * 2}>
              <circle cx={R} cy={R} r={R - 6 * s} fill={light ? "#16202C" : "#0A0F18"} stroke={th.accent} strokeWidth={10 * s} />
              {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${R},${R} L${R + Math.cos((i / 6) * Math.PI * 2) * R},${R + Math.sin((i / 6) * Math.PI * 2) * R} L${R + Math.cos(((i + 1) / 6) * Math.PI * 2) * R},${R + Math.sin(((i + 1) / 6) * Math.PI * 2) * R} Z`} fill={i % 2 ? "#2A3646" : "#3A4658"} transform={`rotate(${close * 30} ${R} ${R})`} opacity={close} />)}
              <circle cx={R} cy={R} r={(R - 30 * s) * (1 - close * 0.8)} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth={4 * s} />
            </svg>
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.72} th={th} delay={16} fx={g.fx} />}
        </div>
      );
      break;
    }
    case "giftbox": {
      const open = Math.min(1, pop(f, 14, 9));
      const shake = f < 14 ? Math.sin(f * 1.6) * 6 * (f / 14) : 0;
      const B = 260 * s;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * s }}>
          <div style={{ position: "relative", width: B * 1.5, height: B * 1.5, transform: `rotate(${shake}deg)` }}>
            {Array.from({ length: 16 }, (_, i) => { const a = -Math.PI / 2 + ((i / 15) - 0.5) * 2.2, r = open * (160 + random(`g${i}`) * 120) * s; return <div key={i} style={{ position: "absolute", left: B * 0.75 + Math.cos(a) * r, top: B * 0.55 + Math.sin(a) * r, width: 16 * s, height: 16 * s, borderRadius: i % 2 ? 999 : 3 * s, background: [th.accent, th.good, th.bad, "#4F8BFF"][i % 4], opacity: interpolate(f, [14, 20, 40], [0, 1, 0], cl) }} />; })}
            <div style={{ position: "absolute", left: B * 0.25, top: B * 0.6, width: B, height: B * 0.8, borderRadius: 18 * s, background: th.accent }} />
            <div style={{ position: "absolute", left: B * 0.25 + B / 2 - 18 * s, top: B * 0.6, width: 36 * s, height: B * 0.8, background: th.bad }} />
            <div style={{ position: "absolute", left: B * 0.18, top: B * 0.42, width: B * 1.14, height: B * 0.22, borderRadius: 14 * s, background: th.accent, filter: "brightness(1.1)", transform: `translate(${open * 60 * s}px, ${-open * 140 * s}px) rotate(${open * 24}deg)` }} />
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.75} th={th} delay={16} fx={g.fx} />}
          {g.sub && <Badge text={g.sub} f={f} delay={22} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "house": {
      const k = interpolate(f, [2, 30], [0, 1], { ...cl, easing: ease });
      const key = Math.min(1, pop(f, 30, 10));
      const S = 420 * s;
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * s }}>
          <div style={{ position: "relative", width: S, height: S * 0.85 }}>
            <svg width={S} height={S * 0.85} viewBox="0 0 120 100" style={{ overflow: "visible" }}>
              <path d="M10 48 L60 8 L110 48 M22 40 V94 H98 V40 M50 94 V66 H70 V94 M30 54 H44 V66 H30 Z M76 54 H90 V66 H76 Z" fill="none" stroke={th.accent} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
              <rect x="22" y="40" width="76" height="54" fill={th.accent} opacity={0.12 * k} />
            </svg>
            <div style={{ position: "absolute", right: -20 * s, bottom: 10 * s, fontSize: 110 * s, transform: `scale(${key}) rotate(${(1 - key) * -60}deg)` }}>🔑</div>
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.72} th={th} delay={12} fx={g.fx} />}
          {g.sub && <Badge text={g.sub} f={f} delay={30} s={s} th={th} light={light} />}
        </div>
      );
      break;
    }
    case "ring": {
      const v = Math.max(0, Math.min(100, g.value ?? 80));
      const R = 180 * s, sw = 34 * s, C = 2 * Math.PI * (R - sw / 2);
      const k = interpolate(f, [4, 36], [0, 1], { ...cl, easing: ease });
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * s }}>
          <div style={{ position: "relative", width: R * 2, height: R * 2 }}>
            <svg width={R * 2} height={R * 2}>
              <circle cx={R} cy={R} r={R - sw / 2} fill="none" stroke={th.line} strokeWidth={sw} />
              <circle cx={R} cy={R} r={R - sw / 2} fill="none" stroke={th.good} strokeWidth={sw} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (v / 100) * k)} transform={`rotate(-90 ${R} ${R})`} />
              <circle cx={R} cy={R} r={R - sw * 1.6} fill="none" stroke={th.accent} strokeWidth={sw * 0.6} strokeLinecap="round" strokeDasharray={C * 0.8} strokeDashoffset={C * 0.8 * (1 - Math.min(1, (v / 100) * k * 1.15))} transform={`rotate(-90 ${R} ${R})`} opacity={0.85} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
              {g.icon && <MIcon name={g.icon} size={60 * s} color={th.accent} stroke={2.2} />}
              <span style={{ fontSize: 90 * s, fontWeight: 900, color: th.text }}>{g.suffix ? `${Math.round((g.values?.[0] ?? v) * k)}` : `${Math.round(v * k)}%`}</span>
              {g.suffix && <span style={{ fontSize: 34 * s, fontWeight: 700, color: th.soft }}>{g.suffix}</span>}
            </div>
          </div>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.65} th={th} delay={10} />}
        </div>
      );
      break;
    }
    case "map":
    case "route": {
      // stylised city map (not a real map): streets, a park, the sea; a pin drops (map) or a route draws itself (route)
      const W = Math.min(w * 0.9, 860 * s), H = W * 0.78, r = 34 * s;
      const land = light ? "#EEF0EA" : "#1C2733", road = light ? "#FFFFFF" : "#2E3B4A", park = light ? "#CFE8C6" : "#23402F", sea = light ? "#BFE0F2" : "#183650", edge = light ? "rgba(0,0,0,.08)" : "rgba(255,255,255,.08)";
      const reveal = interpolate(f, [0, 10], [0, 1], { ...cl, easing: ease });
      const streets = [0.18, 0.42, 0.66, 0.88].map((y) => `M0,${y * H} L${W},${y * H}`).concat([0.14, 0.38, 0.62, 0.84].map((x) => `M${x * W},0 L${x * W},${H}`));
      // route follows the streets: from bottom-left block to top-right block
      const pts = [[0.14, 0.88], [0.38, 0.88], [0.38, 0.66], [0.62, 0.66], [0.62, 0.42], [0.84, 0.42], [0.84, 0.18]].map(([x, y]) => [x * W, y * H]);
      const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
      const total = segs.reduce((a, b) => a + b, 0);
      const k = g.kind === "route" ? interpolate(f, [10, Math.max(26, len - 14)], [0, 1], { ...cl, easing: Easing.inOut(Easing.quad) }) : 0;
      let d = k * total, i = 0;
      while (i < segs.length - 1 && d > segs[i]) { d -= segs[i]; i++; }
      const t = segs[i] ? Math.min(1, d / segs[i]) : 1;
      const car = [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
      const target = g.kind === "route" ? pts[pts.length - 1] : [W * 0.5, H * 0.54];
      const drop = g.kind === "route" ? pop(f, Math.max(20, len - 16), 9) : pop(f, 10, 8);
      const ripple = ((f - 16) % 30) / 30;
      const Pin = ({ x, y, sc, color }: { x: number; y: number; sc: number; color: string }) => (
        <g transform={`translate(${x},${y}) scale(${sc})`}>
          <ellipse cx={0} cy={4 * s} rx={22 * s} ry={8 * s} fill="rgba(0,0,0,.25)" />
          <path d={`M0,0 C${-10 * s},${-22 * s} ${-38 * s},${-40 * s} ${-38 * s},${-70 * s} A${38 * s},${38 * s} 0 1 1 ${38 * s},${-70 * s} C${38 * s},${-40 * s} ${10 * s},${-22 * s} 0,0 Z`} fill={color} />
          <circle cx={0} cy={-70 * s} r={15 * s} fill="#fff" />
        </g>
      );
      const [from, to] = [g.items?.[0]?.label, g.items?.[1]?.label];
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * s }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={big * 0.66} th={th} />}
          <div style={{ position: "relative", width: W, height: H, borderRadius: r, overflow: "hidden", boxShadow: `0 ${20 * s}px ${60 * s}px rgba(0,0,0,.3)`, border: `${3 * s}px solid ${edge}`, opacity: reveal, transform: `scale(${0.92 + 0.08 * reveal})`, direction: "ltr" }}>
            <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
              <rect width={W} height={H} fill={land} />
              <path d={`M${W * 0.7},${H} C${W * 0.78},${H * 0.8} ${W * 0.95},${H * 0.78} ${W},${H * 0.62} L${W},${H} Z`} fill={sea} />
              <rect x={W * 0.16} y={H * 0.2} width={W * 0.2} height={H * 0.2} rx={14 * s} fill={park} />
              <rect x={W * 0.64} y={H * 0.68} width={W * 0.18} height={H * 0.18} rx={14 * s} fill={park} opacity={0.8} />
              {streets.map((p, j) => <path key={j} d={p} stroke={road} strokeWidth={(j % 4 === 1 ? 26 : 16) * s} strokeLinecap="round" />)}
              {g.kind === "route" && (
                <>
                  <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={th.accent} strokeOpacity={0.25} strokeWidth={14 * s} strokeLinejoin="round" strokeLinecap="round" />
                  <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={th.accent} strokeWidth={14 * s} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} />
                  <circle cx={pts[0][0]} cy={pts[0][1]} r={18 * s} fill={th.text === "#FFFFFF" ? "#fff" : "#0E1B2C"} stroke={th.accent} strokeWidth={7 * s} />
                  <circle cx={car[0]} cy={car[1]} r={20 * s} fill={th.accent} stroke="#fff" strokeWidth={6 * s} />
                </>
              )}
              {g.kind === "map" && f > 16 && <circle cx={target[0]} cy={target[1]} r={(20 + ripple * 120) * s} fill="none" stroke={th.accent} strokeWidth={6 * s} opacity={1 - ripple} />}
              <Pin x={target[0]} y={target[1] - (1 - Math.min(1, drop)) * 140 * s} sc={Math.max(0.01, Math.min(1.15, drop))} color={th.accent} />
            </svg>
            {g.kind === "route" && from && <div style={{ position: "absolute", left: pts[0][0], top: pts[0][1] - 70 * s, transform: "translateX(-20%)", padding: `${6 * s}px ${16 * s}px`, borderRadius: 999, background: light ? "#fff" : "#0E1B2C", color: light ? "#0E1B2C" : "#fff", fontSize: 30 * s, fontWeight: 800, boxShadow: "0 4px 14px rgba(0,0,0,.2)", whiteSpace: "nowrap" }}>{from}</div>}
            {(g.kind === "route" ? to : g.sub) && (
              <div style={{ position: "absolute", left: g.kind === "route" ? undefined : W / 2, right: g.kind === "route" ? W - target[0] - 60 * s : undefined, transform: g.kind === "route" ? undefined : "translateX(-50%)", maxWidth: W * 0.92, overflow: "hidden", textOverflow: "ellipsis", top: target[1] + 18 * s, padding: `${8 * s}px ${20 * s}px`, borderRadius: 18 * s, background: th.accent, color: lum(th.accent) > 0.6 ? "#0E1B2C" : "#fff", fontSize: 32 * s, fontWeight: 800, whiteSpace: "nowrap", opacity: Math.min(1, drop), boxShadow: "0 6px 18px rgba(0,0,0,.25)" }}>
                {g.kind === "route" ? to : g.sub}
              </div>
            )}
          </div>
          {g.kind === "route" && g.sub && <Badge text={g.sub} f={f} delay={Math.max(18, len - 14)} s={s} th={th} light={light} />}
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
  const sketch = m.board === "sketch";
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: `${40 * s}px ${60 * s}px`, opacity: out, transform: `translateY(${(1 - out) * -20 * s}px)` }}>
      <svg width={0} height={0} style={{ position: "absolute" }}><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={Math.floor(f / 4) % 3} /><feDisplacementMap in="SourceGraphic" scale={4 * s} /></filter></svg>
      <div style={{ width: "100%", display: "flex", justifyContent: "center", filter: sketch ? "url(#rough)" : undefined }}>{body}</div>
      {overlay}
    </div>
  );
}
