import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MIcon } from "./icons";
import { timeline, type Colors, type MotionSpec, type Scene } from "./spec";

type Ctx = { c: Colors; u: number; len: number; brand?: string; wide: boolean };

const ease = Easing.bezier(0.22, 1, 0.36, 1);

function useIn(delay = 0, damping = 200) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.8 } });
}

/** Words rise in one by one (works for Arabic RTL). */
function Words({ text, delay = 0, step = 3, style }: { text: string; delay?: number; step?: number; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.28em", ...style }}>
      {text.split(/\s+/).filter(Boolean).map((w, i) => {
        const p = spring({ frame: frame - delay - i * step, fps, config: { damping: 200 } });
        return <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.45}em)`, filter: `blur(${(1 - p) * 6}px)` }}>{w}</span>;
      })}
    </div>
  );
}

function Pill({ children, color, bg, u, p }: { children: React.ReactNode; color: string; bg: string; u: number; p: number }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12 * u, padding: `${12 * u}px ${30 * u}px`, borderRadius: 999, border: `${2.5 * u}px solid ${color}`, color, background: bg, fontSize: 34 * u, fontWeight: 700, opacity: p, transform: `scale(${0.8 + p * 0.2})` }}>
      {children}
    </div>
  );
}

function Background({ c, u }: { c: Colors; u: number }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const dots = Array.from({ length: 46 }, (_, i) => {
    const x = random(`x${i}`) * width;
    const y0 = random(`y${i}`) * height;
    const speed = 0.15 + random(`s${i}`) * 0.5;
    const y = ((y0 - frame * speed * u) % height + height) % height;
    const r = (1 + random(`r${i}`) * 2.2) * u;
    const tw = 0.25 + 0.55 * Math.abs(Math.sin(frame / 25 + i));
    return <circle key={i} cx={x} cy={y} r={r} fill={c.accent} opacity={tw * 0.6} />;
  });
  const rot = frame * 0.08;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 35%, ${c.bg} 0%, ${c.bg2} 100%)` }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {dots}
        <g transform={`translate(${width / 2} ${height / 2}) rotate(${rot})`} opacity={0.12}>
          <circle r={Math.min(width, height) * 0.46} fill="none" stroke={c.accent} strokeWidth={1.5 * u} strokeDasharray={`${6 * u} ${14 * u}`} />
          <circle r={Math.min(width, height) * 0.36} fill="none" stroke={c.accent} strokeWidth={1 * u} />
        </g>
      </svg>
      <div style={{ position: "absolute", inset: 36 * u, border: `${1.5 * u}px solid ${c.accent}33`, borderRadius: 28 * u }} />
    </AbsoluteFill>
  );
}

function Intro({ s, x }: { s: Extract<Scene, { type: "intro" }>; x: Ctx }) {
  const { c, u, brand } = x;
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [0, 28], [1, 0], { extrapolateRight: "clamp", easing: ease });
  const p = useIn(18);
  const pb = useIn(26);
  const pk = useIn(30);
  const side = 220 * u;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 * u }}>
      <div style={{ position: "relative", width: side * 1.45, height: side * 1.45 }}>
        <svg width={side * 1.45} height={side * 1.45} viewBox="0 0 145 145" style={{ position: "absolute", inset: 0 }}>
          <rect x="31" y="31" width="83" height="83" transform="rotate(45 72.5 72.5)" fill="none" stroke={c.accent} strokeWidth="2.2" pathLength={1} strokeDasharray="1" strokeDashoffset={draw} />
          <rect x="37" y="37" width="71" height="71" transform="rotate(45 72.5 72.5)" fill="none" stroke={c.accent} strokeWidth="0.8" opacity={0.6} pathLength={1} strokeDasharray="1" strokeDashoffset={draw} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: p, transform: `scale(${0.6 + p * 0.4})` }}><MIcon name={s.icon ?? "sparkle"} size={120 * u} color={c.accent} stroke={1.4} /></div>
      </div>
      {brand && <div style={{ color: c.accent, fontSize: 34 * u, letterSpacing: 2 * u, opacity: pb }}>{brand}</div>}
      {s.kicker && <Pill color={c.accent} bg={`${c.accent}1A`} u={u} p={pk}>{s.kicker}</Pill>}
      <Words text={s.title} delay={34} style={{ color: c.text, fontSize: 110 * u, fontWeight: 800, lineHeight: 1.25 }} />
      {s.subtitle && <Words text={s.subtitle} delay={46} style={{ color: c.accent, fontSize: 58 * u, fontWeight: 600 }} />}
    </div>
  );
}

