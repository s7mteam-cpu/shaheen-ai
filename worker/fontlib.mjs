// Font library for the worker (generated from src/lib/fonts.ts): family -> fontsource package + the weights we ship.
export const FONT_LIB = {
 "Cairo": {
  "pkg": "cairo",
  "weights": [
   400,
   700
  ]
 },
 "Tajawal": {
  "pkg": "tajawal",
  "weights": [
   400,
   700
  ]
 },
 "Almarai": {
  "pkg": "almarai",
  "weights": [
   400,
   700
  ]
 },
 "IBM Plex Sans Arabic": {
  "pkg": "ibm-plex-sans-arabic",
  "weights": [
   400,
   700
  ]
 },
 "Noto Sans Arabic": {
  "pkg": "noto-sans-arabic",
  "weights": [
   400,
   700
  ]
 },
 "Readex Pro": {
  "pkg": "readex-pro",
  "weights": [
   400,
   700
  ]
 },
 "Vazirmatn": {
  "pkg": "vazirmatn",
  "weights": [
   400,
   700
  ]
 },
 "Alexandria": {
  "pkg": "alexandria",
  "weights": [
   400,
   700
  ]
 },
 "Mada": {
  "pkg": "mada",
  "weights": [
   400,
   700
  ]
 },
 "Rubik": {
  "pkg": "rubik",
  "weights": [
   400,
   700
  ]
 },
 "Zain": {
  "pkg": "zain",
  "weights": [
   400,
   700
  ]
 },
 "Fustat": {
  "pkg": "fustat",
  "weights": [
   400,
   700
  ]
 },
 "Cairo Play": {
  "pkg": "cairo-play",
  "weights": [
   400,
   700
  ]
 },
 "Harmattan": {
  "pkg": "harmattan",
  "weights": [
   400,
   700
  ]
 },
 "Changa": {
  "pkg": "changa",
  "weights": [
   400,
   700
  ]
 },
 "Lalezar": {
  "pkg": "lalezar",
  "weights": [
   400
  ]
 },
 "Rakkas": {
  "pkg": "rakkas",
  "weights": [
   400
  ]
 },
 "Baloo Bhaijaan 2": {
  "pkg": "baloo-bhaijaan-2",
  "weights": [
   400,
   700
  ]
 },
 "Jomhuria": {
  "pkg": "jomhuria",
  "weights": [
   400
  ]
 },
 "Marhey": {
  "pkg": "marhey",
  "weights": [
   400,
   700
  ]
 },
 "Kufam": {
  "pkg": "kufam",
  "weights": [
   400,
   700
  ]
 },
 "Handjet": {
  "pkg": "handjet",
  "weights": [
   400,
   700
  ]
 },
 "Lemonada": {
  "pkg": "lemonada",
  "weights": [
   400,
   700
  ]
 },
 "Reem Kufi": {
  "pkg": "reem-kufi",
  "weights": [
   400,
   700
  ]
 },
 "Noto Kufi Arabic": {
  "pkg": "noto-kufi-arabic",
  "weights": [
   400,
   700
  ]
 },
 "Reem Kufi Fun": {
  "pkg": "reem-kufi-fun",
  "weights": [
   400,
   700
  ]
 },
 "Reem Kufi Ink": {
  "pkg": "reem-kufi-ink",
  "weights": [
   400
  ]
 },
 "Blaka": {
  "pkg": "blaka",
  "weights": [
   400
  ]
 },
 "Blaka Ink": {
  "pkg": "blaka-ink",
  "weights": [
   400
  ]
 },
 "Blaka Hollow": {
  "pkg": "blaka-hollow",
  "weights": [
   400
  ]
 },
 "Amiri": {
  "pkg": "amiri",
  "weights": [
   400,
   700
  ]
 },
 "Noto Naskh Arabic": {
  "pkg": "noto-naskh-arabic",
  "weights": [
   400,
   700
  ]
 },
 "Scheherazade New": {
  "pkg": "scheherazade-new",
  "weights": [
   400,
   700
  ]
 },
 "Lateef": {
  "pkg": "lateef",
  "weights": [
   400,
   700
  ]
 },
 "Markazi Text": {
  "pkg": "markazi-text",
  "weights": [
   400,
   700
  ]
 },
 "El Messiri": {
  "pkg": "el-messiri",
  "weights": [
   400,
   700
  ]
 },
 "Amiri Quran": {
  "pkg": "amiri-quran",
  "weights": [
   400
  ]
 },
 "Aref Ruqaa": {
  "pkg": "aref-ruqaa",
  "weights": [
   400,
   700
  ]
 },
 "Aref Ruqaa Ink": {
  "pkg": "aref-ruqaa-ink",
  "weights": [
   400,
   700
  ]
 },
 "Katibeh": {
  "pkg": "katibeh",
  "weights": [
   400
  ]
 },
 "Mirza": {
  "pkg": "mirza",
  "weights": [
   400,
   700
  ]
 },
 "Gulzar": {
  "pkg": "gulzar",
  "weights": [
   400
  ]
 },
 "Alkalami": {
  "pkg": "alkalami",
  "weights": [
   400
  ]
 },
 "Ruwudu": {
  "pkg": "ruwudu",
  "weights": [
   400,
   700
  ]
 },
 "Qahiri": {
  "pkg": "qahiri",
  "weights": [
   400
  ]
 },
 "Vibes": {
  "pkg": "vibes",
  "weights": [
   400
  ]
 },
 "Playpen Sans Arabic": {
  "pkg": "playpen-sans-arabic",
  "weights": [
   400,
   700
  ]
 },
 "Noto Nastaliq Urdu": {
  "pkg": "noto-nastaliq-urdu",
  "weights": [
   400,
   700
  ]
 }
};
export const FONT_IDS = Object.keys(FONT_LIB);
/** css files for a Remotion render: the base set plus the chosen family */
export const freeFontCss = (base, font) => { const f = FONT_LIB[font]; return f ? [...new Set([...base, ...f.weights.map((w) => `@fontsource/${f.pkg}/arabic-${w}.css`)])] : base; };
