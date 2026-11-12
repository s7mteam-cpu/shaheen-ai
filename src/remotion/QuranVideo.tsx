import React from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { QFPS, SURAHS, arNum, qIntro, type QAyah, type QuranSpec } from "./quran";

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** «فيديو قرآني»: background + one ayah at a time with its recitation. No music, no sound effects. */
export function QuranVideo(s: QuranSpec) {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const intro = Math.round(qIntro * QFPS);
  let at = intro;
  const parts = s.ayahs.map((a) => { const from = at; const len = Math.max(QFPS, Math.round((a.dur + s.gap) * QFPS)); at += len; return { a, from, len }; });
  return (
    <AbsoluteFill dir="rtl" style={{ background: "#06121F", fontFamily: `"${s.font}", "Amiri Quran", Amiri, serif` }}>
      <Background s={s} />
      <AbsoluteFill style={{ background: `rgba(0,0,0,${s.dim})` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,.55) 100%)" }} />
      {s.style === "frame" && <Ornament s={s} u={u} />}
      <Header s={s} u={u} intro={intro} />
      {parts.map(({ a, from, len }) => (
        <Sequence key={`${a.n}-${from}`} from={from} durationInFrames={len}>
          <AyahView s={s} a={a} len={len} u={u} />
          {a.audio && <Audio src={a.audio} />}
        </Sequence>
      ))}
      {s.showReciter && s.reciterName && <Footer s={s} u={u} />}
    </AbsoluteFill>
  );
}

function Background({ s }: { s: QuranSpec }) {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (s.bg?.url && s.bg.kind === "video") return <Video src={s.bg.url} muted loop style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
  if (s.bg?.url) return <Img src={s.bg.url} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${interpolate(f, [0, durationInFrames], [1.04, 1.16])})` }} />;
  // no picture: slow moving night-sky gradient
  const k = f / durationInFrames;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at ${30 + 40 * k}% ${35 + 10 * Math.sin(k * 6)}%, #1B4C7E 0%, #0B2A4A 40%, #050D18 100%)` }}>
      {Array.from({ length: 60 }, (_, i) => {
        const x = (i * 97) % 100, y = (i * 53) % 100, tw = 0.35 + 0.65 * Math.abs(Math.sin(f / 25 + i));
        return <div key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 3, height: 3, borderRadius: 9, background: "#fff", opacity: tw * 0.7 }} />;
      })}
    </AbsoluteFill>
  );
}

function Header({ s, u, intro }: { s: QuranSpec; u: number; intro: number }) {
  const f = useCurrentFrame();
  const { height } = useVideoConfig();
  if (!s.showSurah) return null;
  const name = SURAHS[s.surah - 1]?.[0] ?? "";
  // big in the middle during the intro, then settles on top
  const k = interpolate(f, [intro - 12, intro + 6], [0, 1], { ...cl, easing: ease });
  const appear = interpolate(f, [0, 14], [0, 1], cl);
  const top = interpolate(k, [0, 1], [height / 2 - 80 * u, 110 * u]);
  const size = interpolate(k, [0, 1], [96, 46]) * u;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: appear }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 * u, color: s.accent, fontSize: size, fontFamily: "Amiri, serif", fontWeight: 700, textShadow: "0 3px 14px rgba(0,0,0,.6)" }}>
        <Star u={u * (size / (46 * u))} color={s.accent} />
        <span>سورة {name}</span>
        <Star u={u * (size / (46 * u))} color={s.accent} />
      </div>
    </div>
  );
}

const Star = ({ u, color }: { u: number; color: string }) => (
  <svg width={34 * u} height={34 * u} viewBox="-50 -50 100 100" aria-hidden>
    <polygon points={Array.from({ length: 16 }, (_, i) => { const r = i % 2 ? 22 : 48; const a = (i / 16) * Math.PI * 2; return `${Math.cos(a) * r},${Math.sin(a) * r}`; }).join(" ")} fill="none" stroke={color} strokeWidth={7} />
  </svg>
);

