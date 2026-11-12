import React from "react";
import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { GraphicView, Words, isLight, panelBackground, themeFor } from "./Graphics";
import { MFPS, captionLines, cutTimes, faceAt, gradeFilter, introFrames, outroFrames, videoSeconds, type Graphic, type MontageSpec, type Seg } from "./montage";

const ease = Easing.bezier(0.22, 1, 0.36, 1);

function Rise({ text, delay = 0, style }: { text: string; delay?: number; style?: React.CSSProperties }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.28em", ...style }}>
      {text.split(/\s+/).filter(Boolean).map((w, i) => {
        const p = spring({ frame: frame - delay - i * 3, fps, config: { damping: 200 } });
        return <span key={i} style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.4}em)` }}>{w}</span>;
      })}
    </div>
  );
}

function Card({ title, subtitle, m, u, len }: { title: string; subtitle: string; m: MontageSpec; u: number; len: number }) {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [len - 8, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line = interpolate(frame, [4, 22], [0, 1], { extrapolateRight: "clamp", easing: ease });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 80% at 50% 40%, ${m.colors.bg} 0%, #000 120%)`, alignItems: "center", justifyContent: "center", opacity: out }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 * u, width: "84%", textAlign: "center" }}>
        <div style={{ width: 160 * u * line, height: 6 * u, borderRadius: 9, background: m.colors.accent }} />
        <Rise text={title} delay={4} style={{ color: m.colors.text, fontSize: 96 * u, fontWeight: 800, lineHeight: 1.25 }} />
        {subtitle && <Rise text={subtitle} delay={14} style={{ color: m.colors.accent, fontSize: 52 * u, fontWeight: 600 }} />}
      </div>
    </AbsoluteFill>
  );
}

