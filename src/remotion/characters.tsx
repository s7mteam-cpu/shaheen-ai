/** Gulf cartoon characters: flat vector rigs that blink, breathe, gesture and move their mouth with the voice. */
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

const SKIN: Record<CharName, string> = { man: "#E6B88F", woman: "#EDC39F", boy: "#F0C8A2", girl: "#F2CDA8", elder: "#D8A57B" };
const INK = "#2A2320";

/** open: 0 (closed) .. 1 (wide) · t: seconds on the clock (for idle motion) · blink 0..1 (1 = closed) */
export function Character({ name, size, f, fps, open, mood = "happy", pose = "idle", flip = false, accent = "#E8B44C" }: { name: CharName; size: number; f: number; fps: number; open: number; mood?: Mood; pose?: Pose; flip?: boolean; accent?: string }) {
  const t = f / fps;
  const skin = SKIN[name];
  const kid = name === "boy" || name === "girl";
  const breathe = Math.sin(t * 2.4) * 1.6;
  const talk = open > 0.05 ? open : 0;
  const headY = -talk * 2.2 + breathe * 0.4, headR = Math.sin(t * 1.7) * 1.2 + (talk ? Math.sin(t * 9) * 1.1 : 0);
  // blink: a quick close every ~3.2s
  const bp = (t % 3.2) / 3.2, blink = bp > 0.94 ? Math.sin(((bp - 0.94) / 0.06) * Math.PI) : 0;
  const eyeRy = Math.max(0.6, 6 * (1 - blink) * (mood === "surprised" || mood === "wow" ? 1.25 : 1));
  const browLift = mood === "surprised" || mood === "wow" ? -5 : mood === "sad" ? 3 : mood === "think" ? -2 : 0;
  const browTilt = mood === "sad" ? 8 : mood === "think" ? -4 : 0;
  // mouth: smile curve when closed, open ellipse when talking
  const smile = mood === "sad" ? -5 : mood === "wow" ? 9 : mood === "think" ? 1 : 6;
  const mouthOpen = Math.max(talk, mood === "wow" ? 0.5 : 0);
  const my = 115, mw = 10 + mouthOpen * 3;
  const mouth = mouthOpen > 0.08
    ? <g><ellipse cx={100} cy={my + mouthOpen * 4} rx={mw} ry={2 + mouthOpen * 11} fill="#6B1E1E" /><ellipse cx={100} cy={my + mouthOpen * 9} rx={mw * 0.6} ry={mouthOpen * 4} fill="#D9645F" opacity={mouthOpen > 0.45 ? 1 : 0} /><path d={`M${100 - mw} ${my + mouthOpen * 4 - 1} Q100 ${my + mouthOpen * 4 - 4} ${100 + mw} ${my + mouthOpen * 4 - 1}`} stroke="#fff" strokeWidth={3} fill="none" opacity={0.9} /></g>
    : <path d={`M${100 - mw} ${my} Q100 ${my + smile} ${100 + mw} ${my}`} stroke="#6B1E1E" strokeWidth={3.2} strokeLinecap="round" fill="none" />;
  // arms: both gesture while talking; the right one can point or wave
  const speaking = talk > 0;
  const ang = pose === "wave" ? -55 + Math.sin(t * 7) * 18 : pose === "point" ? 14 + Math.sin(t * 3) * 3 : 80 + Math.sin(t * 2.4) * 2 - (speaking ? 14 + Math.sin(t * 4.5) * 16 : 0);
  const angL = 100 + Math.sin(t * 2.1) * 2 + (speaking ? -(10 + Math.sin(t * 3.7 + 1) * 20) : 0);
  const sh = { x: kid ? 140 : 152, y: kid ? 168 : 156 }, shL = { x: kid ? 60 : 48, y: sh.y }, L = kid ? 70 : 84;
  const hand = { x: sh.x + Math.cos((ang * Math.PI) / 180) * L, y: sh.y + Math.sin((ang * Math.PI) / 180) * L };
  const handL = { x: shL.x + Math.cos((angL * Math.PI) / 180) * L, y: shL.y + Math.sin((angL * Math.PI) / 180) * L };
  const sway = Math.sin(t * 2.2) * 1.1 + (speaking ? Math.sin(t * 6) * 0.9 : 0);
  const enter = Math.min(1, f / 10), bounce = (1 - enter) * -26 + (enter >= 1 ? Math.max(0, Math.sin(Math.min(1, (f - 10) / 8) * Math.PI)) * -5 : 0);
  const sleeve = name === "woman" ? "#1B1B22" : name === "girl" ? "#F29BB8" : "#FFFFFF";
  const sleeveLine = name === "woman" ? "#3A3A46" : "#D5DBE4";
  const bodyFill = sleeve, bodyLine = sleeveLine;
  const eyeDX = pose === "point" ? 3.5 : mood === "think" ? 3 : 0, eyeDY = mood === "think" ? -2 : 0;

  const head = (
    <g transform={`translate(0 ${headY}) rotate(${headR} 100 120)`}>
      {/* back hair / scarf */}
      {name === "woman" && <path d="M56 92 C50 40 78 20 100 20 C122 20 150 40 144 92 C144 124 132 140 118 144 L82 144 C68 140 56 124 56 92 Z" fill="#17171D" />}
      {name === "girl" && <path d="M58 90 C52 44 78 26 100 26 C122 26 148 44 142 90 L144 124 L128 116 L72 116 L56 124 Z" fill="#2B1B16" />}
      <rect x={88} y={112} width={24} height={30} rx={8} fill={skin} />
      <ellipse cx={100} cy={86} rx={kid ? 38 : 34} ry={kid ? 40 : 38} fill={skin} />
      <circle cx={kid ? 62 : 66} cy={90} r={6} fill={skin} /><circle cx={kid ? 138 : 134} cy={90} r={6} fill={skin} />
      {/* cheeks */}
      <circle cx={80} cy={104} r={6} fill="#F08A7A" opacity={0.28} /><circle cx={120} cy={104} r={6} fill="#F08A7A" opacity={0.28} />
      {/* eyes */}
      {[86, 114].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={88} rx={7.5} ry={eyeRy} fill="#fff" stroke={INK} strokeWidth={1.2} />
          <circle cx={x + eyeDX} cy={88 + eyeDY} r={Math.min(3.6, eyeRy * 0.7)} fill={INK} />
          <path d={`M${x - 9} ${74 + browLift + (x < 100 ? browTilt * 0.5 : -browTilt * 0.5)} Q${x} ${70 + browLift} ${x + 9} ${74 + browLift + (x < 100 ? -browTilt * 0.5 : browTilt * 0.5)}`} stroke={name === "elder" ? "#CFCFCF" : "#2A1D17"} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        </g>
      ))}
      <path d="M100 92 Q95 102 101 104" stroke="#B98760" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      {(name === "man" || name === "elder") && <path d="M82 108 Q91 101 100 106 Q109 101 118 108 Q109 111 100 109 Q91 111 82 108 Z" fill={name === "elder" ? "#E8E8E8" : "#2A1D17"} />}
      {name === "elder" && <path d="M66 100 C66 140 84 150 100 150 C116 150 134 140 134 100 C128 120 118 126 100 126 C82 126 72 120 66 100 Z" fill="#EDEDED" />}
      {mouth}
      {name === "elder" && <g fill="none" stroke={INK} strokeWidth={2.4}><circle cx={86} cy={88} r={11} /><circle cx={114} cy={88} r={11} /><path d="M97 88 H103" /></g>}
      {/* headwear / hair front */}
      {(name === "man" || name === "elder") && <g>
        <path d="M62 82 C58 40 80 22 100 22 C120 22 142 40 138 82 C130 62 118 52 100 52 C82 52 70 62 62 82 Z" fill="#fff" stroke="#D5DBE4" strokeWidth={1.5} />
        <path d="M62 80 C52 98 52 118 58 134 L72 124 C68 108 68 94 72 82 Z M138 80 C148 98 148 118 142 134 L128 124 C132 108 132 94 128 82 Z" fill="#fff" stroke="#D5DBE4" strokeWidth={1.5} />
        <path d="M64 54 C82 42 118 42 136 54" stroke="#222" strokeWidth={6} strokeLinecap="round" fill="none" />
      </g>}
      {name === "boy" && <g>
        <path d="M64 70 C62 36 84 24 100 24 C116 24 138 36 136 70 C128 58 118 54 100 54 C82 54 72 58 64 70 Z" fill="#fff" stroke="#D5DBE4" strokeWidth={1.5} />
        <path d="M66 62 H134" stroke={accent} strokeWidth={4} /><path d="M70 50 H130" stroke={accent} strokeWidth={2.5} opacity={0.7} />
      </g>}
      {name === "woman" && <path d="M62 90 C60 58 76 44 100 44 C124 44 140 58 138 90 C136 70 122 60 100 60 C78 60 64 70 62 90 Z" fill="#17171D" />}
      {name === "girl" && <g>
        <path d="M62 84 C58 48 80 34 100 34 C120 34 142 48 138 84 C130 66 120 60 100 60 C80 60 70 66 62 84 Z" fill="#2B1B16" />
        <path d="M120 36 L138 24 L136 46 Z M120 36 L102 26 L106 46 Z" fill="#F29BB8" /><circle cx={120} cy={36} r={5} fill="#E0618D" />
      </g>}
    </g>
  );

  const bodyShape = kid ? "M52 262 C52 200 64 160 100 156 C136 160 148 200 148 262 Z" : "M38 262 C38 196 54 148 100 142 C146 148 162 196 162 262 Z";
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 200 260" style={{ overflow: "visible", transform: flip ? "scaleX(-1)" : undefined }}>
      <ellipse cx={100} cy={258} rx={70} ry={6} fill="#000" opacity={0.12} />
      <g transform={`translate(0 ${breathe * 0.35 + bounce}) rotate(${sway} 100 260)`}>
        {/* left arm */}
        <path d={`M${shL.x} ${shL.y} L${handL.x} ${handL.y}`} stroke={sleeve} strokeWidth={kid ? 22 : 26} strokeLinecap="round" />
        <circle cx={handL.x} cy={handL.y} r={kid ? 10 : 11} fill={skin} />
        <path d={bodyShape} fill={bodyFill} stroke={bodyLine} strokeWidth={1.6} />
        {name === "woman" && <path d="M88 150 L100 172 L112 150" stroke={accent} strokeWidth={3} fill="none" />}
        {(name === "man" || name === "elder" || name === "boy") && <g><path d="M92 148 L100 168 L108 148" stroke="#D5DBE4" strokeWidth={2} fill="none" /><circle cx={100} cy={178} r={2.2} fill="#D5DBE4" /><circle cx={100} cy={196} r={2.2} fill="#D5DBE4" /></g>}
        {name === "girl" && <path d="M60 232 H140" stroke="#fff" strokeWidth={4} strokeDasharray="2 8" strokeLinecap="round" />}
        {name === "man" && <g><circle cx={128} cy={190} r={0} /><rect x={118} y={176} width={16} height={9} rx={2} fill="#fff" stroke="#D5DBE4" /></g>}
        {head}
        {/* right arm over body */}
        <path d={`M${sh.x} ${sh.y} L${hand.x} ${hand.y}`} stroke={sleeve} strokeWidth={kid ? 22 : 26} strokeLinecap="round" />
        <circle cx={hand.x} cy={hand.y} r={11.5} fill={skin} />
        {pose === "point" && <path d={`M${hand.x} ${hand.y} l${Math.cos((ang * Math.PI) / 180) * 20} ${Math.sin((ang * Math.PI) / 180) * 20}`} stroke={skin} strokeWidth={7} strokeLinecap="round" />}
      </g>
    </svg>
  );
}