function Statement({ s, x }: { s: Extract<Scene, { type: "statement" }>; x: Ctx }) {
  const { c, u } = x;
  const p = useIn(2);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 * u }}>
      <div style={{ width: 140 * u * p, height: 6 * u, borderRadius: 9, background: c.accent }} />
      <Words text={s.text} delay={6} step={4} style={{ color: c.text, fontSize: 92 * u, fontWeight: 800, lineHeight: 1.35 }} />
      <div style={{ width: 140 * u * p, height: 6 * u, borderRadius: 9, background: c.accent }} />
    </div>
  );
}

function Myth({ s, x }: { s: Extract<Scene, { type: "myth" }>; x: Ctx }) {
  const { c, u, len } = x;
  const frame = useCurrentFrame();
  const half = Math.round(len * 0.45);
  const strike = interpolate(frame, [half - 14, half], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const factIn = useIn(half + 4);
  const factPill = useIn(half);
  const mythPill = useIn(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 46 * u, width: "100%" }}>
      <Pill color={c.accent2} bg={`${c.accent2}1F`} u={u} p={mythPill}>خرافة <MIcon name="x" size={34 * u} color={c.accent2} stroke={2.4} /></Pill>
      <div style={{ position: "relative", padding: `${44 * u}px ${48 * u}px`, borderRadius: 28 * u, border: `${2 * u}px solid ${c.accent2}88`, background: `${c.bg2}AA`, opacity: 1 - strike * 0.45, width: "100%" }}>
        <Words text={s.myth} delay={6} style={{ color: c.text, fontSize: 64 * u, fontWeight: 700, lineHeight: 1.4 }} />
        <div style={{ position: "absolute", top: "50%", right: "6%", height: 6 * u, borderRadius: 9, width: `${88 * strike}%`, background: c.accent2 }} />
      </div>
      <Pill color={c.accent} bg={`${c.accent}1F`} u={u} p={factPill}>حقيقة <MIcon name="check" size={34 * u} color={c.accent} stroke={2.4} /></Pill>
      <div style={{ opacity: factIn, transform: `translateY(${(1 - factIn) * 40 * u}px)` }}>
        <Words text={s.fact} delay={half + 6} style={{ color: c.text, fontSize: 64 * u, fontWeight: 700, lineHeight: 1.45 }} />
      </div>
    </div>
  );
}

function Points({ s, x }: { s: Extract<Scene, { type: "points" }>; x: Ctx }) {
  const { c, u, wide } = x;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = s.items.length;
  const cols = wide ? n : n === 4 ? 2 : n;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 60 * u, width: "100%" }}>
      <Words text={s.title} style={{ color: c.text, fontSize: 78 * u, fontWeight: 800, lineHeight: 1.3 }} />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 26 * u, width: "100%" }}>
        {s.items.map((it, i) => {
          const p = spring({ frame: frame - 12 - i * 7, fps, config: { damping: 14, mass: 0.7 } });
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * u, padding: `${40 * u}px ${16 * u}px`, borderRadius: 26 * u, border: `${2 * u}px solid ${c.accent}55`, background: `${c.bg2}B3`, opacity: Math.min(1, p), transform: `scale(${0.6 + 0.4 * p})` }}>
              <div style={{ width: 110 * u, height: 110 * u, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: `${c.accent}22` }}>
                <MIcon name={it.icon} size={62 * u} color={c.accent} />
              </div>
              <div style={{ color: c.text, fontSize: 44 * u, fontWeight: 700, textAlign: "center" }}>{it.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ s, x }: { s: Extract<Scene, { type: "stat" }>; x: Ctx }) {
  const { c, u } = x;
  const frame = useCurrentFrame();
  const t = interpolate(frame, [6, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const R = 230 * u;
  const ring = s.suffix === "%" ? Math.min(1, s.value / 100) : 0.78;
  const C = 2 * Math.PI * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 50 * u }}>
      <div style={{ position: "relative", width: R * 2, height: R * 2 }}>
        <svg width={R * 2} height={R * 2} viewBox="0 0 220 220" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx="110" cy="110" r="100" fill="none" stroke={`${c.accent}2E`} strokeWidth="9" />
          <circle cx="110" cy="110" r="100" fill="none" stroke={c.accent} strokeWidth="9" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ring * t)} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: c.text, fontSize: 150 * u, fontWeight: 800, direction: "ltr" }}>
          {Math.round(s.value * t).toLocaleString("en")}<span style={{ color: c.accent, fontSize: 90 * u }}>{s.suffix}</span>
        </div>
      </div>
      <Words text={s.label} delay={20} style={{ color: c.text, fontSize: 60 * u, fontWeight: 700, lineHeight: 1.4 }} />
    </div>
  );
}

