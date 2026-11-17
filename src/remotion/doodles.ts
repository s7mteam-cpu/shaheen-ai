/** Hand-drawn doodle library: stroke paths in a 100×100 box. The renderer draws them stroke by stroke with a pen,
 *  then fills the `f` paths with the accent colour and keeps them gently alive. */
export type Doodle = { label: string; p: string[]; f?: number[] };
const circ = (x: number, y: number, r: number) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rays = (x: number, y: number, r1: number, r2: number, n: number, off = 0) =>
  Array.from({ length: n }, (_, i) => { const a = off + (i / n) * Math.PI * 2; return `M${(x + Math.cos(a) * r1).toFixed(1)} ${(y + Math.sin(a) * r1).toFixed(1)} L${(x + Math.cos(a) * r2).toFixed(1)} ${(y + Math.sin(a) * r2).toFixed(1)}`; }).join(" ");
const gear = (() => {
  const n = 8, pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, d = Math.PI / n / 2.2;
    for (const [da, r] of [[-d * 1.6, 30], [-d * 0.9, 41], [d * 0.9, 41], [d * 1.6, 30]] as const) pts.push(`${(50 + Math.cos(a + da) * r).toFixed(1)} ${(50 + Math.sin(a + da) * r).toFixed(1)}`);
  }
  return "M" + pts.join(" L") + " Z";
})();

