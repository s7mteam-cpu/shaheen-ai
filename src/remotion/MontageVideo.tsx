import React from "react";
import { AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { MFPS, captionLines, cutTimes, faceAt, gradeFilter, introFrames, outroFrames, videoSeconds, type MontageSpec, type Seg } from "./montage";

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
  let off = 0;
  return (
    <AbsoluteFill style={{ transform: `translateX(${shift}%) scale(${scale})`, transformOrigin: "50% 38%", filter: [gradeFilter(m), blur ? `blur(${blur}px)` : ""].filter((x) => x && x !== "none").join(" ") || "none" }}>
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
  const line = m.captions.on ? lines.find((l) => t >= l[0].s - 0.05 && t <= l[l.length - 1].e + 0.25) : undefined;
  const second = m.subs2?.on ? m.subs2.lines.find((l) => t >= l.s - 0.05 && t <= l.e + 0.25) : undefined;
  if (!line && !second) return null;
  const st = m.captions.style;
  const size = (st === "minimal" ? 52 : 70) * u;
  const appear = line ? interpolate(t, [line[0].s - 0.05, line[0].s + 0.1], [0.85, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return (
    <AbsoluteFill style={{
      alignItems: "center",
      justifyContent: m.captions.pos === "middle" ? "center" : m.captions.pos === "top" ? "flex-start" : "flex-end",
      paddingBottom: m.captions.pos === "middle" || m.captions.pos === "top" ? 0 : "22%",
      paddingTop: m.captions.pos === "top" ? "26%" : m.captions.pos === "middle" ? "18%" : 0,
    }}>
      {line && <div style={{
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
      </div>}
      {second && (
        <div dir="auto" style={{ marginTop: 14 * u, maxWidth: "86%", textAlign: "center", color: "#fff", fontSize: 42 * u, fontWeight: 600, lineHeight: 1.3, fontFamily: "Inter, Arial, sans-serif", background: "rgba(0,0,0,.5)", padding: `${8 * u}px ${18 * u}px`, borderRadius: 14 * u }}>{second.t}</div>
      )}
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
            <BRollShot url={b.url} len={len} />
          </Sequence>
        );
      })}
    </>
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

export function MontageVideo(m: MontageSpec) {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const intro = introFrames(m);
  const vid = Math.max(1, Math.round(videoSeconds(m) * MFPS));
  const outro = outroFrames(m);
  return (
    <AbsoluteFill dir="rtl" style={{ background: "#000", fontFamily: `"${m.font}", Cairo, sans-serif` }}>
      {intro > 0 && m.sfx && <Audio src={staticFile("sfx/ding.mp3")} volume={0.35} endAt={20} />}
      {intro > 0 && <Sequence durationInFrames={intro}><Card title={m.intro.title} subtitle={m.intro.subtitle} m={m} u={u} len={intro} /></Sequence>}
      <Sequence from={intro} durationInFrames={vid}>
        <Footage m={m} />
        {m.vignette && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.5) 100%)" }} />}
        {m.vo?.on && m.vo.url && <Audio src={m.vo.url} volume={1} />}
        <Flashes m={m} />
        <BRollLayer m={m} />
        {(m.captions.on || m.subs2?.on) && <Captions m={m} u={u} />}
        <Emojis m={m} u={u} />
        <Titles m={m} u={u} />
        <Logo m={m} u={u} />
        <Sfx m={m} />
      </Sequence>
      {outro > 0 && <Sequence from={intro + vid} durationInFrames={outro}><Card title={m.outro.title} subtitle={m.outro.subtitle} m={m} u={u} len={outro} /></Sequence>}
      {/* music ducks under any voice: loud only for silent footage without a voice-over */}
      {m.music?.url && <Audio src={m.music.url} volume={m.vo?.on ? 0.1 : (m.videoVolume ?? 1) < 0.5 ? 0.5 : 0.12} />}
      <ProgressBar m={m} u={u} frames={intro + vid + outro} />
    </AbsoluteFill>
  );
}
