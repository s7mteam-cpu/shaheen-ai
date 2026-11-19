import React from "react";
import { Img, interpolate, spring } from "remotion";
import { MFPS, type Graphic, type MontageSpec } from "./montage";
import { cleanLook, type SBg } from "./siteStyles";

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const pop = (f: number, delay = 0, damping = 12) => spring({ frame: f - delay, fps: MFPS, config: { damping, mass: 0.6 } });
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const rgb = (hex: string): [number, number, number] => { const n = parseInt(/^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "888888", 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`; };
const alpha = (a: string, o: number) => { const [r, g, b] = rgb(a); return `rgba(${r},${g},${b},${o})`; };
const LIGHT_BG: SBg[] = ["light", "pastel", "paper"];

/** The picture behind the device. */
function Background({ kind, f, w, h, accent, bg }: { kind: SBg; f: number; w: number; h: number; accent: string; bg: string }) {
  const t = f / MFPS;
  const blob = (c: string, x: number, y: number, size: number, dx: number, dy: number, ph: number, o = 0.55) => (
    <div style={{ position: "absolute", left: `${x * 100 + Math.sin(t * dx + ph) * 8}%`, top: `${y * 100 + Math.cos(t * dy + ph) * 6}%`, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: "50%", background: c, filter: `blur(${size * 0.28}px)`, opacity: o }} />
  );
  const base = (css: string, kids?: React.ReactNode) => <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: css }}>{kids}</div>;
  const big = Math.max(w, h);
  switch (kind) {
    case "aurora": return base(mix(bg, "#000000", 0.55), <>{blob(accent, 0.2, 0.25, big * 0.7, 0.7, 0.5, 0)}{blob(mix(accent, "#00d4ff", 0.6), 0.8, 0.45, big * 0.65, 0.55, 0.8, 2)}{blob(mix(accent, "#a855f7", 0.6), 0.5, 0.9, big * 0.7, 0.8, 0.6, 4)}</>);
    case "neon": return base("#06060f", <>
      <div style={{ position: "absolute", inset: -80, backgroundImage: `linear-gradient(${alpha(accent, 0.22)} 2px, transparent 2px), linear-gradient(90deg, ${alpha(accent, 0.22)} 2px, transparent 2px)`, backgroundSize: `${big * 0.06}px ${big * 0.06}px`, transform: `translateY(${(t * 40) % (big * 0.06)}px)` }} />
      {blob(accent, 0.5, 0.45, big * 0.8, 0.5, 0.4, 1, 0.35)}</>);
    case "light": return base(`linear-gradient(160deg, #ffffff, ${mix("#eef1f8", accent, 0.08)})`, blob(alpha(accent, 0.3) as string, 0.8, 0.15, big * 0.6, 0.4, 0.3, 0, 0.5));
    case "pastel": return base(mix(accent, "#ffffff", 0.84), <>{blob(mix(accent, "#ffffff", 0.45), 0.2, 0.2, big * 0.55, 0.6, 0.5, 0)}{blob(mix(accent, "#ffd6e8", 0.5), 0.85, 0.7, big * 0.6, 0.5, 0.7, 2)}</>);
    case "spot": return base(`radial-gradient(ellipse at 50% ${30 + Math.sin(t * 0.8) * 4}%, ${mix(bg, "#ffffff", 0.22)} 0%, ${mix(bg, "#000000", 0.55)} 55%, #050505 100%)`);
    case "brand": return base(`linear-gradient(${150 + Math.sin(t * 0.5) * 12}deg, ${accent}, ${mix(bg, accent, 0.25)})`);
    case "stripes": return base(mix(bg, "#000000", 0.25), <div style={{ position: "absolute", inset: -big * 0.3, background: `repeating-linear-gradient(115deg, ${alpha(accent, 0.28)} 0 ${big * 0.05}px, transparent ${big * 0.05}px ${big * 0.12}px)`, transform: `translateX(${(t * 60) % (big * 0.12)}px)` }} />);
    case "dots": return base(mix(accent, "#ffffff", 0.78), <div style={{ position: "absolute", inset: -40, backgroundImage: `radial-gradient(${alpha(accent, 0.45)} ${big * 0.008}px, transparent ${big * 0.009}px)`, backgroundSize: `${big * 0.035}px ${big * 0.035}px`, transform: `translate(${(t * 18) % (big * 0.035)}px, ${(t * 12) % (big * 0.035)}px)` }} />);
    case "orbs": return base(`linear-gradient(160deg, ${mix(bg, "#000000", 0.35)}, ${mix(bg, accent, 0.3)})`, <>
      {[0, 1, 2, 3, 4].map((i) => { const sz = big * (0.14 + (i % 3) * 0.07); return <div key={i} style={{ position: "absolute", left: `${(i * 23 + 8 + Math.sin(t * 0.7 + i) * 4) % 100}%`, top: `${(i * 31 + 6 + Math.cos(t * 0.6 + i * 2) * 5) % 100}%`, width: sz, height: sz, borderRadius: "50%", background: `radial-gradient(circle at 30% 30%, ${mix(accent, "#ffffff", 0.55)}, ${accent} 55%, ${mix(accent, "#000000", 0.5)})`, opacity: 0.8, boxShadow: `0 0 ${sz * 0.4}px ${alpha(accent, 0.45)}` }} />; })}</>);
    case "sunset": return base(`linear-gradient(${170 + Math.sin(t * 0.4) * 8}deg, ${mix(accent, "#ffb36b", 0.6)} 0%, ${mix(accent, "#ff5e7e", 0.55)} 50%, ${mix(bg, "#5b3b8c", 0.5)} 100%)`);
    case "paper": return base(mix(accent, "#f3ead8", 0.9), <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,.025) 0 2px, transparent 2px 5px)" }} />);
    default: return base(`linear-gradient(${160 + Math.sin(t * 0.4) * 6}deg, ${mix(bg, "#000000", 0.25)}, ${mix(bg, accent, 0.18)})`);
  }
}

