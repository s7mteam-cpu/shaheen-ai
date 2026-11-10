import React from "react";
import { AbsoluteFill, Audio, Easing, OffthreadVideo, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MFPS, captionLines, introFrames, outroFrames, videoSeconds, type MontageSpec } from "./montage";

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
  let off = 0;
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: "50% 38%" }}>
      {m.segments.map((g, i) => {
        const from = Math.round(off * MFPS);
        const len = Math.max(1, Math.round((g.e - g.s) * MFPS));
        off += g.e - g.s;
        return (
          <Sequence key={i} from={from} durationInFrames={len} layout="none">
            <AbsoluteFill>
              <OffthreadVideo src={m.src} trimBefore={Math.round(g.s * MFPS)} trimAfter={Math.round(g.e * MFPS) + 1} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </AbsoluteFill>
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
  const line = lines.find((l) => t >= l[0].s - 0.05 && t <= l[l.length - 1].e + 0.25);
  if (!line) return null;
  const st = m.captions.style;
  const size = (st === "minimal" ? 52 : 70) * u;
  const appear = interpolate(t, [line[0].s - 0.05, line[0].s + 0.1], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{
      alignItems: "center",
      justifyContent: m.captions.pos === "middle" ? "center" : m.captions.pos === "top" ? "flex-start" : "flex-end",
      paddingBottom: m.captions.pos === "middle" || m.captions.pos === "top" ? 0 : "22%",
      paddingTop: m.captions.pos === "top" ? "26%" : m.captions.pos === "middle" ? "18%" : 0,
    }}>
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.3em", maxWidth: "86%", textAlign: "center",
        fontSize: size, fontWeight: 800, lineHeight: 1.35, transform: `scale(${appear})`,
        ...(st === "box" ? { background: "rgba(0,0,0,.62)", padding: `${14 * u}px ${28 * u}px`, borderRadius: 22 * u } : {}),
      }}>
        {line.map((w, i) => {
          const active = t >= w.s && t <= w.e + 0.05;
          const said = t > w.e;
          const color = st === "minimal" ? "#fff" : active ? m.colors.accent : said || st === "box" ? "#fff" : "rgba(255,255,255,.9)";
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
      </div>
    </AbsoluteFill>
  );
}

function Titles({ m, u }: { m: MontageSpec; u: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / MFPS;
  return (
    <>
      {m.titles.map((ti, i) => {
        if (t < ti.at - 0.1 || t > ti.at + ti.dur + 0.4) return null;
        const p = spring({ frame: frame - Math.round(ti.at * MFPS), fps, config: { damping: 14, mass: 0.7 } });
        const out = interpolate(t, [ti.at + ti.dur, ti.at + ti.dur + 0.35], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <AbsoluteFill key={i} style={{ alignItems: "center", justifyContent: ti.pos === "center" ? "center" : "flex-start", paddingTop: ti.pos === "center" ? 0 : "13%" }}>
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

export function MontageVideo(m: MontageSpec) {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const intro = introFrames(m);
  const vid = Math.max(1, Math.round(videoSeconds(m) * MFPS));
  const outro = outroFrames(m);
  return (
    <AbsoluteFill dir="rtl" style={{ background: "#000", fontFamily: `"${m.font}", Cairo, sans-serif` }}>
      {intro > 0 && <Sequence durationInFrames={intro}><Card title={m.intro.title} subtitle={m.intro.subtitle} m={m} u={u} len={intro} /></Sequence>}
      <Sequence from={intro} durationInFrames={vid}>
        <Footage m={m} />
        {m.captions.on && <Captions m={m} u={u} />}
        <Titles m={m} u={u} />
      </Sequence>
      {outro > 0 && <Sequence from={intro + vid} durationInFrames={outro}><Card title={m.outro.title} subtitle={m.outro.subtitle} m={m} u={u} len={outro} /></Sequence>}
      {m.music?.url && <Audio src={m.music.url} volume={0.12} />}
    </AbsoluteFill>
  );
}