/** The footage: kept segments back to back, cover-fitted, with smooth punch-in zooms. */
function Footage({ m }: { m: MontageSpec }) {
  const frame = useCurrentFrame();
  const t = frame / MFPS;
  let scale = 1;
  for (const z of m.zooms) {
    const a = z.at, b = z.at + z.dur;
    if (t >= a - 0.4 && t <= b + 0.4) {
      const k = Math.min(interpolate(t, [a - 0.4, a], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }), interpolate(t, [b, b + 0.4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }));
      scale = Math.max(scale, 1 + (z.scale - 1) * k);
    }
  }
  if (m.transition === "zoom") {
    for (const c of cutTimes(m)) if (t >= c && t < c + 0.3) scale *= interpolate(t, [c, c + 0.3], [1.14, 1], { easing: ease });
  }
  let shift = 0, blur = 0;
  if (m.transition === "whip" || m.transition === "blur") {
    for (const c of cutTimes(m)) {
      if (t >= c - 0.12 && t < c + 0.22) {
        const k = t < c ? interpolate(t, [c - 0.12, c], [0, 1]) : interpolate(t, [c, c + 0.22], [1, 0], { easing: ease });
        blur = Math.max(blur, k * (m.transition === "whip" ? 14 : 18));
        if (m.transition === "whip") shift = (t < c ? -1 : 1) * k * 12;
      }
    }
  }
  let rot = 0, dy = 0, glitch = "";
  const tr = m.transition ?? "none";
  if (tr === "slide" || tr === "spin" || tr === "shake" || tr === "glitch") {
    for (const c of cutTimes(m)) {
      if (tr === "glitch" && t >= c - 0.1 && t < c + 0.2) {
        const j = Math.sin(t * 173) * 1.6 + Math.sin(t * 91) * 1.1;
        shift += j; dy += Math.sin(t * 57) * 0.8;
        const a = 10 * (1 - Math.abs(t - c) / 0.2);
        glitch = `drop-shadow(${a}px 0 0 rgba(255,0,80,.55)) drop-shadow(${-a}px 0 0 rgba(0,220,255,.55)) hue-rotate(${Math.sin(t * 40) * 25}deg)`;
      }
      if (t < c || t >= c + 0.35) continue;
      const k = interpolate(t, [c, c + 0.35], [1, 0], { easing: ease });
      if (tr === "slide") shift += k * 100;
      if (tr === "spin") { rot += k * -14; scale *= 1 + k * 0.28; }
      if (tr === "shake") { shift += Math.sin(t * 95) * 2.2 * k; dy += Math.cos(t * 80) * 1.6 * k; rot += Math.sin(t * 60) * 1.2 * k; }
    }
  }
  let off = 0;
  return (
    <AbsoluteFill style={{ transform: `translate(${shift}%, ${dy}%) rotate(${rot}deg) scale(${scale})`, transformOrigin: "50% 38%", filter: [gradeFilter(m), blur ? `blur(${blur}px)` : "", glitch].filter((x) => x && x !== "none").join(" ") || "none" }}>
      {m.segments.map((g, i) => {
        const from = Math.round(off * MFPS);
        const len = Math.max(1, Math.round((g.e - g.s) * MFPS));
        off += g.e - g.s;
        return (
          <Sequence key={i} from={from} durationInFrames={len} premountFor={MFPS}>
            <SegmentVideo m={m} g={g} i={i} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

function Captions({ m, u }: { m: MontageSpec; u: number }) {
  const frame = useCurrentFrame();
  const t = frame / MFPS;
  const lines = React.useMemo(() => captionLines(m), [m]);
  let line = m.captions.on ? lines.find((l) => t >= l[0].s - 0.05 && t <= l[l.length - 1].e + 0.25) : undefined;
  if (line && m.captions.style === "pop") {
    // two words at a time, big
    const chunks: (typeof line)[] = [];
    for (let i = 0; i < line.length; i += 2) chunks.push(line.slice(i, i + 2));
    line = [...chunks].reverse().find((c) => t >= c[0].s - 0.05) ?? chunks[0];
  }
  const second = m.subs2?.on ? m.subs2.lines.find((l) => t >= l.s - 0.05 && t <= l.e + 0.25) : undefined;
  if (!line && !second) return null;
  const st = m.captions.style;
  const free = typeof m.captions.y === "number";
  const size = (st === "minimal" ? 52 : st === "pop" ? 104 : st === "outline" ? 78 : 70) * u;
  const appear = line ? (st === "pop" ? Math.min(1.06, spring({ frame: frame - Math.round(line[0].s * MFPS) + 2, fps: MFPS, config: { damping: 10, mass: 0.5 } })) : interpolate(t, [line[0].s - 0.05, line[0].s + 0.1], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : 1;
  return (
    <AbsoluteFill style={free ? {} : {
      alignItems: "center",
      justifyContent: m.captions.pos === "middle" ? "center" : m.captions.pos === "top" ? "flex-start" : "flex-end",
      paddingBottom: m.captions.pos === "middle" || m.captions.pos === "top" ? 0 : "22%",
      paddingTop: m.captions.pos === "top" ? "26%" : m.captions.pos === "middle" ? "18%" : 0,
    }}>
      <div style={free ? { position: "absolute", left: `${(m.captions.x ?? 0.5) * 100}%`, top: `${(m.captions.y ?? 0.75) * 100}%`, transform: "translate(-50%, -50%)", width: "90%", display: "flex", flexDirection: "column", alignItems: "center" } : { display: "contents" }}>
      {line && <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.3em", maxWidth: "86%", textAlign: "center",
        fontSize: size, fontWeight: 800, lineHeight: 1.35, transform: `scale(${appear})`,
        ...(st === "box" ? { background: "rgba(0,0,0,.62)", padding: `${14 * u}px ${28 * u}px`, borderRadius: 22 * u } : {}),
      }}>
        {line.map((w, i) => {
          const active = t >= w.s && t <= w.e + 0.05;
          const said = t > w.e;
          const A = m.colors.accent;
          if (st === "highlight") return (
            <span key={i} style={{ display: "inline-block", color: active ? "#0E1B2C" : "#fff", background: active ? A : "transparent", borderRadius: 14 * u, padding: `0 ${12 * u}px`, transform: active ? "scale(1.06) rotate(-2deg)" : "none", textShadow: active ? "none" : `0 ${4 * u}px ${16 * u}px rgba(0,0,0,.85)` }}>{w.t}</span>
          );
          if (st === "neon") return (
            <span key={i} style={{ display: "inline-block", color: active ? "#fff" : A, textShadow: `0 0 ${10 * u}px ${A}, 0 0 ${26 * u}px ${A}, 0 0 ${48 * u}px ${A}`, transform: active ? "scale(1.1)" : "none" }}>{w.t}</span>
          );
          if (st === "outline" || st === "pop") return (
            <span key={i} style={{ display: "inline-block", color: active ? A : "#fff", WebkitTextStroke: `${(st === "pop" ? 9 : 7) * u}px #000`, paintOrder: "stroke fill", textShadow: `0 ${6 * u}px 0 rgba(0,0,0,.9)`, transform: active && st === "outline" ? "scale(1.1)" : "none" }}>{w.t}</span>
          );
          const color = st === "minimal" ? "#fff" : active ? A : said || st === "box" ? "#fff" : "rgba(255,255,255,.9)";
          return (
            <span key={i} style={{
              color, display: "inline-block",
              transform: active && st === "karaoke" ? "scale(1.12)" : "none",
              textShadow: st === "box" ? "none" : `0 ${4 * u}px ${18 * u}px rgba(0,0,0,.85), 0 0 ${3 * u}px rgba(0,0,0,.9)`,
              WebkitTextStroke: st === "karaoke" ? `${2 * u}px rgba(0,0,0,.55)` : undefined,
              paintOrder: "stroke fill",
            }}>{w.t}</span>
          );
        })}
      </div>}
      {second && (
        <div dir="auto" style={{ marginTop: 14 * u, maxWidth: "86%", textAlign: "center", color: "#fff", fontSize: 42 * u, fontWeight: 600, lineHeight: 1.3, fontFamily: "Inter, Arial, sans-serif", background: "rgba(0,0,0,.5)", padding: `${8 * u}px ${18 * u}px`, borderRadius: 14 * u }}>{second.t}</div>
      )}
      </div>
    </AbsoluteFill>
  );
}

/** Extra shots over the speech: full screen with a slow push-in, soft fade in/out. */
function BRollLayer({ m }: { m: MontageSpec }) {
  return (
    <>
      {(m.broll ?? []).filter((b) => b.url).map((b, i) => {
        const len = Math.max(6, Math.round(b.dur * MFPS));
        return (
          <Sequence key={i} from={Math.round(b.at * MFPS)} durationInFrames={len} layout="none">
            {b.cut ? <CutoutShot url={b.url} len={len} i={i} /> : <BRollShot url={b.url} len={len} />}
          </Sequence>
        );
      })}
    </>
  );
}
/** Background-removed photo: floats over the video with a shadow instead of covering it. */
function CutoutShot({ url, len, i }: { url: string; len: number; i: number }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: f, fps, config: { damping: 11, mass: 0.7 } });
  const out = interpolate(f, [len - 7, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bob = Math.sin(f / 9) * 10;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,0,0,.45), transparent 70%)", opacity: Math.min(1, p) }} />
      <Img src={url} style={{ width: "78%", height: "62%", objectFit: "contain", transform: `translateY(${bob + (1 - Math.min(1, p)) * 120}px) scale(${0.6 + 0.4 * Math.min(1.05, p)}) rotate(${(1 - Math.min(1, p)) * (i % 2 ? 8 : -8)}deg)`, filter: "drop-shadow(0 30px 40px rgba(0,0,0,.55))" }} />
    </AbsoluteFill>
  );
}
function BRollShot({ url, len }: { url: string; len: number }) {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" }), interpolate(f, [len - 6, len], [1, 0], { extrapolateLeft: "clamp" }));
  return (
    <AbsoluteFill style={{ opacity: o, background: "#000" }}>
      <Img src={url} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${interpolate(f, [0, len], [1, 1.1])})` }} />
    </AbsoluteFill>
  );
}

function Titles({ m, u }: { m: MontageSpec; u: number }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / MFPS;
  return (
    <>
      {m.titles.map((ti, i) => {
        if (t < ti.at - 0.1 || t > ti.at + ti.dur + 0.4) return null;
        if ((m.graphics ?? []).some((g) => t >= g.at && t < g.at + g.dur)) return null; // a graphic card owns the screen now
        const f0 = Math.round(ti.at * MFPS);
        const p = spring({ frame: frame - f0, fps, config: { damping: 14, mass: 0.7 } });
        const out = interpolate(t, [ti.at + ti.dur, ti.at + ti.dur + 0.35], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const style = ti.style ?? "pill";
        const centre = ti.pos === "center";
        const shadow = `0 ${4 * u}px ${24 * u}px rgba(0,0,0,.55)`;
        if (style === "kinetic") {
          // word by word pop, the key word in the accent colour
          const words = ti.text.split(/\s+/);
          return (
            <AbsoluteFill key={i} style={{ alignItems: "center", justifyContent: centre ? "center" : "flex-start", paddingTop: centre ? 0 : "16%", opacity: out }}>
              <div style={{ width: "86%", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${4 * u}px ${18 * u}px`, direction: "rtl" }}>
                {words.map((w, k) => {
                  const q = spring({ frame: frame - f0 - k * 3, fps, config: { damping: 11, mass: 0.5 } });
                  const hot = !!ti.hl && ti.hl.split(/\s+/).includes(w);
                  return <span key={k} style={{ fontSize: Math.min(124 * u, (width * 0.86) / Math.max(4, ti.text.length * 0.42)), fontWeight: 800, lineHeight: 1.15, color: hot ? m.colors.accent : m.colors.text, textShadow: shadow, display: "inline-block", opacity: Math.min(1, q), transform: `translateY(${(1 - Math.min(1, q)) * 40 * u}px) scale(${0.7 + 0.3 * Math.min(1.05, q)})` }}>{w}</span>;
                })}
              </div>
              {ti.sub && <div style={{ marginTop: 18 * u, fontSize: 40 * u, fontWeight: 600, color: m.colors.text, opacity: interpolate(frame - f0, [10, 20], [0, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), textShadow: shadow }}>{ti.sub}</div>}
            </AbsoluteFill>
          );
        }
        if (style === "editorial") {
          const line = interpolate(frame - f0, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
          return (
            <AbsoluteFill key={i} style={{ alignItems: "center", justifyContent: centre ? "center" : "flex-start", paddingTop: centre ? 0 : "14%", opacity: out }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * u, width: "84%", textAlign: "center" }}>
                {ti.sub && <div style={{ fontSize: 34 * u, fontWeight: 700, letterSpacing: 1, color: m.colors.accent, textShadow: shadow, opacity: line }}>{ti.sub}</div>}
                <div style={{ fontSize: 86 * u, fontWeight: 800, lineHeight: 1.2, color: m.colors.text, textShadow: shadow, clipPath: `inset(0 0 ${(1 - Math.min(1, p)) * 100}% 0)`, transform: `translateY(${(1 - Math.min(1, p)) * 30 * u}px)` }}>{ti.text}</div>
                <div style={{ width: 200 * u * line, height: 7 * u, borderRadius: 9, background: m.colors.accent }} />
              </div>
            </AbsoluteFill>
          );
        }
        if (style === "marker" || style === "typewriter") {
          const th = { ...themeFor(m, false), text: m.colors.text };
          return (
            <AbsoluteFill key={i} style={{ alignItems: "center", justifyContent: centre ? "center" : "flex-start", paddingTop: centre ? 0 : "15%", opacity: out, filter: `drop-shadow(0 ${4 * u}px ${14 * u}px rgba(0,0,0,.6))` }}>
              <div style={{ width: "86%" }}><Words text={ti.text} hl={ti.hl || ti.text.split(/\s+/).slice(-1)[0]} f={frame - f0} size={Math.min(100 * u, (width * 0.86) / Math.max(4, ti.text.length * 0.45))} th={th} fx={style} /></div>
              {ti.sub && <div style={{ marginTop: 16 * u, fontSize: 40 * u, fontWeight: 600, color: m.colors.text }}>{ti.sub}</div>}
            </AbsoluteFill>
          );
        }
        if (style === "lower") {
          const x = interpolate(frame - f0, [0, 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
          return (
            <AbsoluteFill key={i} style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: `0 ${60 * u}px 30%`, opacity: out }}>
              <div style={{ transform: `translateX(${x * 130}%)`, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ background: m.colors.accent, color: m.colors.bg, fontSize: 54 * u, fontWeight: 800, padding: `${12 * u}px ${28 * u}px`, borderRadius: `${14 * u}px ${14 * u}px ${14 * u}px 0` }}>{ti.text}</div>
                {ti.sub && <div style={{ background: "rgba(0,0,0,.72)", color: "#fff", fontSize: 34 * u, fontWeight: 600, padding: `${8 * u}px ${24 * u}px`, borderRadius: `0 0 ${12 * u}px ${12 * u}px` }}>{ti.sub}</div>}
              </div>
            </AbsoluteFill>
          );
        }
        return (
          <AbsoluteFill key={i} style={{ alignItems: "center", justifyContent: centre ? "center" : "flex-start", paddingTop: centre ? 0 : "13%" }}>
            <div style={{
              maxWidth: "84%", textAlign: "center", padding: `${18 * u}px ${36 * u}px`, borderRadius: 24 * u,
              background: m.colors.accent, color: m.colors.bg, fontSize: 62 * u, fontWeight: 800, lineHeight: 1.3,
              opacity: Math.min(1, p) * out, transform: `scale(${0.6 + 0.4 * Math.min(1.08, p)}) rotate(${(1 - Math.min(1, p)) * -4}deg)`,
              boxShadow: `0 ${18 * u}px ${50 * u}px rgba(0,0,0,.45)`,
            }}>{ti.text}</div>
          </AbsoluteFill>
        );
      })}
    </>
  );
}

