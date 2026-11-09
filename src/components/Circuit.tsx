/** Decorative circuit lines taken from the falcon's wing. */
export function Circuit({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 520 420" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <g fill="none" stroke="#C9A45C" strokeWidth="1.5">
        <path d="M0 80 H140 L180 120 H320" /><circle cx="326" cy="120" r="6" />
        <path d="M0 150 H90 L130 190 H260 L290 220 H380" /><circle cx="386" cy="220" r="6" />
        <path d="M0 230 H170 L210 270 H300" /><circle cx="306" cy="270" r="6" />
        <path d="M0 310 H60 L100 350 H230" /><circle cx="236" cy="350" r="6" />
      </g>
    </svg>
  );
}