/** Splits the text around the highlighted words. */
function Hl({ text, hl, color }: { text: string; hl?: string; color: string }) {
  const i = hl ? text.indexOf(hl) : -1;
  if (!hl || i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<span style={{ color }}>{hl}</span>{text.slice(i + hl.length)}</>;
}

export function SiteScene({ g, m, f, len, w, h }: { g: Graphic; m: MontageSpec; f: number; len: number; w: number; h: number }) {
  const S = g.site;
  const L = cleanLook(S?.look);
  const accent = /^#[0-9a-f]{6}$/i.test(m.colors.accent) ? m.colors.accent : "#E8B44C";
  const bgc = /^#[0-9a-f]{6}$/i.test(m.colors.bg) ? m.colors.bg : "#0B2A4A";
  const light = LIGHT_BG.includes(L.bg);
  const warm = L.bg === "brand" || L.bg === "sunset"; // bright coloured backgrounds: dark text, white highlight
  const ink = light || warm ? "#14213d" : "#ffffff";
  const hlc = warm ? "#ffffff" : light ? mix(accent, "#000000", 0.42) : accent;
  const out = interpolate(f, [len - 8, len], [1, 0], cl);
  const s = Math.min(w, h) / 1080;
  const t = f / MFPS;
  const phone = (S?.dev ?? "phone") === "phone";
  const vr = phone ? 390 / 844 : 1280 / 800; // visible screen shape
  const lower = L.text === "lower";

  // --- room for the text, then where the device sits ---
  const txt = g.text ?? "";
  const fs = (L.text === "big" ? 92 : L.text === "kinetic" ? 82 : 60) * s * Math.max(0.6, Math.min(1.6, (m.tscale ?? 1) * (g.ts ?? 1)));
  const lines = Math.max(1, Math.ceil((txt.length * fs * 0.52) / (w * 0.88)));
  const textH = txt || g.sub ? (txt ? lines * fs * 1.3 + 24 * s : 0) + (g.sub ? 66 * s : 0) : 0;
  const topZone = L.frame === "bare" ? 0 : lower ? 0.05 * h : Math.max(0.12 * h, 0.05 * h + textH + 16 * s);
  const botZone = L.frame === "bare" ? 0 : lower ? 0.3 * h : 0.13 * h;
  const bez = L.frame === "device" || L.frame === "device3d" ? (phone ? 0.017 * w : 0) : 0;
  const bar = (L.frame === "device" || L.frame === "device3d") && !phone ? 0.045 : 0; // browser bar height as a share of the screen width
  let pw: number, ph: number;
  if (L.frame === "bare") { pw = w; ph = h; }
  else {
    const availH = h - topZone - botZone - 2 * bez;
    const availW = w * (L.frame === "card" ? 0.82 : 0.86) - 2 * bez;
    pw = Math.min(availW, (availH - bar * availW) * vr);
    if (!phone && L.frame !== "card") pw = Math.min(availW, (availH / (1 / vr + bar)));
    ph = pw / vr;
  }
  const chrome = bar * pw;
  const outerW = pw + 2 * bez, outerH = ph + chrome + 2 * bez;
  const left = (w - outerW) / 2;
  const top = L.frame === "bare" ? 0 : topZone + (h - topZone - botZone - outerH) / 2;

  // --- how the page scrolls ---
  const k = pw / (S?.w ?? 390); // css px -> output px
  const vcss = ph / k; // visible height in css px
  const maxScroll = Math.max(0, (S?.h ?? 0) - vcss);
  const cy = (v: number) => Math.max(0, Math.min(maxScroll, v));
  const ty = cy((S?.y ?? 0) - 24);
  const from = cy(S?.y0 ?? 0);
  const drift = Math.min(vcss * 0.5, Math.max(80, ((S?.y2 ?? ty + vcss) - (S?.y ?? 0)) * 0.7));
  const end = cy(ty + drift);
  const arrive = Math.min(len * 0.4, 0.9 * MFPS);
  const off = f < arrive ? from + (ty - from) * ease(f / arrive) : ty + (end - ty) * ease(Math.min(1, (f - arrive) / Math.max(1, len - arrive)) * 0.9 + 0.05) * 1.0;

  // --- entrance (the transition into this scene) ---
  const e = Math.min(1.12, pop(f, 0, 13));
  const e1 = interpolate(f, [0, 12], [0, 1], cl);
  let enter: React.CSSProperties = {};
  let etf = ""; // the entrance's own transform, combined with the camera move below
  switch (L.enter) {
    case "up": etf = `translateY(${(1 - e) * h * 0.18}px)`; enter = { opacity: e1 }; break;
    case "left": etf = `translateX(${(1 - e) * -w * 0.55}px)`; enter = { opacity: Math.min(1, e1 * 1.5) }; break;
    case "pop": etf = `scale(${0.55 + 0.45 * e})`; enter = { opacity: Math.min(1, e1 * 2) }; break;
    case "flip": etf = `perspective(1400px) rotateY(${(1 - Math.min(1, e)) * -80}deg)`; enter = { opacity: Math.min(1, e1 * 2) }; break;
    case "blur": etf = `scale(${1.08 - 0.08 * e1})`; enter = { filter: `blur(${(1 - e1) * 26}px)`, opacity: e1 }; break;
    case "wipe": enter = { clipPath: `inset(0 ${(1 - ease(e1)) * 100}% 0 0)` }; break;
    case "spin": etf = `rotate(${(1 - Math.min(1, e)) * -22}deg) scale(${0.65 + 0.35 * e})`; enter = { opacity: Math.min(1, e1 * 2) }; break;
    case "drop": etf = `translateY(${(1 - e) * -h * 0.55}px)`; enter = { opacity: Math.min(1, e1 * 3) }; break;
    case "iris": enter = { clipPath: `circle(${ease(e1) * 78}% at 50% 50%)` }; break;
    default: enter = { opacity: e1 };
  }

  // --- camera move ---
  const prog = f / Math.max(1, len);
  let cam = "";
  let origin = "50% 50%";
  switch (L.cam) {
    case "zoom": cam = `scale(${1 + 0.07 * prog})`; break;
    case "push": cam = `scale(${0.94 + 0.12 * prog})`; break;
    case "focus": cam = `scale(${interpolate(f, [len * 0.2, len * 0.8], [1, 1.18], cl)})`; origin = "50% 22%"; break;
    case "sway": cam = `rotate(${Math.sin(t * 1.4) * 1.6}deg) translateY(${Math.sin(t * 1.1) * 8}px)`; break;
    case "parallax": cam = `translateY(${-prog * 46}px)`; break;
    case "orbit": cam = `rotateY(${Math.sin(t * 0.9) * 13}deg) rotateX(${5 + Math.sin(t * 0.7) * 2}deg)`; break;
    default: break;
  }
  const tilt = L.frame === "device3d" && L.cam !== "orbit" ? `rotateY(${-13 + prog * 7}deg) rotateX(6deg)` : "";
  const persp = L.frame === "device3d" || L.cam === "orbit" ? "perspective(1700px) " : "";

  // --- the device ---
  const radius = L.frame === "bare" ? 0 : phone ? pw * 0.11 : L.frame === "card" ? 36 * s : 20 * s;
  const ratioShot = pw / (S?.w ?? 390);
  const imgH = (S?.h ?? 1) * ratioShot;
  const screen = (
    <div style={{ position: "relative", width: pw, height: ph, overflow: "hidden", borderRadius: Math.max(0, radius - bez), background: "#fff" }}>
      {g.url ? <Img src={g.url} style={{ position: "absolute", left: 0, top: 0, width: pw, height: imgH, transform: `translateY(${-off * ratioShot}px)` }} /> : <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${accent}55, ${bgc})` }} />}
      {L.fx === "shine" && <div style={{ position: "absolute", top: -ph * 0.2, bottom: -ph * 0.2, width: pw * 0.35, left: `${interpolate(f, [len * 0.3, len * 0.6], [-40, 130], cl)}%`, background: "linear-gradient(100deg, transparent, rgba(255,255,255,.32), transparent)", transform: "skewX(-18deg)" }} />}
    </div>
  );
  const glow = L.fx === "glow" ? `0 0 ${60 * s}px ${alpha(accent, 0.45 + 0.2 * Math.sin(t * 3))}, ` : "";
  const shadow = `${glow}0 ${40 * s}px ${90 * s}px rgba(0,0,0,.45)`;
  let device: React.ReactNode;
  if (L.frame === "bare") device = screen;
  else if (phone && L.frame !== "card") {
    device = (
      <div style={{ width: outerW, height: outerH, padding: bez, boxSizing: "border-box", borderRadius: radius + bez, background: "linear-gradient(145deg, #2a2a2e, #0c0c0e)", boxShadow: shadow, position: "relative" }}>
        {screen}
        <div style={{ position: "absolute", top: bez * 1.6, left: "50%", transform: "translateX(-50%)", width: pw * 0.26, height: pw * 0.055, borderRadius: 999, background: "#050505" }} />
      </div>
    );
  } else if (!phone && L.frame !== "card") {
    device = (
      <div style={{ width: outerW, borderRadius: radius + 4, overflow: "hidden", background: "#1d1f24", boxShadow: shadow }}>
        <div style={{ height: chrome, display: "flex", alignItems: "center", gap: chrome * 0.22, padding: `0 ${chrome * 0.5}px`, background: "#2a2d33", direction: "ltr" }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: chrome * 0.3, height: chrome * 0.3, borderRadius: "50%", background: c }} />)}
          <div style={{ flex: 1, marginInlineStart: chrome * 0.4, height: chrome * 0.62, borderRadius: 999, background: "#15171b", color: "#aab", fontSize: chrome * 0.36, display: "flex", alignItems: "center", padding: `0 ${chrome * 0.45}px`, fontFamily: "sans-serif", whiteSpace: "nowrap", overflow: "hidden" }}>🔒 {S?.host ?? ""}</div>
        </div>
        {screen}
      </div>
    );
  } else {
    device = <div style={{ width: outerW, borderRadius: radius, overflow: "hidden", boxShadow: shadow }}>{screen}</div>;
  }

  // --- click ripple / highlight ring ---
  const rp = interpolate(f, [len * 0.42, len * 0.62], [0, 1], cl);
  const fxLayer = (
    <>
      {L.fx === "ripple" && rp > 0 && rp < 1 && (
        <div style={{ position: "absolute", left: left + outerW * 0.5, top: top + chrome + outerH * 0.45, width: 0, height: 0 }}>
          <div style={{ position: "absolute", width: 150 * s * rp, height: 150 * s * rp, marginLeft: -75 * s * rp, marginTop: -75 * s * rp, borderRadius: "50%", border: `${6 * s}px solid ${accent}`, opacity: 1 - rp }} />
          <div style={{ position: "absolute", width: 34 * s, height: 34 * s, marginLeft: -17 * s, marginTop: -17 * s, borderRadius: "50%", background: accent, opacity: 0.85 * (1 - rp * 0.6) }} />
        </div>
      )}
      {L.fx === "ring" && L.frame !== "bare" && (
        <div style={{ position: "absolute", left: left - 14 * s, top: top - 14 * s, width: outerW + 28 * s, height: outerH + chrome + 28 * s, borderRadius: radius + 18 * s, border: `${5 * s}px solid ${accent}`, opacity: 0.55 + 0.4 * Math.sin(t * 3.2), boxShadow: `0 0 ${40 * s}px ${alpha(accent, 0.5)}` }} />
      )}
    </>
  );

  // --- text ---
  const zoneTop = L.frame === "bare" ? h * 0.08 : h * 0.05;
  const tin = pop(f, 6, 14);
  const words = txt.split(/\s+/).filter(Boolean);
  let label: React.ReactNode = null;
  if (txt) {
    const common: React.CSSProperties = { direction: "rtl", textAlign: "center", fontWeight: 900, lineHeight: 1.25, fontSize: fs, color: ink };
    if (L.text === "pill") label = <div style={{ ...common, color: warm ? "#ffffff" : "#0E1B2C", background: warm ? "#14213d" : accent, padding: `${12 * s}px ${34 * s}px`, borderRadius: 999, boxShadow: `0 ${10 * s}px ${30 * s}px rgba(0,0,0,.3)`, transform: `scale(${0.6 + 0.4 * tin})`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.9 }}>{txt}</div>;
    else if (L.text === "kinetic") label = <div style={{ ...common, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${18 * s}px`, textShadow: light ? "none" : `0 ${4 * s}px ${20 * s}px rgba(0,0,0,.5)`, maxWidth: w * 0.92 }}>{words.map((wd, i) => { const q = pop(f, 4 + i * 4, 13); const isHl = !!g.hl && g.hl.includes(wd); return <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - q) * 40 * s}px)`, opacity: Math.min(1, q * 1.6), color: isHl ? hlc : ink }}>{wd}</span>; })}</div>;
    else if (L.text === "big") label = <div style={{ ...common, textShadow: light ? "none" : `0 ${6 * s}px ${26 * s}px rgba(0,0,0,.45)`, transform: `translateY(${(1 - tin) * 30 * s}px) scale(${0.9 + 0.1 * tin})`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.92 }}><Hl text={txt} hl={g.hl} color={hlc} /></div>;
    else if (L.text === "outline") label = <div style={{ ...common, color: "transparent", WebkitTextStroke: `${3 * s}px ${light ? "#14213d" : "#fff"}`, transform: `translateY(${(1 - tin) * 24 * s}px)`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.92 }}>{g.hl && txt.includes(g.hl) ? <><span>{txt.slice(0, txt.indexOf(g.hl))}</span><span style={{ color: hlc, WebkitTextStroke: 0 }}>{g.hl}</span><span>{txt.slice(txt.indexOf(g.hl) + g.hl.length)}</span></> : txt}</div>;
    else if (L.text === "glass") label = <div style={{ ...common, background: light ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.14)", border: `${2 * s}px solid ${light ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.35)"}`, backdropFilter: "blur(18px)", padding: `${16 * s}px ${34 * s}px`, borderRadius: 30 * s, transform: `translateY(${(1 - tin) * 26 * s}px)`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.9 }}><Hl text={txt} hl={g.hl} color={hlc} /></div>;
    else label = <div style={{ ...common, display: "flex", alignItems: "center", gap: 16 * s, background: "rgba(8,10,18,.72)", color: "#fff", padding: `${14 * s}px ${30 * s}px`, borderRadius: 22 * s, borderInlineStart: `${10 * s}px solid ${accent}`, transform: `translateX(${(1 - tin) * 60 * s}px)`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.9 }}><Hl text={txt} hl={g.hl} color={hlc} /></div>;
  }
  const sub = g.sub ? <div style={{ marginTop: 12 * s, padding: `${6 * s}px ${22 * s}px`, borderRadius: 999, background: light ? "#14213d" : "rgba(255,255,255,.9)", color: light ? "#fff" : "#0E1B2C", fontSize: 32 * s, fontWeight: 800, direction: "rtl", opacity: Math.min(1, tin * 2) }}>{g.sub}</div> : null;
  const textBox = (txt || g.sub) ? (
    <div style={{ position: "absolute", left: 0, right: 0, ...(lower ? { top: h * 0.74 } : { top: zoneTop }), display: "flex", flexDirection: "column", alignItems: "center", padding: `0 ${40 * s}px`, ...(L.frame === "bare" ? {} : {}) }}>{label}{sub}</div>
  ) : null;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: out }}>
      <Background kind={L.bg} f={f} w={w} h={h} accent={accent} bg={bgc} />
      {L.frame === "bare" && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.5), transparent 35%, transparent 62%, rgba(0,0,0,.45))", zIndex: 1 }} />}
      <div style={{ position: "absolute", left, top, width: outerW, transformOrigin: origin, ...enter, transform: `${etf} ${persp}${tilt} ${cam}`.trim() || undefined }}>{device}</div>
      {fxLayer}
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>{textBox}</div>
    </div>
  );
}