/** One kept piece of footage; the crop follows the speaker's face when tracking is on. */
function SegmentVideo({ m, g, i }: { m: MontageSpec; g: Seg; i: number }) {
  const frame = useCurrentFrame();
  const t = g.s + frame / MFPS;
  const f = faceAt(m, t);
  const k = Math.min(1, frame / Math.max(1, (g.e - g.s) * MFPS));
  const drift = m.drift ? (i % 2 ? 1.07 - 0.07 * k : 1 + 0.07 * k) : 1;
  return (
    <AbsoluteFill style={{ transform: drift !== 1 ? `scale(${drift})` : undefined }}>
      <OffthreadVideo src={m.src} trimBefore={Math.round(g.s * MFPS)} trimAfter={Math.max(Math.round(g.s * MFPS) + 1, Math.round(g.e * MFPS))} volume={m.videoVolume ?? 1}
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${(f.x * 100).toFixed(1)}% ${(Math.min(0.6, Math.max(0.2, f.y)) * 100).toFixed(1)}%` }} />
    </AbsoluteFill>
  );
}

/** White flash on every cut (when chosen). */
function Flashes({ m }: { m: MontageSpec }) {
  const t = useCurrentFrame() / MFPS;
  if (m.transition === "dip") {
    const c = cutTimes(m).find((x) => t >= x - 0.2 && t < x + 0.25);
    if (c === undefined) return null;
    return <AbsoluteFill style={{ background: "#000", opacity: t < c ? interpolate(t, [c - 0.2, c], [0, 1]) : interpolate(t, [c, c + 0.25], [1, 0]) }} />;
  }
  if (m.transition !== "flash") return null;
  const c = cutTimes(m).find((x) => t >= x && t < x + 0.22);
  if (c === undefined) return null;
  return <AbsoluteFill style={{ background: "#fff", opacity: interpolate(t, [c, c + 0.22], [0.6, 0]) }} />;
}

function Emojis({ m, u }: { m: MontageSpec; u: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / MFPS;
  return (
    <>
      {(m.emojis ?? []).map((x, i) => {
        if (t < x.at || t > x.at + x.dur + 0.3) return null;
        const p = spring({ frame: frame - Math.round(x.at * MFPS), fps, config: { damping: 9, mass: 0.6 } });
        const out = interpolate(t, [x.at + x.dur, x.at + x.dur + 0.3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const top = m.captions.pos === "top" ? "62%" : "30%";
        return (
          <AbsoluteFill key={i} style={{ alignItems: i % 2 ? "flex-start" : "flex-end", padding: `0 ${70 * u}px` }}>
            <div style={{ position: "absolute", top, fontSize: 140 * u, opacity: Math.min(1, p) * out, transform: `scale(${Math.min(1.15, p)}) rotate(${(1 - Math.min(1, p)) * 25 * (i % 2 ? -1 : 1)}deg)`, filter: `drop-shadow(0 ${10 * u}px ${20 * u}px rgba(0,0,0,.45))` }}>{x.e}</div>
          </AbsoluteFill>
        );
      })}
    </>
  );
}

function Logo({ m, u }: { m: MontageSpec; u: number }) {
  const { width: W, height: H } = useVideoConfig();
  if (!m.logo?.on || !m.logo.url) return null;
  const b = m.logo.box;
  if (b) {
    return (
      <div style={{ position: "absolute", left: b.x * W, top: b.y * H, width: b.w * W, height: b.w * W, transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Img src={m.logo.url} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: `drop-shadow(0 ${4 * u}px ${12 * u}px rgba(0,0,0,.45))` }} />
      </div>
    );
  }
  const pos = m.logo.pos;
  const side = 60 * u;
  return (
    <div style={{ position: "absolute", [pos.startsWith("t") ? "top" : "bottom"]: side * 1.4, [pos.endsWith("l") ? "left" : "right"]: side, width: 150 * u, height: 150 * u, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.92 }}>
      <Img src={m.logo.url} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: `drop-shadow(0 ${4 * u}px ${12 * u}px rgba(0,0,0,.5))` }} />
    </div>
  );
}

function ProgressBar({ m, u, frames }: { m: MontageSpec; u: number; frames: number }) {
  const frame = useCurrentFrame();
  if (!m.progress) return null;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 9 * u, background: "rgba(255,255,255,.18)" }}>
      <div style={{ height: "100%", width: `${Math.min(100, (frame / frames) * 100)}%`, background: m.colors.accent, marginLeft: "auto" }} />
    </div>
  );
}

/** Whoosh on titles and cuts, pop on emojis. */
function Sfx({ m }: { m: MontageSpec }) {
  if (!m.sfx) return null;
  const at = (s: number) => Math.max(0, Math.round(s * MFPS));
  const cuts = m.transition && m.transition !== "none" ? cutTimes(m) : [];
  return (
    <>
      {m.titles.map((x, i) => <Sequence key={`t${i}`} from={at(x.at - 0.12)} durationInFrames={20} layout="none"><Audio src={staticFile("sfx/whoosh.mp3")} volume={0.5} /></Sequence>)}
      {cuts.map((c, i) => <Sequence key={`c${i}`} from={at(c - 0.1)} durationInFrames={18} layout="none"><Audio src={staticFile("sfx/whoosh.mp3")} volume={0.3} /></Sequence>)}
      {(m.emojis ?? []).map((x, i) => <Sequence key={`e${i}`} from={at(x.at)} durationInFrames={8} layout="none"><Audio src={staticFile("sfx/pop.mp3")} volume={0.6} /></Sequence>)}
    </>
  );
}

/** What the split panel / overlay card shows now: the newest active graphic (titles count as headlines in split). */
function activeGraphic(m: MontageSpec, t: number, withTitles: boolean): Graphic | undefined {
  const list: Graphic[] = [...(m.graphics ?? [])];
  if (withTitles) for (const ti of m.titles) list.push({ kind: "headline", at: ti.at, dur: ti.dur, text: ti.text, hl: ti.hl, sub: ti.sub });
  return list.filter((g) => t >= g.at && t < g.at + g.dur).sort((a, b) => b.at - a.at)[0];
}

/** Split layout: the graphics panel. With nothing scheduled it shows the words being said, big. */
function Panel({ m, w, h, area, opacity = 1, words = true, titles = true, boost = 1 }: { m: MontageSpec; w: number; h: number; area?: { x: number; y: number; w: number; h: number }; opacity?: number; words?: boolean; titles?: boolean; boost?: number }) {
  const frame = useCurrentFrame();
  const t = frame / MFPS;
  const light = isLight(m);
  const g = activeGraphic(m, t, titles);
  const A = area ?? { x: 0, y: 0, w, h };
  const lines = React.useMemo(() => captionLines(m), [m]);
  const th = themeFor(m, light);
  const s = Math.min(A.w / 1080, A.h / 760);
  let inner: React.ReactNode = null;
  let full = false;
  if (g) {
    const f0 = Math.round(g.at * MFPS);
    inner = <GraphicView key={`${g.kind}${g.at}`} g={g} m={m} f={frame - f0} len={Math.round(g.dur * MFPS)} w={g.kind === "scene" ? w : A.w} h={g.kind === "scene" ? h : A.h} light={light} boost={boost} />;
    if (g.kind === "scene") full = true;
  } else if (m.captions.on && words) {
    const line = lines.find((l) => t >= l[0].s - 0.05 && t <= l[l.length - 1].e + 0.35);
    if (line) inner = (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: `0 ${70 * s}px` }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${6 * s}px ${22 * s}px`, direction: "rtl" }}>
          {line.map((wd, i) => {
            const q = Math.min(1, spring({ frame: frame - Math.round(wd.s * MFPS) + 2, fps: MFPS, config: { damping: 13, mass: 0.5 } }));
            const on = t >= wd.s && t <= wd.e + 0.05;
            return <span key={i} style={{ fontSize: 96 * s, fontWeight: 800, lineHeight: 1.2, display: "inline-block", color: on ? th.accent : th.text, opacity: t < wd.s - 0.08 ? 0.18 : q, transform: `translateY(${(1 - q) * 24 * s}px)` }}>{wd.t}</span>;
          })}
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0, background: panelBackground(m, light), overflow: "hidden", opacity }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, opacity: light ? 0.5 : 0.35 }}>
        <circle cx={w * 0.9} cy={h * 0.12} r={Math.min(w, h) * 0.5} fill={m.colors.accent} opacity={0.08} />
        <circle cx={w * 0.05} cy={h * 1.05} r={Math.min(w, h) * 0.45} fill={m.colors.accent} opacity={0.06} />
      </svg>
      <div style={full ? { position: "absolute", inset: 0 } : { position: "absolute", left: A.x, top: A.y, width: A.w, height: A.h }}>{inner}</div>
    </div>
  );
}

