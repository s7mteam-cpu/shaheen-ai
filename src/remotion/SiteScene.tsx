import React from "react";
import { Img, interpolate, spring } from "remotion";
import { MFPS, type Graphic, type MontageSpec } from "./montage";
import { cleanLook, type SBg } from "./siteStyles";

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const pop = (f: number, delay = 0, damping = 12) => spring({ frame: f - delay, fps: MFPS, config: { damping, mass: 0.6 } });
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rnd = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
const F12 = MFPS / 12; // the "hand-made" low frame rate
/** A torn-paper outline (jagged top and bottom edges). */
const torn = (seed: number, amp = 1.3, step = 4) => {
  const pts: string[] = [];
  for (let x = 0; x <= 100; x += step) pts.push(`${x}% ${(rnd(seed + x) * amp).toFixed(2)}%`);
  for (let x = 100; x >= 0; x -= step) pts.push(`${x}% ${(100 - rnd(seed * 3 + x) * amp).toFixed(2)}%`);
  return `polygon(${pts.join(",")})`;
};
const bez3 = (a: number, b: number, c: number, d: number, t: number) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };

/** The big mouse pointer that leads the tour. */
function Cursor({ x, y, size, press }: { x: number; y: number; size: number; press: number }) {
  return (
    <svg viewBox="0 0 24 31" style={{ position: "absolute", left: x, top: y, width: size, height: size * 1.3, overflow: "visible", transform: `scale(${press})`, transformOrigin: "2px 2px", filter: "drop-shadow(0 5px 7px rgba(0,0,0,.45))", zIndex: 6 }}>
      <path d="M2 2 L2 24 L8 18.5 L12 28 L16 26.3 L12 17 L20 17 Z" fill="#fff" stroke="#111" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}


const rgb = (hex: string): [number, number, number] => { const n = parseInt(/^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "888888", 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`; };
const alpha = (a: string, o: number) => { const [r, g, b] = rgb(a); return `rgba(${r},${g},${b},${o})`; };
const LIGHT_BG: SBg[] = ["light", "pastel", "paper", "dots"];

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
  let fr = L.frame;
  if (fr === "duo" && !(g.url2 && S?.b)) fr = "device"; // two screens need the second picture
  const lower = L.text === "lower" && fr !== "type";
  const isDev = fr === "device" || fr === "device3d";
  const txt = g.text ?? "";
  const tin = pop(f, 6, 14);

  // --- room for the text, then where the device sits ---
  const fs = (L.text === "big" ? 92 : L.text === "kinetic" ? 82 : 60) * s * Math.max(0.6, Math.min(1.6, (m.tscale ?? 1) * (g.ts ?? 1)));
  const lines = Math.max(1, Math.ceil((txt.length * fs * 0.52) / (w * 0.88)));
  const textH = txt || g.sub ? (txt ? lines * fs * 1.3 + 24 * s : 0) + (g.sub ? 66 * s : 0) : 0;
  const topZone = fr === "bare" || fr === "type" ? 0 : lower ? 0.05 * h : Math.max(0.12 * h, 0.05 * h + textH + 16 * s);
  const botZone = fr === "bare" || fr === "type" ? 0 : lower ? 0.3 * h : 0.13 * h;
  const bz = isDev ? (phone ? 0.017 * w : 0) : fr === "collage" ? 14 * s : 0;
  const bar = isDev && !phone ? 0.045 : 0; // browser bar height as a share of the screen width
  let pw = 1, ph = 1;
  if (fr === "bare") { pw = w; ph = h; }
  else if (fr === "device" || fr === "device3d" || fr === "card" || fr === "collage") {
    const availH = h - topZone - botZone - 2 * bz;
    const availW = w * (fr === "card" ? 0.82 : fr === "collage" ? 0.78 : 0.86) - 2 * bz;
    pw = Math.min(availW, (availH - bar * availW) * vr);
    if (!phone && (fr === "device" || fr === "device3d")) pw = Math.min(availW, (availH / (1 / vr + bar)));
    ph = pw / vr;
  }
  const chrome = bar * pw;
  const outerW = pw + 2 * bz, outerH = ph + chrome + 2 * bz;
  const left = (w - outerW) / 2;
  const top = fr === "bare" ? 0 : topZone + (h - topZone - botZone - outerH) / 2;

  // --- how a page picture scrolls inside a screen ---
  const vel = L.enter === "velocity";
  const screenOf = (url: string | undefined, d: { y: number; y0: number; y2: number; w: number; h: number }, spw: number, sph: number, rad: number) => {
    const ratio = spw / d.w; // css px -> output px
    const vc = sph / ratio; // visible height in css px
    const mx = Math.max(0, d.h - vc);
    const c = (v: number) => Math.max(0, Math.min(mx, v));
    const ty = c(d.y - 24), from = c(d.y0);
    const drift = L.fx === "cursor" || L.fx === "callout" || L.fx === "hand" ? Math.min(40, vc * 0.1) : Math.min(vc * 0.5, Math.max(80, (d.y2 - d.y) * 0.7)); // call-out looks keep the heading in view
    const end = c(ty + drift);
    const arrive = vel ? Math.min(len * 0.55, 1.1 * MFPS) : Math.min(len * 0.4, 0.9 * MFPS);
    const tt = Math.min(1, f / arrive);
    const eased = vel ? (tt >= 1 ? 1 : 1 - Math.pow(2, -10 * tt)) : ease(tt); // velocity edit: fast scroll that brakes into slow motion
    const off = f < arrive ? from + (ty - from) * eased : ty + (end - ty) * ease(Math.min(1, (f - arrive) / Math.max(1, len - arrive)) * 0.9 + 0.05);
    const render = (overlay?: React.ReactNode, shine = false) => (
      <div style={{ position: "relative", width: spw, height: sph, overflow: "hidden", borderRadius: rad, background: "#fff" }}>
        {url ? <Img src={url} style={{ position: "absolute", left: 0, top: 0, width: spw, height: d.h * ratio, transform: `translateY(${-off * ratio}px)`, filter: vel && tt < 1 ? `blur(${(1 - tt) * 7}px)` : undefined }} /> : <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${accent}55, ${bgc})` }} />}
        {shine && <div style={{ position: "absolute", top: -sph * 0.2, bottom: -sph * 0.2, width: spw * 0.35, left: `${interpolate(f, [len * 0.3, len * 0.6], [-40, 130], cl)}%`, background: "linear-gradient(100deg, transparent, rgba(255,255,255,.32), transparent)", transform: "skewX(-18deg)" }} />}
        {overlay}
      </div>
    );
    return { off, ratio, ty, render };
  };

  // --- entrance (the transition into this scene) ---
  const e = Math.min(1.12, pop(f, 0, 13));
  const e1 = interpolate(f, [0, 12], [0, 1], cl);
  let enter: React.CSSProperties = {};
  let etf = ""; // the entrance's own transform, combined with the camera move below
  let flash = 0; // white flash over the scene
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
    case "whip": { const q = ease(Math.min(1, f / 9)); etf = `translateX(${(1 - q) * w * 1.05}px) skewX(${-(1 - q) * 18}deg)`; enter = { filter: `blur(${(1 - q) * 22}px)` }; break; } // whip pan
    case "flash": { const q = ease(Math.min(1, f / 10)); etf = `scale(${1.14 - 0.14 * q})`; enter = { opacity: Math.min(1, f / 2) }; flash = interpolate(f, [0, 2, 9], [0, 0.95, 0], cl); break; }
    case "glitch": { const k = Math.max(0, 1 - f / 12); etf = f < 12 ? `translateX(${(rnd(f + 1) - 0.5) * 70 * s * k}px)` : ""; enter = f < 12 ? { opacity: rnd(f + 3) > 0.25 ? 1 : 0.35, filter: `drop-shadow(${9 * s * k}px 0 rgba(255,0,80,.85)) drop-shadow(${-9 * s * k}px 0 rgba(0,220,255,.85))` } : {}; break; }
    case "velocity": { const q = ease(Math.min(1, f / 14)); etf = `scale(${1.2 - 0.2 * q})`; enter = { opacity: Math.min(1, f / 3), filter: `blur(${(1 - q) * 10}px)` }; break; }
    default: enter = { opacity: e1 };
  }

  // --- the hook (first seconds of the video): a punch-in, a flash, a text slam ---
  const hk = L.hook ? interpolate(f, [0, 14], [1, 0], cl) : 0;
  if (L.hook) flash = Math.max(flash, interpolate(f, [0, 1, 7], [0, 0.85, 0], cl));

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
    case "punch": { // elastic snap into the heading, then back out
      const a = pop(f, Math.round(len * 0.28), 7), b = pop(f, Math.round(len * 0.74), 12);
      cam = `scale(${1 + 0.48 * a - 0.4 * b})`;
      origin = isDev || fr === "card" || fr === "collage" ? `${outerW / 2}px ${bz + chrome + 24 * (pw / (S?.w ?? 390)) + (phone ? 60 : 45) * (pw / (S?.w ?? 390))}px` : "50% 35%";
      break;
    }
    default: break;
  }
  if (hk > 0) cam = `${cam} scale(${1 + 0.36 * hk * hk})`;
  const tilt = fr === "device3d" && L.cam !== "orbit" ? `rotateY(${-13 + prog * 7}deg) rotateX(6deg)` : "";
  const persp = fr === "device3d" || L.cam === "orbit" ? "perspective(1700px) " : "";
  const rot = fr === "collage" ? "rotate(-2.4deg) " : "";

  // --- the page + its extras (cursor tour, call-out box, hand-made note) ---
  const radius = fr === "bare" || fr === "collage" ? 0 : phone ? pw * 0.11 : fr === "card" ? 36 * s : 20 * s;
  const arriveP = Math.min(len * 0.4, 0.9 * MFPS);
  const P = (fr === "device" || fr === "device3d" || fr === "card" || fr === "bare" || fr === "collage") && S ? screenOf(g.url, S, pw, ph, Math.max(0, radius - bz)) : null;
  const note = g.hl || g.sub || "";
  const annot = (off: number, ratio: number) => {
    if (!S || (L.fx !== "cursor" && L.fx !== "callout" && L.fx !== "hand")) return null;
    const bhh = (phone ? 120 : 90) * ratio;
    const bx = pw * 0.05, bw2 = pw * 0.9;
    const by = (S.y - off) * ratio - 10 * ratio; // the heading of this section, where it is on screen now
    if (by > ph * 0.8 || by + bhh < 0) return null;
    const tg = { x: bx + bw2 * 0.42, y: by + bhh * 0.55 };
    const click = Math.max(arriveP + 6, Math.round(len * 0.5)); // the moment of the click
    const boxAt = L.fx === "cursor" ? click : Math.round(len * 0.36);
    const nodes: React.ReactNode[] = [];
    if (L.fx === "cursor" || L.fx === "callout") {
      const q = pop(f, boxAt, 7);
      if (f >= boxAt) nodes.push(<div key="box" style={{ position: "absolute", left: bx, top: by, width: bw2, height: bhh, borderRadius: 16 * s, border: `${4.5 * s}px solid ${accent}`, background: alpha(accent, 0.13), boxShadow: `0 0 ${34 * s}px ${alpha(accent, 0.55)}`, transform: `scale(${0.82 + 0.18 * Math.min(1.15, q)})`, opacity: Math.min(1, q * 2.2), zIndex: 4 }} />);
      if (note && f >= boxAt + 5) {
        const qb = pop(f, boxAt + 5, 9);
        const below = by + bhh + 110 * s < ph;
        nodes.push(<div key="bub" style={{ position: "absolute", left: Math.min(pw - 24 * s, Math.max(24 * s, tg.x)), top: below ? by + bhh + 18 * s : by - 18 * s, transform: `translate(-50%, ${below ? 0 : -100}%) scale(${0.5 + 0.5 * Math.min(1.1, qb)})`, opacity: Math.min(1, qb * 2), zIndex: 5, direction: "rtl", background: accent, color: "#0E1B2C", fontWeight: 900, fontSize: 40 * s, padding: `${9 * s}px ${26 * s}px`, borderRadius: 999, boxShadow: `0 ${8 * s}px ${24 * s}px rgba(0,0,0,.35)`, whiteSpace: "nowrap" }}>{note}</div>);
      }
    }
    if (L.fx === "cursor") {
      const t0 = Math.round(arriveP * 0.5);
      const q = ease(Math.max(0, Math.min(1, (f - t0) / Math.max(1, click - t0))));
      const cx = bez3(pw * 1.1, pw * 0.95, pw * 0.15, tg.x, q) + (f > click ? Math.min(1, (f - click) / 40) * pw * 0.05 : 0);
      const cyy = bez3(ph * 0.95, ph * 0.3, ph * 0.9, tg.y, q);
      const press = f >= click && f < click + 5 ? 0.78 : 1;
      const rp2 = interpolate(f, [click, click + 14], [0, 1], cl);
      if (f >= click && rp2 < 1) nodes.push(<div key="rip" style={{ position: "absolute", left: tg.x - 60 * s * rp2, top: tg.y - 60 * s * rp2, width: 120 * s * rp2, height: 120 * s * rp2, borderRadius: "50%", border: `${5 * s}px solid ${accent}`, opacity: 1 - rp2, zIndex: 5 }} />);
      nodes.push(<Cursor key="cur" x={cx} y={cyy} size={66 * s} press={press} />);
    }
    if (L.fx === "hand") {
      const f12 = Math.floor(f / F12) * F12; // low frame rate on purpose
      const t1 = Math.round(len * 0.32);
      const pr = ease(Math.max(0, Math.min(1, (f12 - t1) / (MFPS * 0.5))));
      const ccx = bx + bw2 / 2, ccy = by + bhh / 2, rx = bw2 / 2 + 16 * s, ry = bhh / 2 + 14 * s;
      let d = "";
      for (let i = 0; i <= 44; i++) { const a = (i / 44) * Math.PI * 2 * 1.07 - 0.6; const j = 1 + (rnd(i + 5) - 0.5) * 0.07; d += `${i ? "L" : "M"}${(ccx + Math.cos(a) * rx * j).toFixed(1)} ${(ccy + Math.sin(a) * ry * j).toFixed(1)} `; }
      const nx = Math.min(pw - 150 * s, Math.max(150 * s, tg.x)), ny = by + bhh + 120 * s > ph ? by - 110 * s : by + bhh + 120 * s;
      const pr2 = ease(Math.max(0, Math.min(1, (f12 - t1 - MFPS * 0.4) / (MFPS * 0.3))));
      nodes.push(
        <svg key="svg" width={pw} height={ph} style={{ position: "absolute", left: 0, top: 0, zIndex: 4, overflow: "visible" }}>
          <path d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pr} fill="none" stroke="#ff3b30" strokeWidth={5.5 * s} strokeLinecap="round" strokeLinejoin="round" />
          {note && <path d={`M${nx} ${ny < by ? ny + 40 * s : ny - 40 * s} Q${(nx + ccx) / 2 + 30 * s} ${(ny + ccy) / 2} ${ccx + rx * 0.3} ${ny < by ? by - 6 * s : by + bhh + 6 * s}`} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - pr2} fill="none" stroke="#ff3b30" strokeWidth={5 * s} strokeLinecap="round" />}
        </svg>
      );
      if (note && f12 >= t1 + MFPS * 0.45) nodes.push(<div key="note" style={{ position: "absolute", left: nx, top: ny, transform: `translate(-50%,-50%) rotate(${-4 + (Math.round(f12 / F12) % 2 ? 0.7 : -0.7)}deg)`, zIndex: 5, background: "#fff176", color: "#222", direction: "rtl", fontWeight: 900, fontSize: 40 * s, padding: `${10 * s}px ${26 * s}px`, boxShadow: `0 ${7 * s}px 0 rgba(0,0,0,.22)`, whiteSpace: "nowrap" }}><span style={{ position: "absolute", top: -14 * s, left: "50%", width: 90 * s, height: 26 * s, marginLeft: -45 * s, background: "rgba(255,255,255,.65)", transform: "rotate(3deg)" }} />{note}</div>);
    }
    return <>{nodes}</>;
  };
  const screen = P ? P.render(annot(P.off, P.ratio), L.fx === "shine") : null;

  const glow = L.fx === "glow" ? `0 0 ${60 * s}px ${alpha(accent, 0.45 + 0.2 * Math.sin(t * 3))}, ` : "";
  const shadow = `${glow}0 ${40 * s}px ${90 * s}px rgba(0,0,0,.45)`;
  let device: React.ReactNode = null;
  if (P && screen) {
    if (fr === "bare") device = screen;
    else if (fr === "collage") {
      device = (
        <div style={{ position: "relative", width: outerW, filter: `drop-shadow(${9 * s}px ${9 * s}px 0 #14213d)` }}>
          <div style={{ padding: bz, background: "#fbf7ec", clipPath: torn(7, 1.4, 5) }}>{screen}</div>
          {[[-0.04, -0.012, -9], [0.8, -0.016, 7]].map(([x, y, r], i) => <div key={i} style={{ position: "absolute", left: outerW * x, top: outerH * y, width: 150 * s, height: 44 * s, background: "rgba(255,226,120,.82)", transform: `rotate(${r}deg)`, boxShadow: "0 2px 4px rgba(0,0,0,.15)" }} />)}
          <div style={{ position: "absolute", right: -20 * s, bottom: -26 * s, width: 116 * s, height: 116 * s, borderRadius: "50%", background: accent, color: "#14213d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 66 * s, fontWeight: 900, transform: `rotate(${12 + Math.sin(t * 2) * 3}deg)`, border: `${5 * s}px solid #14213d` }}>★</div>
        </div>
      );
    } else if (phone && fr !== "card") {
      device = (
        <div style={{ width: outerW, height: outerH, padding: bz, boxSizing: "border-box", borderRadius: radius + bz, background: "linear-gradient(145deg, #2a2a2e, #0c0c0e)", boxShadow: shadow, position: "relative" }}>
          {screen}
          <div style={{ position: "absolute", top: bz * 1.6, left: "50%", transform: "translateX(-50%)", width: pw * 0.26, height: pw * 0.055, borderRadius: 999, background: "#050505" }} />
        </div>
      );
    } else if (!phone && fr !== "card") {
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
  }

  // --- two screens at once: computer + phone ---
  let special: React.ReactNode = null;
  if (fr === "duo" && S?.b) {
    const A = h - topZone - botZone;
    const portrait = h > w;
    const bw0 = portrait ? 0.88 * w : 0.62 * w;
    const deskH0 = bw0 * (0.625 + 0.045);
    const phW0 = portrait ? 0.34 * w : bw0 * 0.25;
    const phH0 = phW0 * 2.17;
    const dx0 = portrait ? bw0 - phW0 * 0.85 : bw0 - phW0 * 0.4;
    const dy0 = portrait ? deskH0 * 0.55 : deskH0 - phH0 * 0.9;
    const BW = Math.max(bw0, dx0 + phW0), BH = Math.max(deskH0, dy0 + phH0);
    const k1 = Math.min(1, (w * 0.92) / BW, A / BH);
    const ox = (w - BW * k1) / 2, oy = topZone + (A - BH * k1) / 2;
    const deskShot = phone ? { url: g.url2, d: { y: S.b.y, y0: S.y > 0 ? Math.round(S.b.y * (S.y0 / S.y)) : 0, y2: S.b.y + 700, w: S.b.w, h: S.b.h } } : { url: g.url, d: S };
    const phShot = phone ? { url: g.url, d: S } : { url: g.url2, d: { y: S.b.y, y0: S.y > 0 ? Math.round(S.b.y * (S.y0 / S.y)) : 0, y2: S.b.y + 900, w: S.b.w, h: S.b.h } };
    const dbw = bw0 * k1, dbar = 0.045 * dbw, dsw = dbw, dsh = dbw * 0.625;
    const pbz = 0.045 * phW0 * k1, pww = phW0 * k1, psw = pww - 2 * pbz, psh = psw * (844 / 390);
    const D = screenOf(deskShot.url, deskShot.d, dsw, dsh, 0);
    const Ph = screenOf(phShot.url, phShot.d, psw, psh, psw * 0.11);
    const pq = pop(f, 7, 11);
    special = (
      <>
        <div style={{ position: "absolute", left: ox, top: oy, width: dbw, borderRadius: 18 * s, overflow: "hidden", background: "#1d1f24", boxShadow: shadow }}>
          <div style={{ height: dbar, display: "flex", alignItems: "center", gap: dbar * 0.22, padding: `0 ${dbar * 0.5}px`, background: "#2a2d33", direction: "ltr" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} style={{ width: dbar * 0.3, height: dbar * 0.3, borderRadius: "50%", background: c }} />)}
            <div style={{ flex: 1, marginInlineStart: dbar * 0.4, height: dbar * 0.62, borderRadius: 999, background: "#15171b", color: "#aab", fontSize: dbar * 0.36, display: "flex", alignItems: "center", padding: `0 ${dbar * 0.45}px`, fontFamily: "sans-serif", whiteSpace: "nowrap", overflow: "hidden" }}>🔒 {S.host}</div>
          </div>
          {D.render(undefined, L.fx === "shine")}
        </div>
        <div style={{ position: "absolute", left: ox + dx0 * k1, top: oy + dy0 * k1 + Math.sin(t * 1.3) * 7 * s, width: pww, padding: pbz, boxSizing: "border-box", borderRadius: psw * 0.11 + pbz, background: "linear-gradient(145deg, #2a2a2e, #0c0c0e)", boxShadow: `0 ${30 * s}px ${70 * s}px rgba(0,0,0,.55)`, transform: `scale(${0.6 + 0.4 * Math.min(1.08, pq)})`, opacity: Math.min(1, pq * 2) }}>
          {Ph.render()}
          <div style={{ position: "absolute", top: pbz * 1.6, left: "50%", transform: "translateX(-50%)", width: psw * 0.26, height: psw * 0.055, borderRadius: 999, background: "#050505" }} />
        </div>
      </>
    );
  }

  // --- a bento grid of the page's parts ---
  if (fr === "bento" && S) {
    const A = h - topZone - botZone, X = w * 0.07, W = w * 0.86;
    const portrait = h > w;
    const cells: [number, number, number, number][] = portrait ? [[0, 0, 1, 0.42], [0, 0.44, 0.49, 0.3], [0.51, 0.44, 0.49, 0.3], [0, 0.76, 1, 0.24]] : [[0, 0, 0.5, 1], [0.52, 0, 0.48, 0.48], [0.52, 0.52, 0.23, 0.48], [0.77, 0.52, 0.23, 0.48]];
    const stride = Math.max(140, Math.min(900, (S.y2 - S.y) / 3));
    special = (
      <>
        {cells.map(([cx0, cy0, cw0, ch0], i) => {
          const cw = cw0 * W - (cw0 < 1 ? 7 * s : 0), chh = ch0 * A - 7 * s;
          const ratio = cw / S.w, vc = chh / ratio, mx = Math.max(0, S.h - vc);
          const oy = Math.max(0, Math.min(mx, S.y - 24 + i * stride + (f / len) * 120));
          const q = pop(f, 3 + i * 5, 12);
          return (
            <div key={i} style={{ position: "absolute", left: X + cx0 * W, top: topZone + cy0 * A, width: cw, height: chh, borderRadius: 30 * s, overflow: "hidden", background: "#fff", border: `${3 * s}px solid rgba(255,255,255,.7)`, boxShadow: `0 ${18 * s}px ${44 * s}px rgba(0,0,0,.38)`, transform: `scale(${0.6 + 0.4 * Math.min(1.08, q)})`, opacity: Math.min(1, q * 2) }}>
              {g.url ? <Img src={g.url} style={{ position: "absolute", left: 0, top: 0, width: cw, height: S.h * ratio, transform: `translateY(${-oy * ratio}px)` }} /> : <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${accent}55, ${bgc})` }} />}
            </div>
          );
        })}
      </>
    );
  }

  // --- a type break: big moving words over the blurred page ---
  let typeBreak: React.ReactNode = null;
  if (fr === "type") {
    const big = (txt || g.hl || S?.host || "").split(/\s+/).filter(Boolean).slice(0, 9);
    const tsz = Math.min(h * 0.13, w * 0.17) * Math.max(0.6, Math.min(1.4, (m.tscale ?? 1) * (g.ts ?? 1)));
    const ratio = w * 1.25 / (S?.w ?? 390);
    typeBreak = (
      <>
        {g.url && S ? <Img src={g.url} style={{ position: "absolute", left: -w * 0.125, top: 0, width: w * 1.25, height: S.h * ratio, transform: `translateY(${-(S.y * ratio) - t * 14}px) scale(1.05)`, filter: "blur(16px) brightness(.42) saturate(1.2)" }} /> : null}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: tsz * 0.06, direction: "rtl", padding: `0 ${40 * s}px` }}>
          {big.map((wd, i) => { const q = pop(f, 3 + i * 5, 9); const hi = !!g.hl && g.hl.includes(wd); return <div key={i} style={{ fontWeight: 900, fontSize: tsz, lineHeight: 1.12, color: hi ? accent : "#fff", textShadow: `0 ${6 * s}px ${28 * s}px rgba(0,0,0,.5)`, transform: `translateY(${(1 - Math.min(1.05, q)) * 90 * s}px) rotate(${(i % 2 ? 1 : -1) * (1 - Math.min(1, q)) * 6 + (i % 2 ? 1.2 : -1.2)}deg) scale(${0.7 + 0.3 * Math.min(1.1, q)})`, opacity: Math.min(1, q * 2) }}>{wd}</div>; })}
          {g.sub ? <div style={{ marginTop: 20 * s, padding: `${8 * s}px ${28 * s}px`, borderRadius: 999, background: accent, color: "#0E1B2C", fontSize: 38 * s, fontWeight: 900, opacity: Math.min(1, pop(f, 3 + big.length * 5, 12) * 2) }}>{g.sub}</div> : null}
        </div>
      </>
    );
  }

  // --- click ripple / highlight ring (device looks) ---
  const rp = interpolate(f, [len * 0.42, len * 0.62], [0, 1], cl);
  const fxLayer = P ? (
    <>
      {L.fx === "ripple" && rp > 0 && rp < 1 && (
        <div style={{ position: "absolute", left: left + outerW * 0.5, top: top + chrome + outerH * 0.45, width: 0, height: 0 }}>
          <div style={{ position: "absolute", width: 150 * s * rp, height: 150 * s * rp, marginLeft: -75 * s * rp, marginTop: -75 * s * rp, borderRadius: "50%", border: `${6 * s}px solid ${accent}`, opacity: 1 - rp }} />
          <div style={{ position: "absolute", width: 34 * s, height: 34 * s, marginLeft: -17 * s, marginTop: -17 * s, borderRadius: "50%", background: accent, opacity: 0.85 * (1 - rp * 0.6) }} />
        </div>
      )}
      {L.fx === "ring" && fr !== "bare" && (
        <div style={{ position: "absolute", left: left - 14 * s, top: top - 14 * s, width: outerW + 28 * s, height: outerH + chrome + 28 * s, borderRadius: radius + 18 * s, border: `${5 * s}px solid ${accent}`, opacity: 0.55 + 0.4 * Math.sin(t * 3.2), boxShadow: `0 0 ${40 * s}px ${alpha(accent, 0.5)}` }} />
      )}
    </>
  ) : null;

  // --- text ---
  const zoneTop = fr === "bare" ? h * 0.08 : h * 0.05;
  const words = txt.split(/\s+/).filter(Boolean);
  const slam = 1 + 0.5 * hk; // hook: the text slams in big
  let label: React.ReactNode = null;
  if (txt && fr !== "type") {
    const common: React.CSSProperties = { direction: "rtl", textAlign: "center", fontWeight: 900, lineHeight: 1.25, fontSize: fs, color: ink };
    if (L.text === "pill") label = <div style={{ ...common, color: warm ? "#ffffff" : "#0E1B2C", background: warm ? "#14213d" : accent, padding: `${12 * s}px ${34 * s}px`, borderRadius: 999, boxShadow: `0 ${10 * s}px ${30 * s}px rgba(0,0,0,.3)`, transform: `scale(${(0.6 + 0.4 * tin) * slam})`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.9 }}>{txt}</div>;
    else if (L.text === "kinetic") label = <div style={{ ...common, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${18 * s}px`, textShadow: light ? "none" : `0 ${4 * s}px ${20 * s}px rgba(0,0,0,.5)`, maxWidth: w * 0.92, transform: `scale(${slam})` }}>{words.map((wd, i) => { const q = pop(f, 4 + i * 4, 13); const isHl = !!g.hl && g.hl.includes(wd); return <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - q) * 40 * s}px)`, opacity: Math.min(1, q * 1.6), color: isHl ? hlc : ink }}>{wd}</span>; })}</div>;
    else if (L.text === "big") label = <div style={{ ...common, textShadow: light ? "none" : `0 ${6 * s}px ${26 * s}px rgba(0,0,0,.45)`, transform: `translateY(${(1 - tin) * 30 * s}px) scale(${(0.9 + 0.1 * tin) * slam})`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.92 }}><Hl text={txt} hl={g.hl} color={hlc} /></div>;
    else if (L.text === "outline") label = <div style={{ ...common, color: "transparent", WebkitTextStroke: `${3 * s}px ${light ? "#14213d" : "#fff"}`, transform: `translateY(${(1 - tin) * 24 * s}px) scale(${slam})`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.92 }}>{g.hl && txt.includes(g.hl) ? <><span>{txt.slice(0, txt.indexOf(g.hl))}</span><span style={{ color: hlc, WebkitTextStroke: 0 }}>{g.hl}</span><span>{txt.slice(txt.indexOf(g.hl) + g.hl.length)}</span></> : txt}</div>;
    else if (L.text === "glass") label = <div style={{ ...common, background: light ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.14)", border: `${2 * s}px solid ${light ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.35)"}`, backdropFilter: "blur(18px)", padding: `${16 * s}px ${34 * s}px`, borderRadius: 30 * s, transform: `translateY(${(1 - tin) * 26 * s}px) scale(${slam})`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.9 }}><Hl text={txt} hl={g.hl} color={hlc} /></div>;
    else if (L.text === "torn") label = <div style={{ filter: `drop-shadow(0 ${6 * s}px 0 rgba(0,0,0,.3))`, transform: `rotate(${-1.6 + (Math.round(f / F12) % 2 ? 0.4 : 0)}deg) scale(${(0.7 + 0.3 * tin) * slam})`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.9 }}><div style={{ ...common, color: "#14213d", background: "#f7f0df", padding: `${16 * s}px ${40 * s}px`, clipPath: torn(11, 9, 6) }}><Hl text={txt} hl={g.hl} color="#c2255c" /></div></div>;
    else label = <div style={{ ...common, display: "flex", alignItems: "center", gap: 16 * s, background: "rgba(8,10,18,.72)", color: "#fff", padding: `${14 * s}px ${30 * s}px`, borderRadius: 22 * s, borderInlineStart: `${10 * s}px solid ${accent}`, transform: `translateX(${(1 - tin) * 60 * s}px)`, opacity: Math.min(1, tin * 2), maxWidth: w * 0.9 }}><Hl text={txt} hl={g.hl} color={hlc} /></div>;
  }
  const sub = g.sub && fr !== "type" ? <div style={{ marginTop: 12 * s, padding: `${6 * s}px ${22 * s}px`, borderRadius: 999, background: light ? "#14213d" : "rgba(255,255,255,.9)", color: light ? "#fff" : "#0E1B2C", fontSize: 32 * s, fontWeight: 800, direction: "rtl", opacity: Math.min(1, tin * 2) }}>{g.sub}</div> : null;
  const textBox = (label || sub) ? (
    <div style={{ position: "absolute", left: 0, right: 0, ...(lower ? { top: h * 0.74 } : { top: zoneTop }), display: "flex", flexDirection: "column", alignItems: "center", padding: `0 ${40 * s}px` }}>{label}{sub}</div>
  ) : null;

  const wrapperStyle: React.CSSProperties = device
    ? { position: "absolute", left, top, width: outerW, transformOrigin: origin, ...enter, transform: `${etf} ${rot}${persp}${tilt} ${cam}`.trim() || undefined }
    : { position: "absolute", inset: 0, transformOrigin: origin === "50% 50%" ? "50% 45%" : origin, ...enter, transform: `${etf} ${cam}`.trim() || undefined };

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: out }}>
      <Background kind={L.bg} f={f} w={w} h={h} accent={accent} bg={bgc} />
      {fr === "bare" && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.5), transparent 35%, transparent 62%, rgba(0,0,0,.45))", zIndex: 1 }} />}
      <div style={wrapperStyle}>{device ?? special ?? typeBreak}</div>
      {fxLayer}
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>{textBox}</div>
      {flash > 0 && <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash, zIndex: 8 }} />}
    </div>
  );
}