export const DOODLES: Record<string, Doodle> = {
  bulb: { label: "فكرة / مصباح", p: ["M50 10 C28 10 20 30 28 46 C33 55 38 60 38 70 H62 C62 60 67 55 72 46 C80 30 72 10 50 10 Z", "M40 78 H60 M43 86 H57", "M44 64 L44 48 L50 54 L56 48 L56 64", "M12 22 L20 27 M88 22 L80 27 M6 48 H14 M94 48 H86"], f: [0] },
  book: { label: "كتاب / تعلّم", p: ["M50 28 C40 20 22 20 10 24 V78 C22 74 40 74 50 82 C60 74 78 74 90 78 V24 C78 20 60 20 50 28 Z", "M50 28 V82", "M20 36 C28 34 36 35 42 38 M20 48 C28 46 36 47 42 50 M20 60 C28 58 36 59 42 62 M58 38 C64 35 72 34 80 36 M58 50 C64 47 72 46 80 48"], f: [0] },
  rocket: { label: "صاروخ / انطلاق", p: ["M50 8 C66 22 70 44 64 66 H36 C30 44 34 22 50 8 Z", circ(50, 34, 8), "M36 52 L22 72 L36 66 M64 52 L78 72 L64 66", "M42 72 C42 84 50 94 50 94 C50 94 58 84 58 72"], f: [0] },
  heart: { label: "قلب / حب", p: ["M50 86 C20 62 10 44 18 28 C26 14 44 16 50 32 C56 16 74 14 82 28 C90 44 80 62 50 86 Z", "M26 30 C28 26 32 24 36 24"], f: [0] },
  star: { label: "نجمة / تميّز", p: ["M50 8 L62 36 L92 38 L69 58 L77 88 L50 72 L23 88 L31 58 L8 38 L38 36 Z"], f: [0] },
  brain: { label: "دماغ / تفكير", p: ["M50 20 C42 10 26 14 24 28 C14 30 10 44 18 52 C12 62 20 74 32 72 C36 82 48 84 50 76 C52 84 64 82 68 72 C80 74 88 62 82 52 C90 44 86 30 76 28 C74 14 58 10 50 20 Z", "M50 20 V76", "M34 40 C40 42 44 46 50 46 M66 40 C60 42 56 46 50 46 M30 58 C38 58 44 62 50 62 M70 58 C62 58 56 62 50 62"], f: [0] },
  clock: { label: "ساعة / وقت", p: [circ(50, 50, 40), "M50 28 V50 L66 60", "M50 14 V20 M50 80 V86 M14 50 H20 M80 50 H86"], f: [0] },
  gear: { label: "ترس / نظام", p: [gear, circ(50, 50, 13)], f: [0] },
  check: { label: "صح / إنجاز", p: [circ(50, 50, 40), "M30 52 L44 66 L72 34"], f: [0] },
  people: { label: "ناس / فريق", p: [circ(32, 30, 11), "M10 82 C10 62 20 54 32 54 C44 54 54 62 54 82", circ(70, 36, 9), "M58 60 C62 56 66 55 70 55 C82 55 90 62 90 82"], f: [0, 2] },
  person: { label: "شخص", p: [circ(50, 26, 15), "M18 90 C18 64 32 52 50 52 C68 52 82 64 82 90 Z"], f: [0] },
  house: { label: "بيت", p: ["M10 48 L50 12 L90 48", "M20 42 V90 H80 V42", "M42 90 V62 H58 V90", "M28 54 H38 V64 H28 Z M62 54 H72 V64 H62 Z"], f: [1] },
  tree: { label: "شجرة / نمو", p: ["M44 92 V58 M56 92 V58", "M50 8 C30 8 18 24 24 38 C14 46 22 62 38 60 H62 C78 62 86 46 76 38 C82 24 70 8 50 8 Z"], f: [1] },
  plant: { label: "نبتة / بداية", p: ["M50 90 V50", "M50 62 C30 62 22 50 22 36 C38 36 50 44 50 62", "M50 52 C50 38 60 28 78 28 C78 44 66 52 50 52", "M32 90 H68 L64 76 H36 Z"], f: [1, 2] },
  sun: { label: "شمس", p: [circ(50, 50, 18), rays(50, 50, 28, 42, 12)], f: [0] },
  cloud: { label: "غيمة / مطر", p: ["M26 62 C10 62 8 40 26 38 C26 20 52 14 60 30 C74 24 90 36 84 50 C92 62 80 64 72 62 Z", "M30 74 L26 84 M48 74 L44 84 M66 74 L62 84"], f: [0] },
  phone: { label: "جوال / تطبيق", p: ["M30 8 H70 a6 6 0 0 1 6 6 V86 a6 6 0 0 1 -6 6 H30 a6 6 0 0 1 -6 -6 V14 a6 6 0 0 1 6 -6 Z", "M32 20 H68 V74 H32 Z", "M46 84 H54"], f: [1] },
  coin: { label: "مال / عملة", p: [circ(50, 50, 40), circ(50, 50, 30), "M58 38 C52 31 42 35 42 42 C42 51 58 49 58 58 C58 65 48 69 42 62 M50 28 V72"], f: [0] },
  chart: { label: "رسم بياني / نمو", p: ["M12 10 V88 H92", "M24 88 V62 H38 V88 M46 88 V42 H60 V88 M68 88 V24 H82 V88", "M18 54 L38 36 L54 44 L84 12 M72 12 H84 V24"], f: [1] },
  target: { label: "هدف", p: [circ(50, 50, 40), circ(50, 50, 26), circ(50, 50, 11), "M50 50 L88 12 M76 12 H88 V24"], f: [2] },
  key: { label: "مفتاح / حل", p: [circ(28, 50, 17), "M45 50 H92 M78 50 V64 M89 50 V60"], f: [0] },
  lock: { label: "قفل / أمان", p: ["M24 44 H76 V90 H24 Z", "M34 44 V30 C34 10 66 10 66 30 V44", circ(50, 64, 6), "M50 70 V80"], f: [0] },
  shield: { label: "درع / حماية", p: ["M50 8 L84 20 V48 C84 70 68 82 50 92 C32 82 16 70 16 48 V20 Z", "M34 50 L46 62 L68 38"], f: [0] },
  trophy: { label: "كأس / فوز", p: ["M28 12 H72 V40 C72 56 62 64 50 64 C38 64 28 56 28 40 Z", "M28 22 H14 C14 40 20 46 30 48 M72 22 H86 C86 40 80 46 70 48", "M50 64 V78 M38 78 H62 V90 H38 Z"], f: [0] },
  flag: { label: "علم / مرحلة", p: ["M24 92 V10", "M24 14 H80 L68 30 L80 46 H24"], f: [1] },
  magnifier: { label: "بحث / تحليل", p: [circ(42, 42, 27), "M62 62 L90 90", "M30 36 C32 30 36 27 42 26"], f: [0] },
  pencil: { label: "قلم / كتابة", p: ["M18 82 L14 94 L28 90 L84 34 L64 14 Z", "M58 20 L78 40", "M18 82 L28 90"], f: [0] },
  calculator: { label: "آلة حاسبة", p: ["M24 8 H76 V92 H24 Z", "M32 16 H68 V32 H32 Z", "M34 46 h8 M54 46 h8 M34 62 h8 M54 62 h8 M34 78 h8 M54 78 h8"], f: [1] },
  chat: { label: "محادثة / رأي", p: ["M12 18 H88 V64 H50 L30 84 V64 H12 Z", "M26 34 H74 M26 48 H58"], f: [0] },
  camera: { label: "كاميرا / تصوير", p: ["M8 32 H28 L34 20 H66 L72 32 H92 V82 H8 Z", circ(50, 56, 17), circ(50, 56, 7)], f: [0] },
  cup: { label: "كوب / استراحة", p: ["M18 40 H70 V66 C70 80 60 88 44 88 C28 88 18 80 18 66 Z", "M70 46 H78 C90 46 90 64 70 64", "M32 12 C26 20 38 24 32 32 M48 12 C42 20 54 24 48 32"], f: [0] },
  question: { label: "سؤال", p: ["M32 34 C32 10 70 10 70 34 C70 52 50 50 50 68", "M50 84 V86"], f: [] },
  globe: { label: "عالم / كوكب", p: [circ(50, 50, 40), "M10 50 H90", "M50 10 C30 30 30 70 50 90 C70 70 70 30 50 10", "M18 30 H82 M18 70 H82"], f: [0] },
  calendar: { label: "تقويم / موعد", p: ["M10 20 H90 V90 H10 Z", "M10 42 H90", "M30 8 V28 M70 8 V28", "M26 58 h6 M47 58 h6 M68 58 h6 M26 74 h6 M47 74 h6"], f: [0] },
  mail: { label: "رسالة / بريد", p: ["M8 22 H92 V78 H8 Z", "M8 22 L50 56 L92 22"], f: [0] },
  pin: { label: "موقع", p: ["M50 94 C26 62 22 50 22 36 C22 20 34 8 50 8 C66 8 78 20 78 36 C78 50 74 62 50 94 Z", circ(50, 36, 10)], f: [0] },
  smile: { label: "ابتسامة / سعادة", p: [circ(50, 50, 40), circ(36, 40, 3), circ(64, 40, 3), "M28 58 C36 76 64 76 72 58"], f: [0] },
  bolt: { label: "طاقة / سرعة", p: ["M58 6 L24 56 H48 L40 94 L78 40 H54 Z"], f: [0] },
  medal: { label: "ميدالية / جائزة", p: [circ(50, 62, 24), "M34 8 L44 40 M66 8 L56 40", "M50 48 L54 58 L65 59 L57 66 L59 77 L50 71 L41 77 L43 66 L35 59 L46 58 Z"], f: [0] },
  puzzle: { label: "حل / تركيب", p: ["M14 30 H40 C34 18 56 18 50 30 H76 V52 C66 46 66 68 76 62 V88 H14 Z"], f: [0] },
};
export const DOODLE_NAMES = Object.keys(DOODLES);
export const doodleList = () => DOODLE_NAMES.map((n) => `${n} (${DOODLES[n].label})`).join("، ");