/** Speaker inside a shape (circle / corner / card), graphics fill the rest. "dynamic" shrinks to the circle only while a graphic is on. */
function ShapedStage({ m, u }: { m: MontageSpec; u: number }) {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const t = frame / MFPS;
  const tall = H >= W;
  const lay = m.layout ?? "full";
  // target geometry of the small speaker
  const shape = lay === "dynamic" ? "circle" : lay;
  let r: { x: number; y: number; w: number; h: number; rad: number };
  let area: { x: number; y: number; w: number; h: number };
  if (shape === "circle") {
    const d = tall ? W * 0.56 : H * 0.62;
    r = tall ? { x: (W - d) / 2, y: H - d - H * 0.06, w: d, h: d, rad: d / 2 } : { x: W - d - W * 0.05, y: (H - d) / 2, w: d, h: d, rad: d / 2 };
    area = tall ? { x: 0, y: H * 0.04, w: W, h: r.y - H * 0.06 } : { x: W * 0.03, y: 0, w: r.x - W * 0.05, h: H };
  } else if (shape === "corner") {
    const w = tall ? W * 0.36 : W * 0.24, h = w * (tall ? 1.3 : 0.75);
    r = { x: W * 0.05, y: H - h - H * 0.05, w, h, rad: 34 * u };
    area = tall ? { x: 0, y: H * 0.05, w: W, h: r.y - H * 0.08 } : { x: r.x + w + W * 0.03, y: 0, w: W - (r.x + w + W * 0.06), h: H };
  } else {
    r = tall ? { x: W * 0.06, y: H * 0.43, w: W * 0.88, h: H * 0.52, rad: 46 * u } : { x: W * 0.5, y: H * 0.08, w: W * 0.45, h: H * 0.84, rad: 40 * u };
    area = tall ? { x: 0, y: H * 0.02, w: W, h: H * 0.39 } : { x: W * 0.02, y: 0, w: W * 0.46, h: H };
  }
  // dynamic: k = 0 full-screen speaker, 1 = small circle (around each graphic)
  let k = 1;
  if (lay === "dynamic") {
    k = 0;
    for (const g of m.graphics ?? []) {
      const a = g.at, b = g.at + g.dur;
      if (t >= a - 0.4 && t <= b + 0.4) k = Math.max(k, Math.min(interpolate(t, [a - 0.35, a], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease }), interpolate(t, [b, b + 0.35], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease })));
    }
  }
  const lerp = (a: number, b: number) => a + (b - a) * k;
  const box = { left: lerp(0, r.x), top: lerp(0, r.y), width: lerp(W, r.w), height: lerp(H, r.h), borderRadius: lerp(0, r.rad) };
  return (
    <>
      <Panel m={m} w={W} h={H} area={area} opacity={lay === "dynamic" ? k : 1} words={lay !== "dynamic"} titles={lay !== "dynamic"} />
      <div style={{ position: "absolute", ...box, overflow: "hidden", boxShadow: k > 0.05 ? `0 ${20 * u}px ${60 * u}px rgba(0,0,0,${0.35 * k})` : "none", outline: k > 0.05 ? `${6 * u * k}px solid ${m.colors.accent}` : "none", outlineOffset: -1 }}>
        <Footage m={m} />
        {m.vignette && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.5) 100%)" }} />}
        <Flashes m={m} />
        <BRollLayer m={m} />
      </div>
      {lay === "dynamic" && k < 0.5 && (m.captions.on || m.subs2?.on) && <Captions m={m} u={u} />}
      {lay !== "dynamic" && m.subs2?.on && <Captions m={{ ...m, captions: { ...m.captions, on: false } }} u={u} />}
    </>
  );
}

