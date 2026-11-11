/** Animated explainer scenes (timer, counter, steps, compare…) drawn inside a box: the split panel, or a card over the footage. */
import React from "react";
import { Easing, interpolate, spring } from "remotion";
import { MIcon } from "./icons";
import { MFPS, type Graphic, type MontageSpec } from "./montage";

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type Theme = { text: string; soft: string; accent: string; card: string; line: string; good: string; bad: string };
export function themeFor(m: MontageSpec, light: boolean): Theme {
  return light
    ? { text: "#0E1B2C", soft: "rgba(14,27,44,.62)", accent: m.colors.accent, card: "#FFFFFF", line: "rgba(14,27,44,.14)", good: "#1F9D55", bad: "#E0453A" }
    : { text: "#FFFFFF", soft: "rgba(255,255,255,.72)", accent: m.colors.accent, card: "rgba(255,255,255,.08)", line: "rgba(255,255,255,.2)", good: "#3DDC84", bad: "#FF6B5E" };
}

/** Background of the split panel. */
export function panelBackground(m: MontageSpec, light: boolean) {
  return light
    ? "radial-gradient(120% 90% at 85% 10%, #FFF8EC 0%, #F3EEE6 45%, #E6ECEE 100%)"
    : `radial-gradient(120% 90% at 85% 10%, ${m.colors.bg} 0%, #0A0F18 100%)`;
}

const pop = (f: number, delay = 0, damping = 12) => spring({ frame: f - delay, fps: MFPS, config: { damping, mass: 0.6 } });

function Words({ text, hl, f, size, th, delay = 0 }: { text: string; hl?: string; f: number; size: number; th: Theme; delay?: number }) {
  const hot = new Set((hl ?? "").split(/\s+/).filter(Boolean));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${size * 0.05}px ${size * 0.24}px`, direction: "rtl", textAlign: "center" }}>
      {text.split(/\s+/).filter(Boolean).map((w, k) => {
        const q = Math.min(1, pop(f, delay + k * 3, 11));
        return <span key={k} style={{ display: "inline-block", fontSize: size, fontWeight: 800, lineHeight: 1.18, color: hot.has(w) ? th.accent : th.text, opacity: q, transform: `translateY(${(1 - q) * size * 0.35}px) scale(${0.75 + 0.25 * q})` }}>{w}</span>;
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
export function GraphicView({ g, m, f, len, w, h, light }: { g: Graphic; m: MontageSpec; f: number; len: number; w: number; h: number; light: boolean }) {
  const th = themeFor(m, light);
  const s = Math.min(w / 1080, h / 760);
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
    default: // headline
      body = (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {g.text && <Words text={g.text} hl={g.hl} f={f} size={Math.min(big * 1.25, (w * 0.86) / Math.max(4, g.text.length * 0.42))} th={th} />}
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