function Cta({ s, x }: { s: Extract<Scene, { type: "cta" }>; x: Ctx }) {
  const { c, u, brand } = x;
  const frame = useCurrentFrame();
  const b = useIn(24, 12);
  const ps = useIn(16);
  const pb = useIn(34);
  const pulse = 1 + Math.sin(frame / 7) * 0.025 * Math.min(1, b);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 48 * u }}>
      <Words text={s.title} style={{ color: c.text, fontSize: 100 * u, fontWeight: 800, lineHeight: 1.3 }} />
      {s.subtitle && <div style={{ color: c.accent, fontSize: 52 * u, fontWeight: 600, direction: "ltr", opacity: ps }}>{s.subtitle}</div>}
      {s.button && (
        <div style={{ padding: `${30 * u}px ${70 * u}px`, borderRadius: 999, background: c.accent, color: c.bg2, fontSize: 50 * u, fontWeight: 800, opacity: Math.min(1, b), transform: `scale(${(0.7 + 0.3 * b) * pulse})`, boxShadow: `0 ${20 * u}px ${60 * u}px ${c.accent}55` }}>{s.button}</div>
      )}
      {brand && <div style={{ color: `${c.text}AA`, fontSize: 34 * u, marginTop: 20 * u, opacity: pb }}>{brand}</div>}
    </div>
  );
}

function SceneView({ s, x }: { s: Scene; x: Ctx }) {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [x.len - 12, x.len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width } = useVideoConfig();
  const body = (() => {
    switch (s.type) {
      case "intro": return <Intro s={s} x={x} />;
      case "statement": return <Statement s={s} x={x} />;
      case "myth": return <Myth s={s} x={x} />;
      case "points": return <Points s={s} x={x} />;
      case "stat": return <Stat s={s} x={x} />;
      case "cta": return <Cta s={s} x={x} />;
    }
  })();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out, transform: `scale(${0.96 + 0.04 * out})` }}>
      <div style={{ width: Math.min(width * 0.84, 1400 * x.u), display: "flex", justifyContent: "center", textAlign: "center" }}>{body}</div>
    </AbsoluteFill>
  );
}

export function MotionVideo(spec: MotionSpec) {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const c = spec.colors;
  return (
    <AbsoluteFill dir="rtl" style={{ fontFamily: `"${spec.font}", Cairo, sans-serif` }}>
      <Background c={c} u={u} />
      {timeline(spec).map(({ scene, from, len }, i) => (
        <Sequence key={i} from={from} durationInFrames={len} layout="none">
          <SceneView s={scene} x={{ c, u, len, brand: spec.brand, wide: width > height }} />
        </Sequence>
      ))}
      {spec.music?.url && <Audio src={spec.music.url} volume={spec.voice?.url ? 0.25 : 0.8} />}
      {spec.voice?.url && <Audio src={spec.voice.url} />}
    </AbsoluteFill>
  );
}