/** Board (animated lesson, no footage): graphics fill the screen, a subtitle line sits at the bottom. */
function Board({ m }: { m: MontageSpec }) {
  const frame = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const t = frame / MFPS;
  const light = isLight(m);
  const th = themeFor(m, light);
  const lines = React.useMemo(() => captionLines(m), [m]);
  const active = activeGraphic(m, t, true);
  const busy = !!active;
  const onPic = active?.kind === "scene"; // a drawn scene fills the whole screen; the line sits on top of it
  const line = m.captions.on && busy ? lines.find((l) => t >= l[0].s - 0.05 && t <= l[l.length - 1].e + 0.25) : undefined;
  const s = Math.min(W, H) / 1080;
  const capH = H * (H > W ? 0.16 : 0.18);
  return (
    <>
      <Panel m={m} w={W} h={H} area={{ x: 0, y: H * 0.04, w: W, h: H - capH - H * 0.04 }} boost={H > W * 1.3 ? 1.22 : 1} />
      {line && (
        <div style={typeof m.captions.y === "number"
          ? { position: "absolute", left: `${(m.captions.x ?? 0.5) * 100}%`, top: `${m.captions.y * 100}%`, transform: "translate(-50%, -50%)", width: "92%", display: "flex", justifyContent: "center" }
          : { position: "absolute", left: 0, right: 0, bottom: H * 0.05, height: capH - H * 0.05, display: "flex", alignItems: "center", justifyContent: "center", padding: `0 ${60 * s}px` }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${16 * s}px`, direction: "rtl", padding: `${12 * s}px ${30 * s}px`, borderRadius: 24 * s, background: onPic ? "rgba(0,0,0,.6)" : light ? "rgba(14,27,44,.06)" : "rgba(255,255,255,.08)" }}>
            {line.map((w, i) => <span key={i} style={{ fontSize: 50 * s, fontWeight: 700, color: onPic ? (t >= w.s && t <= w.e + 0.05 ? th.accent : "#fff") : t >= w.s && t <= w.e + 0.05 ? th.accent : t > w.e ? th.text : th.soft }}>{w.t}</span>)}
          </div>
        </div>
      )}
    </>
  );
}

/** Full layout: graphics appear as a frosted card over the footage. */
function OverlayGraphics({ m }: { m: MontageSpec }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / MFPS;
  const g = activeGraphic(m, t, false);
  if (!g) return null;
  const f0 = Math.round(g.at * MFPS);
  const len = Math.round(g.dur * MFPS);
  const cw = width * 0.9, ch = Math.min(height * 0.34, width * 0.7);
  const q = Math.min(1, spring({ frame: frame - f0, fps: MFPS, config: { damping: 15 } }));
  const out = interpolate(frame - f0, [len - 8, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const top = m.captions.pos === "top" ? (height - ch) / 2 : height * 0.07;
  return (
    <div style={{ position: "absolute", left: (width - cw) / 2, top, width: cw, height: ch, borderRadius: 48 * (width / 1080), overflow: "hidden", background: "rgba(10,16,26,.74)", backdropFilter: "blur(14px)", border: "2px solid rgba(255,255,255,.12)", opacity: q * out, transform: `scale(${0.9 + 0.1 * q})`, boxShadow: "0 30px 80px rgba(0,0,0,.45)" }}>
      <GraphicView g={g} m={m} f={frame - f0} len={len} w={cw} h={ch} light={false} />
    </div>
  );
}

/** Pop sound when a graphic appears. */
function GraphicSfx({ m }: { m: MontageSpec }) {
  if (!m.sfx) return null;
  return <>{(m.graphics ?? []).map((g, i) => <Sequence key={i} from={Math.max(0, Math.round(g.at * MFPS) - 2)} durationInFrames={16} layout="none"><Audio src={staticFile("sfx/whoosh.mp3")} volume={0.35} /></Sequence>)}</>;
}

export function MontageVideo(m: MontageSpec) {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const intro = introFrames(m);
  const vid = Math.max(1, Math.round(videoSeconds(m) * MFPS));
  const outro = outroFrames(m);
  const split = m.layout === "split";
  const shaped = m.layout === "circle" || m.layout === "corner" || m.layout === "card" || m.layout === "dynamic";
  // 9:16 and 1:1 → panel on top, speaker below; 16:9 → panel on the left, speaker on the right.
  const tall = height >= width;
  const ph = Math.round(height * (height > width * 1.3 ? 0.42 : 0.46)), pw = Math.round(width * 0.5);
  const box = tall
    ? { panel: { left: 0, top: 0, width, height: ph }, foot: { left: 0, top: ph, width, height: height - ph }, edge: { left: 0, top: ph - 3, width, height: 6 } }
    : { panel: { left: 0, top: 0, width: pw, height }, foot: { left: pw, top: 0, width: width - pw, height }, edge: { left: pw - 3, top: 0, width: 6, height } };
  return (
    <AbsoluteFill dir="rtl" style={{ background: "#000", fontFamily: `"${m.font}", Cairo, sans-serif` }}>
     <BeatWrap m={m} u={u}>
      {intro > 0 && m.sfx && <Audio src={staticFile("sfx/ding.mp3")} volume={0.35} endAt={20} />}
      {intro > 0 && <Sequence durationInFrames={intro}><Card title={m.intro.title} subtitle={m.intro.subtitle} m={m} u={u} len={intro} /></Sequence>}
      <Sequence from={intro} durationInFrames={vid}>
        {m.layout === "board" ? <Board m={m} /> : shaped ? <ShapedStage m={m} u={u} /> : split ? (
          <>
            <div style={{ position: "absolute", ...box.foot, overflow: "hidden" }}>
              <Footage m={m} />
              {m.vignette && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.5) 100%)" }} />}
              <Flashes m={m} />
              <BRollLayer m={m} />
              {m.subs2?.on && <Captions m={{ ...m, captions: { ...m.captions, on: false } }} u={u} />}
            </div>
            <div style={{ position: "absolute", ...box.panel, overflow: "hidden" }}><Panel m={m} w={box.panel.width} h={box.panel.height} /></div>
            <div style={{ position: "absolute", ...box.edge, background: m.colors.accent }} />
          </>
        ) : (
          <>
            <Footage m={m} />
            {m.vignette && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.5) 100%)" }} />}
            <Flashes m={m} />
            <BRollLayer m={m} />
            {(m.captions.on || m.subs2?.on) && <Captions m={m} u={u} />}
            <OverlayGraphics m={m} />
          </>
        )}
        {m.vo?.on && m.vo.url && <Audio src={m.vo.url} volume={1} />}
        <Emojis m={m} u={u} />
        <StickerLayer m={m} u={u} />
        {(!split && !shaped && m.layout !== "board") || m.layout === "dynamic" ? <Titles m={m} u={u} /> : null}
        <Logo m={m} u={u} />
        <Sfx m={m} />
        <GraphicSfx m={m} />
      </Sequence>
      {outro > 0 && <Sequence from={intro + vid} durationInFrames={outro}><Card title={m.outro.title} subtitle={m.outro.subtitle} m={m} u={u} len={outro} /></Sequence>}
      {/* music ducks under any voice: loud only for silent footage without a voice-over */}
      {m.music?.url && <MusicTrack m={m} total={intro + vid + outro} />}
      <ProgressBar m={m} u={u} frames={intro + vid + outro} />
     </BeatWrap>
      {(m.grain ?? 0) > 0 && <Grain level={m.grain!} />}
    </AbsoluteFill>
  );
}

/** Background music: trimmed (start/end of the file), placed (at), with volume + fades.
 *  Without a chosen volume it ducks under any voice: loud only for silent footage. */
function MusicTrack({ m, total }: { m: MontageSpec; total: number }) {
  const mu = m.music!;
  const from = Math.min(total - 1, Math.max(0, Math.round((mu.at ?? 0) * MFPS)));
  const trim = Math.max(0, Math.round((mu.start ?? 0) * MFPS));
  const fileLen = mu.end != null ? Math.round(mu.end * MFPS) - trim : Infinity;
  const len = Math.max(1, Math.min(total - from, fileLen));
  const base = mu.volume ?? (m.vo?.on ? 0.1 : (m.videoVolume ?? 1) < 0.5 ? 0.5 : 0.12);
  const fi = Math.round((mu.fadeIn ?? 0) * MFPS), fo = Math.round((mu.fadeOut ?? 0) * MFPS);
  const vol = (f: number) => {
    let v = base;
    if (fi > 0) v *= Math.min(1, f / fi);
    if (fo > 0) v *= Math.min(1, Math.max(0, (len - f) / fo));
    return v;
  };
  return (
    <Sequence from={from} durationInFrames={len} layout="none">
      <Audio src={mu.url} trimBefore={trim || undefined} volume={fi || fo ? vol : base} />
    </Sequence>
  );
}

/** Seconds since the last beat (Infinity before the first). */
function sinceBeat(beats: number[], t: number) {
  let lo = 0, hi = beats.length - 1, best = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (beats[mid] <= t) { best = mid; lo = mid + 1; } else hi = mid - 1; }
  return best < 0 ? Infinity : t - beats[best];
}

/** Everything moves with the music: a small zoom pulse, a flash or a shake on every beat. */
function BeatWrap({ m, u, children }: { m: MontageSpec; u: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const fx = m.beatFx ?? "none";
  if (fx === "none" || !m.beats?.length) return <>{children}</>;
  const d = sinceBeat(m.beats, frame / MFPS);
  const e = Number.isFinite(d) ? Math.exp(-d * 9) : 0;
  const style: React.CSSProperties = fx === "pulse" ? { transform: `scale(${1 + 0.045 * e})` }
    : fx === "shake" ? { transform: `translate(${Math.sin(d * 70) * 14 * u * e}px, ${Math.cos(d * 55) * 8 * u * e}px) rotate(${Math.sin(d * 40) * 0.6 * e}deg)` } : {};
  return (
    <AbsoluteFill style={style}>
      {children}
      {fx === "flash" && e > 0.01 && <AbsoluteFill style={{ background: "#fff", opacity: 0.32 * e, mixBlendMode: "screen" }} />}
    </AbsoluteFill>
  );
}

/** Film grain: animated noise (+ flicker and dust for the strong level). Drawn at half size then scaled — cheap at 4K. */
function Grain({ level }: { level: number }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const seed = Math.floor(frame / 2) % 97;
  const strong = level >= 1;
  const W = Math.round(width / 2), H = Math.round(height / 2);
  const flicker = strong ? 0.04 * Math.sin(frame * 1.7) * Math.sin(frame * 0.53) : 0;
  const dust = strong ? Array.from({ length: 3 }, (_, i) => ({ x: ((seed * 37 + i * 211) % 100) / 100, y: ((seed * 53 + i * 131) % 100) / 100, on: (seed + i * 7) % 5 === 0 })) : [];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", mixBlendMode: "overlay", opacity: strong ? 0.55 : 0.32 }}>
        <filter id={`gr${seed}`}><feTurbulence type="fractalNoise" baseFrequency={strong ? 0.9 : 1.1} numOctaves={2} seed={seed} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width={W} height={H} filter={`url(#gr${seed})`} />
      </svg>
      {strong && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(30,20,5,.45) 100%)", mixBlendMode: "multiply" }} />}
      {strong && <AbsoluteFill style={{ background: "#FFF3D6", opacity: 0.06 + flicker, mixBlendMode: "soft-light" }} />}
      {dust.filter((p) => p.on).map((p, i) => <div key={i} style={{ position: "absolute", left: `${p.x * 100}%`, top: 0, width: 2, height: "100%", background: "rgba(255,255,255,.18)" }} />)}
    </AbsoluteFill>
  );
}

/** Animated stickers drawn in code, placed by the customer (x/y = centre, 0..1). */
function StickerLayer({ m, u }: { m: MontageSpec; u: number }) {
  const frame = useCurrentFrame();
  const t = frame / MFPS;
  return (
    <>
      {(m.stickers ?? []).map((st, i) => {
        if (t < st.at || t > st.at + st.dur + 0.3) return null;
        return <StickerView key={i} st={st} f={frame - Math.round(st.at * MFPS)} len={Math.round(st.dur * MFPS)} u={u} accent={m.colors.accent} />;
      })}
    </>
  );
}

function StickerView({ st, f, len, u, accent }: { st: NonNullable<MontageSpec["stickers"]>[number]; f: number; len: number; u: number; accent: string }) {
  const { width: W, height: H, fps } = useVideoConfig();
  const S = 230 * u * (st.size ?? 1);
  const p = spring({ frame: f, fps, config: { damping: 9, mass: 0.6 } });
  const out = interpolate(f, [len, len + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const draw = interpolate(f, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const ink = accent;
  const shadow = `drop-shadow(0 ${6 * u}px ${14 * u}px rgba(0,0,0,.45))`;
  const badge = (txt: string, bg: string, burst = false) => (
    <div style={{ transform: `scale(${Math.min(1.15, p)}) rotate(${-8 + Math.sin(f / 6) * 3}deg)`, filter: shadow }}>
      {burst ? (
        <div style={{ position: "relative", width: S * 1.2, height: S * 1.2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width={S * 1.2} height={S * 1.2} viewBox="-50 -50 100 100" style={{ position: "absolute", inset: 0, transform: `rotate(${f * 1.5}deg)` }}>
            <polygon points={Array.from({ length: 32 }, (_, k) => { const r = k % 2 ? 40 : 49; const a = (k / 32) * Math.PI * 2; return `${Math.cos(a) * r},${Math.sin(a) * r}`; }).join(" ")} fill={bg} />
          </svg>
          <span style={{ position: "relative", color: "#fff", fontSize: S * 0.24, fontWeight: 900, textAlign: "center", lineHeight: 1.1, maxWidth: S }}>{txt}</span>
        </div>
      ) : <div style={{ background: bg, color: "#fff", fontSize: S * 0.24, fontWeight: 900, padding: `${S * 0.06}px ${S * 0.16}px`, borderRadius: S * 0.12, whiteSpace: "nowrap" }}>{txt}</div>}
    </div>
  );
  let el: React.ReactNode = null;
  switch (st.id) {
    case "arrow":
      el = (
        <svg width={S} height={S} viewBox="0 0 100 100" style={{ overflow: "visible", filter: shadow, transform: `translate(${Math.sin(f / 5) * 6 * u}px, ${Math.sin(f / 5) * 6 * u}px)` }}>
          <path d="M88,10 C70,20 40,30 22,78" fill="none" stroke={ink} strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          <path d="M8,62 L22,82 L42,70" fill="none" stroke={ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={draw > 0.9 ? 1 : 0} />
        </svg>
      );
      break;
    case "circle":
      el = (
        <svg width={S * 1.6} height={S} viewBox="0 0 160 100" style={{ overflow: "visible", filter: shadow }}>
          <path d="M80,8 C140,6 156,40 150,58 C140,92 30,98 12,62 C0,34 40,10 92,14" fill="none" stroke={ink} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        </svg>
      );
      break;
    case "underline":
      el = (
        <svg width={S * 1.8} height={S * 0.3} viewBox="0 0 180 30" style={{ overflow: "visible", filter: shadow }}>
          <path d="M4,18 C40,6 70,26 100,14 C130,4 150,22 176,12" fill="none" stroke={ink} strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        </svg>
      );
      break;
    case "new": el = badge(st.text || "جديد", ink, true); break;
    case "sale": el = badge(st.text || "خصم", "#E0453A", true); break;
    case "hot": el = badge(st.text || "🔥 الأكثر طلباً", "#F07C1C"); break;
    case "follow": {
      const tapped = f > 18;
      el = (
        <div style={{ display: "flex", alignItems: "center", gap: S * 0.06, transform: `scale(${Math.min(1.1, p) * (f > 15 && f < 20 ? 0.92 : 1)})`, filter: shadow }}>
          <div style={{ background: tapped ? "#2E3B4A" : ink, color: "#fff", fontSize: S * 0.2, fontWeight: 900, padding: `${S * 0.07}px ${S * 0.2}px`, borderRadius: 999, whiteSpace: "nowrap" }}>{tapped ? "✓ تمت المتابعة" : st.text || "تابعنا +"}</div>
          <span style={{ fontSize: S * 0.32, transform: `translate(${interpolate(f, [0, 15], [40, 0], { extrapolateRight: "clamp" }) * u}px, ${S * 0.12}px)`, opacity: f < 26 ? 1 : 0 }}>👆</span>
        </div>
      );
      break;
    }
    case "like": {
      const hearts = [0, 1, 2, 3].map((k) => ({ x: (k - 1.5) * 26, y: -interpolate(f - k * 4, [0, 30], [0, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), o: interpolate(f - k * 4, [0, 6, 30], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }));
      el = (
        <div style={{ position: "relative", filter: shadow }}>
          {hearts.map((h, k) => <span key={k} style={{ position: "absolute", left: "50%", top: 0, fontSize: S * 0.2, opacity: h.o, transform: `translate(${h.x * u - S * 0.1}px, ${h.y * u}px)` }}>❤️</span>)}
          <svg width={S} height={S} viewBox="0 0 24 24" style={{ transform: `scale(${Math.min(1.25, p) * (1 + 0.06 * Math.sin(f / 3))})` }}><path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z" fill="#FF3B5C" /></svg>
        </div>
      );
      break;
    }
    case "star":
      el = (
        <svg width={S} height={S} viewBox="-50 -50 100 100" style={{ overflow: "visible", filter: shadow, transform: `scale(${Math.min(1.2, p)}) rotate(${f * 2}deg)` }}>
          <polygon points={Array.from({ length: 10 }, (_, k) => { const r = k % 2 ? 20 : 46; const a = (k / 10) * Math.PI * 2 - Math.PI / 2; return `${Math.cos(a) * r},${Math.sin(a) * r}`; }).join(" ")} fill="#FFC531" stroke="#fff" strokeWidth={3} />
        </svg>
      );
      break;
    case "check":
      el = (
        <svg width={S} height={S} viewBox="0 0 100 100" style={{ filter: shadow, transform: `scale(${Math.min(1.15, p)})` }}>
          <circle cx={50} cy={50} r={44} fill="#1F9D55" />
          <path d="M28,52 L44,68 L74,36" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - interpolate(f, [6, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
        </svg>
      );
      break;
    case "click": {
      const c = (f % 24) / 24;
      el = (
        <div style={{ position: "relative", width: S, height: S, display: "flex", alignItems: "center", justifyContent: "center", filter: shadow }}>
          <div style={{ position: "absolute", width: S * (0.3 + c * 0.7), height: S * (0.3 + c * 0.7), borderRadius: "50%", border: `${5 * u}px solid ${ink}`, opacity: 1 - c }} />
          <span style={{ fontSize: S * 0.5, transform: `translate(${S * 0.12}px, ${S * 0.18 + (c < 0.2 ? 8 : 0) * u}px) scale(${c < 0.2 ? 0.9 : 1})` }}>👆</span>
        </div>
      );
      break;
    }
    case "sparkles":
      el = (
        <div style={{ position: "relative", width: S, height: S }}>
          {[[0.2, 0.3, 0], [0.7, 0.2, 5], [0.5, 0.7, 10]].map(([x, y, d], k) => <span key={k} style={{ position: "absolute", left: `${x * 100}%`, top: `${y * 100}%`, fontSize: S * 0.32, transform: `translate(-50%,-50%) scale(${0.4 + 0.8 * Math.abs(Math.sin((f + d) / 7))})` }}>✨</span>)}
        </div>
      );
      break;
  }
  return (
    <div style={{ position: "absolute", left: st.x * W, top: st.y * H, transform: "translate(-50%, -50%)", opacity: out * Math.min(1, p * 1.5), direction: "rtl" }}>{el}</div>
  );
}
