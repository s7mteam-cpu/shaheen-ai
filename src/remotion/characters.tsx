/** Gulf cartoon characters: vector rigs with outlines and soft shading. They blink, breathe, gesture and move their mouth with the voice. */
import React from "react";

export type CharName = "man" | "woman" | "boy" | "girl" | "elder";
export type Mood = "happy" | "surprised" | "think" | "sad" | "wow";
export type Pose = "idle" | "point" | "wave";
export const CHARS: Record<CharName, { label: string }> = {
  man: { label: "رجّال بالغترة" }, woman: { label: "حرمة بالعباية" }, boy: { label: "ولد" }, girl: { label: "بنت" }, elder: { label: "جدّ بلحية" },
};
export const MOODS: Mood[] = ["happy", "surprised", "think", "sad", "wow"];
export const POSES: Pose[] = ["idle", "point", "wave"];
export const charList = () => (Object.keys(CHARS) as CharName[]).map((n) => `${n} (${CHARS[n].label})`).join("، ");

const SKIN: Record<CharName, { b: string; s: string }> = {
  man: { b: "#E9B98E", s: "#D69C70" }, woman: { b: "#F1C8A5", s: "#DDA77F" }, boy: { b: "#F3CBA6", s: "#E0AB82" }, girl: { b: "#F5D0AD", s: "#E3B089" }, elder: { b: "#DDA97C", s: "#C58F62" },
};
const LINE = "#3A2A24";
const ol = { stroke: LINE, strokeWidth: 3.2, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** How the character is rendered: cartoon (coloured) or one of the line / 3D-ish looks, chosen separately from the pictures and the background. */
export type CLook = "cartoon" | "neon" | "chalk" | "blueprint" | "shadow" | "glass" | "clay";
const NEON_OF: Record<CharName, string> = { man: "#26F0FF", woman: "#FF4FD8", boy: "#B8FF3D", girl: "#FFD23D", elder: "#FF9A3D" };

export function Character({ name, size, f, fps, open, mood = "happy", pose = "idle", flip = false, accent = "#E8B44C", look = "cartoon", ink = "#1B2A4A" }: { name: CharName; size: number; f: number; fps: number; open: number; mood?: Mood; pose?: Pose; flip?: boolean; accent?: string; look?: CLook; ink?: string }) {
  if (look === "clay") f = Math.floor(f / 3) * 3; // claymation: a new pose every 3rd frame
  const t = f / fps;
  const lineLook = look === "neon" || look === "chalk" || look === "blueprint";
  const DARK = lineLook ? "#5C5C6C" : "#1B1B23";           // dark fills must stay lighter than the outline in line looks
  const GHAIR = lineLook ? "#6E5A50" : "#3A2218", GHAIR2 = lineLook ? "#6E5A50" : "#2B1B16", SHOE = lineLook ? "#7A6A5C" : "#4B3426";
  const sk = SKIN[name];
  const kid = name === "boy" || name === "girl";
  const female = name === "woman" || name === "girl";
  const uid = `${name}${size | 0}${look}`;
  const breathe = Math.sin(t * 2.4) * 1.6;
  const talk = open > 0.05 ? open : 0;
  const speaking = talk > 0;
  const headY = -talk * 2.5 + breathe * 0.4, headR = Math.sin(t * 1.7) * 1.3 + (speaking ? Math.sin(t * 8) * 1.6 : 0);
  const bp = (t % 3.4) / 3.4, blink = bp > 0.94 ? Math.sin(((bp - 0.94) / 0.06) * Math.PI) : 0;
  const wideEye = mood === "surprised" || mood === "wow" ? 1.2 : 1;
  const eyeRy = Math.max(1, 11.5 * (1 - blink) * wideEye);
  const browLift = mood === "surprised" || mood === "wow" ? -6 : mood === "sad" ? 2 : mood === "think" ? -3 : 0;
  const browTilt = mood === "sad" ? 8 : mood === "think" ? -5 : 0;
  const eyeDX = pose === "point" ? 3.4 : mood === "think" ? 3 : 0, eyeDY = mood === "think" ? -2.5 : mood === "sad" ? 2 : 0;
  const smile = mood === "sad" ? -6 : mood === "wow" ? 10 : mood === "think" ? 1 : 8;
  const mouthOpen = Math.max(talk * 0.58, mood === "wow" ? 0.4 : 0);
  const my = 119, mw = 9 + mouthOpen * 3;
  const mouth = mouthOpen > 0.08
    ? <g>
        <path d={`M${100 - mw} ${my} Q100 ${my - 3} ${100 + mw} ${my} Q${100 + mw * 0.8} ${my + 4 + mouthOpen * 15} 100 ${my + 5 + mouthOpen * 15} Q${100 - mw * 0.8} ${my + 4 + mouthOpen * 15} ${100 - mw} ${my} Z`} fill="#7A2323" {...ol} strokeWidth={2.6} />
        <path d={`M${100 - mw * 0.7} ${my + 1} Q100 ${my - 1} ${100 + mw * 0.7} ${my + 1} L${100 + mw * 0.6} ${my + 4} Q100 ${my + 2.5} ${100 - mw * 0.6} ${my + 4} Z`} fill="#fff" opacity={mouthOpen > 0.18 ? 1 : 0} />
        <ellipse cx={100} cy={my + 3 + mouthOpen * 12} rx={mw * 0.5} ry={1.5 + mouthOpen * 3.5} fill="#E36F6A" opacity={mouthOpen > 0.3 ? 1 : 0} />
      </g>
    : <path d={`M${100 - mw} ${my} Q100 ${my + smile} ${100 + mw} ${my}`} fill="none" {...ol} strokeWidth={3} />;

  // arms
  const ang = pose === "wave" ? -55 + Math.sin(t * 7) * 18 : pose === "point" ? 14 + Math.sin(t * 3) * 3 : 80 + Math.sin(t * 2.4) * 2 - (speaking ? 14 + Math.sin(t * 4.5) * 16 : 0);
  const angL = 100 + Math.sin(t * 2.1) * 2 + (speaking ? -(10 + Math.sin(t * 3.7 + 1) * 20) : 0);
  const sh = { x: kid ? 138 : 150, y: kid ? 172 : 162 }, shL = { x: kid ? 62 : 50, y: sh.y }, L = kid ? 66 : 80;
  const hand = { x: sh.x + Math.cos((ang * Math.PI) / 180) * L, y: sh.y + Math.sin((ang * Math.PI) / 180) * L };
  const handL = { x: shL.x + Math.cos((angL * Math.PI) / 180) * L, y: shL.y + Math.sin((angL * Math.PI) / 180) * L };
  const sway = Math.sin(t * 2.2) * 1.1 + (speaking ? Math.sin(t * 6) * 0.9 : 0);
  const enter = Math.min(1, f / 10), bounce = (1 - enter) * -26 + (enter >= 1 ? Math.max(0, Math.sin(Math.min(1, (f - 10) / 8) * Math.PI)) * -5 : 0);

  const cloth = name === "woman" ? (lineLook ? { b: "#5E5E6E", s: "#50505F", l: "#9A9AAC" } : { b: "#25252E", s: "#14141A", l: "#0E0E13" }) : name === "girl" ? { b: "#F59BBA", s: "#E07CA0", l: "#B24F76" } : { b: "#FFFFFF", s: "#E3E8F0", l: "#9AA6B8" };
  const sw = kid ? 21 : 25;
  const arm = (a: { x: number; y: number }, h: { x: number; y: number }) => (
    <g>
      <path d={`M${a.x} ${a.y} L${h.x} ${h.y}`} stroke={LINE} strokeWidth={sw + 6.4} strokeLinecap="round" />
      <path d={`M${a.x} ${a.y} L${h.x} ${h.y}`} stroke={cloth.b} strokeWidth={sw} strokeLinecap="round" />
      <circle cx={h.x} cy={h.y} r={kid ? 11 : 12.5} fill={sk.b} {...ol} />
      <path d={`M${h.x - 3} ${h.y - 7} q4 -4 8 0`} stroke={sk.s} strokeWidth={2} fill="none" strokeLinecap="round" />
    </g>
  );

  const face = "M56 86 C56 54 76 40 100 40 C124 40 144 54 144 86 C144 114 126 138 100 138 C74 138 56 114 56 86 Z";
  const bodyShape = kid ? "M48 264 C46 212 56 176 82 166 L118 166 C144 176 154 212 152 264 Z" : "M36 264 C34 206 46 166 78 156 L122 156 C154 166 166 206 164 264 Z";
  const head = (
    <g transform={`translate(0 ${headY + 11}) rotate(${headR} 100 140)`}>
      {name === "woman" && <path d="M50 96 C42 44 74 18 100 18 C126 18 158 44 150 96 C150 128 138 146 122 150 L78 150 C62 146 50 128 50 96 Z" fill={DARK} {...ol} />}
      {name === "girl" && <path d="M52 92 C44 46 76 24 100 24 C124 24 156 46 148 92 L152 134 C146 140 136 138 130 130 L70 130 C64 138 54 140 48 134 Z" fill={GHAIR} {...ol} />}
      {name !== "woman" && <rect x={89} y={122} width={22} height={22} rx={8} fill={sk.s} {...ol} />}
      {name === "woman" && <path d="M52 120 C52 146 60 158 76 164 L124 164 C140 158 148 146 148 120 C138 136 122 142 100 142 C78 142 62 136 52 120 Z" fill={DARK} {...ol} />}
      <circle cx={57} cy={94} r={8} fill={sk.b} {...ol} /><circle cx={143} cy={94} r={8} fill={sk.b} {...ol} />
      <path d={face} fill={`url(#sk${uid})`} {...ol} />
      <ellipse cx={74} cy={112} rx={9} ry={6} fill="#F07F72" opacity={0.32} /><ellipse cx={126} cy={112} rx={9} ry={6} fill="#F07F72" opacity={0.32} />
      {[84, 116].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={92} rx={11} ry={eyeRy} fill="#fff" {...ol} strokeWidth={2.6} />
          <circle cx={x + eyeDX} cy={92 + eyeDY} r={Math.min(6.6, eyeRy * 0.62)} fill={name === "elder" ? "#4A3526" : "#3B2519"} />
          <circle cx={x + eyeDX} cy={92 + eyeDY} r={Math.min(3, eyeRy * 0.3)} fill="#0C0705" />
          <circle cx={x + eyeDX + 2.4} cy={92 + eyeDY - 2.6} r={Math.min(2.3, eyeRy * 0.22)} fill="#fff" opacity={eyeRy > 3 ? 1 : 0} />
          {female && <path d={`M${x - 11} ${92 - eyeRy * 0.7} q11 -${6 + 3 * (1 - blink)} 22 0`} stroke={LINE} strokeWidth={3.4} fill="none" strokeLinecap="round" />}
          <path d={`M${x - 11} ${70 + browLift + (x < 100 ? browTilt * 0.55 : -browTilt * 0.55)} Q${x} ${64 + browLift} ${x + 11} ${70 + browLift + (x < 100 ? -browTilt * 0.55 : browTilt * 0.55)}`} stroke={name === "elder" ? "#D8D8D8" : "#33221A"} strokeWidth={female ? 3.4 : 4.6} strokeLinecap="round" fill="none" />
        </g>
      ))}
      <path d="M100 98 Q94 110 101 112" stroke={sk.s} strokeWidth={3} fill="none" strokeLinecap="round" />
      {(name === "man" || name === "elder") && <path d="M80 114 Q90 105 100 111 Q110 105 120 114 Q110 118 100 115 Q90 118 80 114 Z" fill={name === "elder" ? "#F0F0F0" : "#2E1F18"} {...ol} strokeWidth={2} />}
      {name === "elder" && <path d="M58 104 C58 146 80 160 100 160 C120 160 142 146 142 104 C136 128 124 134 100 134 C76 134 64 128 58 104 Z" fill="#F4F4F4" {...ol} strokeWidth={2.4} />}
      {name === "man" && <path d="M64 108 C66 126 78 134 100 134 C122 134 134 126 136 108 C132 122 122 128 100 128 C78 128 68 122 64 108 Z" fill="#3A2A22" opacity={0.85} />}
      {mouth}
      {name === "elder" && <g fill="none" stroke={LINE} strokeWidth={3}><circle cx={84} cy={92} r={14} /><circle cx={116} cy={92} r={14} /><path d="M98 91 H102" /></g>}
      {(name === "man" || name === "elder") && <g>
        <path d="M54 88 C48 40 76 20 100 20 C124 20 152 40 146 88 C138 64 122 54 100 54 C78 54 62 64 54 88 Z" fill="#fff" {...ol} />
        <path d="M54 86 C42 108 42 132 50 148 L68 136 C62 118 62 102 68 86 Z M146 86 C158 108 158 132 150 148 L132 136 C138 118 138 102 132 86 Z" fill="#fff" {...ol} />
        <path d="M70 66 C86 60 114 60 130 66 M58 100 C56 112 58 124 62 134 M142 100 C144 112 142 124 138 134" stroke="#CBD3DF" strokeWidth={2} fill="none" strokeLinecap="round" />
        <path d="M58 58 C80 44 120 44 142 58" stroke="#262626" strokeWidth={8} strokeLinecap="round" fill="none" />
        <path d="M58 58 C80 44 120 44 142 58" stroke="#fff" strokeWidth={1.4} strokeDasharray="1 7" fill="none" opacity={0.5} />
      </g>}
      {name === "boy" && <g>
        <path d="M58 78 C54 36 80 22 100 22 C120 22 146 36 142 78 C132 62 120 56 100 56 C80 56 68 62 58 78 Z" fill="#fff" {...ol} />
        <path d="M60 62 H140" stroke={accent} strokeWidth={5} /><path d="M66 48 H134" stroke={accent} strokeWidth={3} opacity={0.75} />
        <path d="M62 82 C58 70 64 64 72 62 M138 82 C142 70 136 64 128 62" stroke="#3A2218" strokeWidth={9} fill="none" strokeLinecap="round" />
      </g>}
      {name === "woman" && <g>
        <path d="M52 98 C48 56 72 40 100 40 C128 40 152 56 148 98 C146 74 128 62 100 62 C72 62 54 74 52 98 Z" fill={DARK} {...ol} />
        <path d="M70 52 C86 46 114 46 130 52" stroke="#3C3C48" strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>}
      {name === "girl" && <g>
        <path d="M54 92 C48 52 76 34 100 34 C124 34 152 52 146 92 C138 70 124 62 100 62 C76 62 62 70 54 92 Z" fill="#3A2218" {...ol} />
        <path d="M126 38 L150 24 L148 52 Z M126 38 L102 26 L108 52 Z" fill="#F46FA0" {...ol} strokeWidth={2.6} /><circle cx={126} cy={38} r={7} fill="#D9487F" {...ol} strokeWidth={2.4} />
        <path d="M70 52 C82 44 96 42 108 44" stroke="#6A4030" strokeWidth={3} fill="none" strokeLinecap="round" />
      </g>}
    </g>
  );

  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 200 270" style={{ overflow: "visible", transform: flip ? "scaleX(-1)" : undefined, filter: look === "glass" ? "drop-shadow(0 8px 14px rgba(90,170,255,.35))" : undefined }}>
      <defs>
        {look !== "cartoon" && look !== "shadow" && look !== "glass" && look !== "clay" && (() => {
          const hx = look === "neon" ? NEON_OF[name] : look === "chalk" ? "#F5F1E6" : "#DCEBFF";
          const r = parseInt(hx.slice(1, 3), 16) / 255, g = parseInt(hx.slice(3, 5), 16) / 255, b = parseInt(hx.slice(5, 7), 16) / 255;
          return (
            <filter id={`lk${uid}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
              <feColorMatrix in="SourceGraphic" type="matrix" values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${-14 * 0.2126} ${-14 * 0.7152} ${-14 * 0.0722} 0 ${14 * 0.36}`} result="m" />
              <feComposite in="m" in2="SourceAlpha" operator="in" result="lines" />
              {look === "chalk" && <><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves={2} seed={Math.floor(f / 5) % 4} result="n" /><feDisplacementMap in="lines" in2="n" scale={4} /></>}
              {look === "neon" && <><feGaussianBlur in="lines" stdDeviation="2.5" result="b1" /><feGaussianBlur in="lines" stdDeviation="9" result="b2" /><feMerge><feMergeNode in="b2" /><feMergeNode in="b1" /><feMergeNode in="lines" /></feMerge></>}
            </filter>
          );
        })()}
        {look === "shadow" && <filter id={`lk${uid}`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.09 0 0 0 0 0.13 0 0 0 0 0.22 0 0 0 1 0" /></filter>}
        {look === "glass" && <filter id={`lk${uid}`} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values={`0 0 0 0 0.82 0 0 0 0 0.94 0 0 0 0 1 ${-2.4 * 0.2126} ${-2.4 * 0.7152} ${-2.4 * 0.0722} 0 1.0`} result="m" /><feComposite in="m" in2="SourceAlpha" operator="in" result="g" /><feGaussianBlur in="g" stdDeviation="1.1" result="gb" /><feMerge><feMergeNode in="gb" /><feMergeNode in="g" /></feMerge></filter>}
        {look === "clay" && <filter id={`lk${uid}`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} seed={3} result="t" /><feDiffuseLighting in="t" lightingColor="#ffffff" surfaceScale="1.8" diffuseConstant="1.05" result="l"><feDistantLight azimuth="235" elevation="58" /></feDiffuseLighting><feComposite in="SourceGraphic" in2="l" operator="arithmetic" k1="1.18" k2="0" k3="0" k4="0" result="c" /><feComposite in="c" in2="SourceAlpha" operator="in" /></filter>}
        <radialGradient id={`sk${uid}`} cx="0.42" cy="0.38" r="0.75"><stop offset="0" stopColor={sk.b} /><stop offset="0.7" stopColor={sk.b} /><stop offset="1" stopColor={sk.s} /></radialGradient>
        <linearGradient id={`cl${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={cloth.s} /><stop offset="0.35" stopColor={cloth.b} /><stop offset="1" stopColor={cloth.s} /></linearGradient>
      </defs>
      <ellipse cx={100} cy={266} rx={74} ry={7} fill="#000" opacity={0.13} />
      <g filter={look === "cartoon" ? undefined : `url(#lk${uid})`} transform={`translate(0 ${breathe * 0.35 + bounce}) rotate(${sway} 100 264)`}>
        {arm(shL, handL)}
        <path d={bodyShape} fill={`url(#cl${uid})`} {...ol} />
        {name === "woman" && <g><path d="M86 158 Q100 184 114 158" fill="none" stroke={accent} strokeWidth={3.4} strokeLinecap="round" /><path d="M100 184 V262" stroke="#3A3A48" strokeWidth={2} /></g>}
        {(name === "man" || name === "elder" || name === "boy") && <g>
          <path d="M90 156 L100 178 L110 156" fill="#fff" {...ol} strokeWidth={2.4} />
          <path d="M100 178 V262" stroke={cloth.l} strokeWidth={1.8} opacity={0.55} />
          {[190, 210, 230].map((y) => <circle key={y} cx={100} cy={y} r={2.6} fill={cloth.l} />)}
          {!kid && <path d="M120 196 h18 v13 h-18 z" fill="#fff" stroke={cloth.l} strokeWidth={1.8} />}
        </g>}
        {name === "girl" && <g><path d="M60 236 Q100 250 140 236" stroke="#fff" strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray="2 9" /><path d="M86 168 Q100 180 114 168" fill="#fff" {...ol} strokeWidth={2.4} /></g>}
        <ellipse cx={78} cy={266} rx={17} ry={7} fill={SHOE} {...ol} strokeWidth={2.4} /><ellipse cx={122} cy={266} rx={17} ry={7} fill={SHOE} {...ol} strokeWidth={2.4} />
        {head}
        {arm(sh, hand)}
        {pose === "point" && <path d={`M${hand.x + Math.cos((ang * Math.PI) / 180) * 6} ${hand.y + Math.sin((ang * Math.PI) / 180) * 6} l${Math.cos((ang * Math.PI) / 180) * 17} ${Math.sin((ang * Math.PI) / 180) * 17}`} stroke={LINE} strokeWidth={10.4} strokeLinecap="round" />}
        {pose === "point" && <path d={`M${hand.x + Math.cos((ang * Math.PI) / 180) * 6} ${hand.y + Math.sin((ang * Math.PI) / 180) * 6} l${Math.cos((ang * Math.PI) / 180) * 17} ${Math.sin((ang * Math.PI) / 180) * 17}`} stroke={sk.b} strokeWidth={5} strokeLinecap="round" />}
      </g>
    </svg>
  );
}