function AyahView({ s, a, len, u }: { s: QuranSpec; a: QAyah; len: number; u: number }) {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const inn = interpolate(f, [0, 14], [0, 1], { ...cl, easing: ease });
  const out = interpolate(f, [len - 12, len - 2], [1, 0], cl);
  const o = Math.min(inn, out);
  const n = a.text.length;
  // longer ayat get a smaller size so they always fit
  const base = s.style === "minimal" ? 0.8 : 1;
  const size = (tall ? (n < 40 ? 84 : n < 90 ? 72 : n < 160 ? 60 : n < 260 ? 50 : 42) : (n < 60 ? 70 : n < 140 ? 58 : n < 260 ? 48 : 40)) * u * base;
  const boxW = width * (tall ? 0.86 : 0.78);
  const glass = s.style === "glass";
  const minimal = s.style === "minimal";
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: minimal ? "flex-end" : "center", paddingBottom: minimal ? height * 0.24 : 0 }}>
      <div style={{
        width: boxW, display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * u, opacity: o,
        transform: `translateY(${(1 - inn) * 24 * u}px)`, filter: `blur(${(1 - inn) * 6}px)`,
        ...(glass ? { background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.22)", borderRadius: 36 * u, padding: `${44 * u}px ${40 * u}px`, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } : {}),
      }}>
        <p style={{ margin: 0, textAlign: "center", color: s.textColor, fontSize: size, lineHeight: 1.95, textShadow: "0 3px 18px rgba(0,0,0,.65)", direction: "rtl" }}>
          {a.text}
          {s.showNumbers && a.n > 0 && <span style={{ color: s.accent, fontSize: size * 0.8, marginInlineStart: 12 * u, whiteSpace: "nowrap" }}>﴿{arNum(a.n)}﴾</span>}
        </p>
        {s.showTranslation && a.en && (
          <p dir="ltr" style={{ margin: 0, textAlign: "center", color: "rgba(255,255,255,.88)", fontFamily: "Cairo, sans-serif", fontSize: Math.max(24, size * 0.36), lineHeight: 1.5, textShadow: "0 2px 10px rgba(0,0,0,.7)" }}>{a.en}</p>
        )}
      </div>
    </AbsoluteFill>
  );
}

function Footer({ s, u }: { s: QuranSpec; u: number }) {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 90 * u, display: "flex", justifyContent: "center", opacity: interpolate(f, [10, 30], [0, 0.9], cl) }}>
      <span style={{ padding: `${10 * u}px ${28 * u}px`, borderRadius: 999, background: "rgba(0,0,0,.35)", border: `1px solid ${s.accent}66`, color: "#fff", fontFamily: "Cairo, sans-serif", fontSize: 30 * u, fontWeight: 600 }}>
        بصوت القارئ {s.reciterName}
      </span>
    </div>
  );
}

/** «إطار مزخرف»: thin double golden frame with corner ornaments. */
function Ornament({ s, u }: { s: QuranSpec; u: number }) {
  const { width: W, height: H } = useVideoConfig();
  const m = 42 * u, c = s.accent;
  const corner = (x: number, y: number, r: number) => (
    <g transform={`translate(${x},${y}) rotate(${r})`}>
      <path d={`M0,0 L${70 * u},0 M0,0 L0,${70 * u}`} stroke={c} strokeWidth={4 * u} />
      <circle cx={18 * u} cy={18 * u} r={9 * u} fill="none" stroke={c} strokeWidth={3 * u} />
      <path d={`M${30 * u},${8 * u} q${14 * u},${10 * u} ${28 * u},0 M${8 * u},${30 * u} q${10 * u},${14 * u} 0,${28 * u}`} fill="none" stroke={c} strokeWidth={3 * u} />
    </g>
  );
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} fill="none" stroke={c} strokeOpacity={0.85} strokeWidth={3 * u} rx={14 * u} />
      <rect x={m + 12 * u} y={m + 12 * u} width={W - 2 * m - 24 * u} height={H - 2 * m - 24 * u} fill="none" stroke={c} strokeOpacity={0.45} strokeWidth={2 * u} rx={10 * u} />
      {corner(m + 6 * u, m + 6 * u, 0)}{corner(W - m - 6 * u, m + 6 * u, 90)}{corner(W - m - 6 * u, H - m - 6 * u, 180)}{corner(m + 6 * u, H - m - 6 * u, 270)}
    </svg>
  );
}
