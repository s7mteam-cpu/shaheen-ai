import type { AgentKey } from "@/lib/agents";

/** One team member of «كلّم شاهين» at his desk: an original cartoon figure (ghutra and agal, dishdasha) drawn in SVG and animated with CSS: he types, his head moves, he blinks, his screen writes.
 *  Drawn facing LEFT; `flip` mirrors it so two members sit back to back. Purely decorative: the button around it carries the name. */
export function AgentFigure({ agent, color, flip = false, small = false }: { agent: AgentKey; color: string; flip?: boolean; small?: boolean }) {
  const red = agent === "faisal" || agent === "saad"; // red-checked shemagh for two of them, white ghutra for the others
  const skin = agent === "turki" ? "#D9A074" : agent === "saad" ? "#E2AE84" : "#E8B58A";
  const pid = `shc-chk-${agent}`;
  return (
    <svg viewBox={small ? "96 30 70 70" : "0 0 200 214"} className={`shc-fig ${small ? "shc-fig-s" : ""}`} style={{ transform: flip ? "scaleX(-1)" : undefined, ["--ac" as string]: color }} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={pid} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="#FBFBFD" /><rect width="3.2" height="7" fill="#D7373F" opacity=".9" /><rect width="7" height="3.2" fill="#D7373F" opacity=".55" />
        </pattern>
      </defs>
      {!small && <>
        <ellipse cx="100" cy="203" rx="88" ry="9" fill={color} opacity=".16" />
        {/* chair */}
        <rect x="158" y="90" width="10" height="66" rx="5" fill="#1B3A61" stroke="#2C5488" />
        <rect x="110" y="150" width="56" height="10" rx="5" fill="#1B3A61" stroke="#2C5488" />
        <rect x="136" y="160" width="5" height="30" fill="#24466F" />
        <path d="M112 196 L138 188 L164 196" fill="none" stroke="#24466F" strokeWidth="5" strokeLinecap="round" />
        <circle cx="112" cy="198" r="4" fill="#0E2440" /><circle cx="164" cy="198" r="4" fill="#0E2440" />
        {/* desk and screen */}
        <rect x="6" y="140" width="100" height="7" rx="3.5" fill="#143056" stroke={color} strokeOpacity=".7" />
        <rect x="16" y="147" width="6" height="54" fill="#102848" /><rect x="90" y="147" width="6" height="54" fill="#102848" />
        <rect x="42" y="124" width="6" height="16" fill="#24466F" /><rect x="32" y="137" width="26" height="4" rx="2" fill="#24466F" />
        <g className="shc-screen">
          <rect x="14" y="74" width="62" height="50" rx="6" fill="#061A30" stroke={color} strokeWidth="1.6" />
          <rect className="shc-l1" x="21" y="83" width="30" height="3.4" rx="1.7" fill={color} />
          <rect className="shc-l2" x="21" y="91" width="44" height="3.4" rx="1.7" fill="#fff" opacity=".55" />
          <rect className="shc-l3" x="21" y="99" width="22" height="3.4" rx="1.7" fill={color} opacity=".8" />
          <rect className="shc-l4" x="21" y="107" width="38" height="3.4" rx="1.7" fill="#fff" opacity=".4" />
          <rect className="shc-cur" x="62" y="113" width="2.4" height="6" fill={color} />
        </g>
        <rect x="66" y="134.5" width="32" height="4.5" rx="2" fill="#24466F" />
        {/* legs and shoes */}
        <rect x="92" y="150" width="15" height="44" rx="7" fill="#EEF1F6" />
        <ellipse cx="95" cy="197" rx="12" ry="5.5" fill="#1A1A22" />
        <rect x="92" y="141" width="54" height="17" rx="8.5" fill="#F4F6FA" />
      </>}
      <g className="shc-body">
        {!small && <>
          {/* dishdasha */}
          <path d="M120 100 Q120 92 134 92 Q150 92 152 104 L154 154 L116 154 Z" fill="#F7F8FB" stroke="#DCE1EA" />
          <path d="M134 94 L134 120" stroke="#DCE1EA" strokeWidth="1.4" />
          <circle cx="134" cy="102" r="1.2" fill="#B9C1CF" /><circle cx="134" cy="110" r="1.2" fill="#B9C1CF" />
        </>}
        <rect x="126" y="84" width="11" height="11" rx="3" fill={skin} />
        <g className="shc-head">
          {/* ghutra falling behind the head */}
          <path d="M150 62 Q157 84 153 108 Q144 113 136 105 Q141 84 137 66 Z" fill={red ? `url(#${pid})` : "#FBFBFD"} stroke="#D5DAE3" />
          <circle cx="128" cy="70" r="17" fill={skin} />
          {/* face, in profile to the left */}
          <path d="M111.4 70 Q107.5 73 111.6 76" fill={skin} stroke={skin} strokeWidth="2" strokeLinecap="round" />
          <ellipse className="shc-eye" cx="119" cy="68" rx="1.9" ry="2.5" fill="#1B1B22" />
          <path d="M115 62.5 Q119 60.5 123 62.5" fill="none" stroke="#2A1D14" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M115 78 Q118.5 81 122 78.6" fill="none" stroke="#8A4B33" strokeWidth="1.5" strokeLinecap="round" />
          {agent === "nasser" && <path d="M112 76 Q114 89 128 88 Q139 87 142 76 Q134 82 126 81 Q118 81 114 75 Z" fill="#2A1D14" />}
          {agent === "faisal" && <path d="M112.5 75.6 Q117 73.6 123 76.2 Q117 78 112.5 77.4 Z" fill="#2A1D14" />}
          {agent === "saad" && <path d="M113 78 Q116 87 128 87.5 Q137 87 140 79 Q133 84 126 83.4 Q119 83 115 78 Z" fill="#3A2A1E" opacity=".9" />}
          {agent === "turki" && <g fill="none" stroke="#10131A" strokeWidth="1.5"><circle cx="119" cy="68" r="5" /><path d="M124 67.5 L138 65" /></g>}
          {/* ghutra over the head, and the agal */}
          <path d="M110.5 63 Q110 45 129 44.5 Q151 44 150.5 66 Q144 58 132 57.5 Q120 57 110.5 63 Z" fill={red ? `url(#${pid})` : "#FBFBFD"} stroke="#D5DAE3" />
          <path d="M113 53.5 Q130 45.5 148.5 54" fill="none" stroke="#0E0E12" strokeWidth="4.6" strokeLinecap="round" />
          <path d="M112.2 57.6 Q130 50 149.6 58.4" fill="none" stroke="#0E0E12" strokeWidth="3.4" strokeLinecap="round" />
          {agent === "saad" && <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"><path d="M129 71 Q118 86 110 80" /><circle cx="109" cy="80" r="2.4" fill={color} /><rect x="125" y="64" width="8" height="12" rx="4" fill="#12233D" /></g>}
        </g>
        {!small && <g className="shc-arm">
          <path d="M132 106 Q118 124 96 132" fill="none" stroke="#F7F8FB" strokeWidth="12" strokeLinecap="round" />
          <path d="M132 106 Q118 124 96 132" fill="none" stroke="#DCE1EA" strokeWidth="1" strokeLinecap="round" opacity=".7" transform="translate(0 6)" />
          <circle cx="92" cy="132.5" r="5.4" fill={skin} />
        </g>}
      </g>
      {/* what each one works with */}
      {!small && agent === "nasser" && <g className="shc-prop"><rect x="23" y="150" width="20" height="14" rx="3" fill="none" stroke={color} strokeWidth="1.6" /><circle cx="29" cy="157" r="2.4" fill={color} /><path d="M35 161 L40 153" stroke={color} strokeWidth="1.6" strokeLinecap="round" /></g>}
      {!small && agent === "faisal" && <g className="shc-prop" fill="none" stroke={color} strokeWidth="1.6"><rect x="22" y="152" width="22" height="13" rx="2.5" /><path d="M22 156 L44 156 M27 152 L30 156 M33 152 L36 156 M39 152 L42 156" /><path d="M31 158.5 L36 161 L31 163.5 Z" fill={color} /></g>}
      {!small && agent === "turki" && <g className="shc-prop" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"><rect x="24" y="150" width="17" height="17" rx="2.5" /><path d="M28 155 L37 155 M28 159 L37 159 M28 163 L33 163" /></g>}
      {!small && agent === "saad" && <g className="shc-prop" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round"><path d="M24 153 h18 a3 3 0 0 1 3 3 v6 a3 3 0 0 1 -3 3 h-10 l-5 4 v-4 h-3 a3 3 0 0 1 -3 -3 v-6 a3 3 0 0 1 3 -3 Z" /><path d="M29 159 h.1 M33 159 h.1 M37 159 h.1" strokeWidth="2.4" /></g>}
    </svg>
  );
}
