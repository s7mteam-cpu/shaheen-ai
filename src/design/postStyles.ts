// Ready-made styles for posts and carousels: layout + colours + font + decoration (+ frame).
// The studio shows each one on the customer's own text; one click applies it and the text never changes.
import type { DColors, Deco, Frame, LayoutId } from "./spec";

export type PStyle = { id: string; name: string; cat: string; front: LayoutId; mid?: LayoutId; end?: LayoutId; colors: DColors; font: string; deco: Deco; frame: Frame; finish: "flat" };

// [name, mood, bg, ink, accent, soft, deco A, deco B, frame]
type Pal = [string, string, string, string, string, string, Deco, Deco, Frame];
export const POST_PALETTES: Pal[] = [
  // فاخر: dark and metallic
  ["كحلي وذهبي", "فاخر", "#0B2A4A", "#FFFFFF", "#C9A45C", "#12385F", "lines", "corner", "gold"],
  ["أسود وذهبي", "فاخر", "#111114", "#F5F2EA", "#E8B44C", "#1D1D22", "sparkle", "lines", "double"],
  ["زمردي وذهبي", "فاخر", "#0E3B2E", "#F4EFE2", "#D4B06A", "#14503E", "geo", "leaves", "gold"],
  ["عنابي وشمباني", "فاخر", "#4A1424", "#FBF1E6", "#E3B778", "#5E1D30", "corner", "sparkle", "double"],
  ["فحمي ونحاسي", "فاخر", "#1C1A1A", "#F6EFE9", "#D98B5F", "#2A2626", "halftone", "lines", "none"],
  ["بنفسجي ملكي", "فاخر", "#2A1B3D", "#F6F1FB", "#E0B64C", "#3A2753", "sparkle", "circles", "corners"],
  ["أزرق ليلي وفضي", "فاخر", "#0F1B2D", "#EEF3F8", "#A9BCD3", "#182A44", "grid", "circles", "none"],
  ["زيتي وكريمي", "فاخر", "#1F2A1F", "#F3F1E4", "#C8B25A", "#2B3A2B", "leaves", "lines", "rounded"],
  // ناعم: soft pastels
  ["وردي بودرة", "ناعم", "#FBEFEC", "#3A1F25", "#C2566B", "#FFFFFF", "blob", "dots", "rounded"],
  ["مريمية", "ناعم", "#F2F4EC", "#2A3326", "#6E8458", "#FFFFFF", "leaves", "blob", "none"],
  ["لافندر", "ناعم", "#F4F0F8", "#2E2540", "#8E73B5", "#FFFFFF", "circles", "sparkle", "rounded"],
  ["سماوي هادئ", "ناعم", "#EEF5FB", "#0D2A47", "#2D7FC1", "#FFFFFF", "waves", "circles", "none"],
  ["خوخي", "ناعم", "#FFF1E6", "#4A2A1A", "#C4501A", "#FFFFFF", "blob", "arc", "rounded"],
  ["نعناعي", "ناعم", "#EAF6F1", "#0F3B2E", "#1F9D74", "#FFFFFF", "leaves", "waves", "none"],
  ["عاجي وذهبي", "ناعم", "#FBF6EC", "#2B2A26", "#8E6B2C", "#FFFFFF", "corner", "lines", "gold"],
  ["بيج وتيراكوتا", "ناعم", "#F3ECE2", "#1E1B18", "#B4532F", "#FBF7F1", "arc", "dots", "none"],
  ["أزرق ضبابي", "ناعم", "#EEF3F7", "#1F2F42", "#5F82A6", "#FFFFFF", "circles", "lines", "none"],
  ["وردة جورية", "ناعم", "#FCEEF0", "#4B1B2B", "#C45A78", "#FFFFFF", "sparkle", "blob", "rounded"],
  // جريء: loud colour
  ["أحمر وأصفر", "جريء", "#B3261E", "#FFFFFF", "#FFD166", "#9A1F18", "circles", "halftone", "none"],
  ["أزرق كهربائي", "جريء", "#1D4ED8", "#FFFFFF", "#FDE047", "#1E40AF", "grid", "circles", "none"],
  ["برتقالي حيوي", "جريء", "#C2410C", "#FFFFFF", "#FFE08A", "#A93509", "halftone", "arc", "none"],
  ["أخضر وليموني", "جريء", "#12372A", "#F7FFE3", "#C6F432", "#1B4D3A", "lines", "grid", "none"],
  ["فوشي", "جريء", "#C2185B", "#FFFFFF", "#FFE082", "#A3134B", "blob", "dots", "none"],
  ["تركوازي عميق", "جريء", "#0F6B63", "#FFFFFF", "#FFD166", "#0B544E", "waves", "circles", "none"],
  ["أسود ونيون", "جريء", "#0D0D0D", "#FFFFFF", "#FFE600", "#1A1A1A", "grid", "halftone", "none"],
  ["بنفسجي كهربائي", "جريء", "#5B21B6", "#FFFFFF", "#F9D74B", "#4C1D95", "circles", "sparkle", "none"],
  // عصري: clean and modern
  ["أبيض وأزرق", "عصري", "#FFFFFF", "#111827", "#2251CC", "#F3F5F9", "dots", "grid", "none"],
  ["أبيض وأخضر", "عصري", "#FFFFFF", "#0F2D1F", "#16A34A", "#F1F8F3", "leaves", "dots", "none"],
  ["رمادي وبرتقالي", "عصري", "#F4F4F2", "#1B1D21", "#E8651A", "#FFFFFF", "lines", "arc", "none"],
  ["أبيض وأحمر", "عصري", "#FFFFFF", "#111111", "#D62828", "#F4F4F4", "lines", "halftone", "none"],
  ["أبيض وتركوازي", "عصري", "#FFFFFF", "#0F2D2A", "#0F8B7E", "#EAF4F2", "waves", "dots", "none"],
  ["رصاصي وبنفسجي", "عصري", "#F1F3F5", "#2B3440", "#6D4FD0", "#FFFFFF", "grid", "circles", "none"],
  ["كريمي وزيتوني", "عصري", "#F6F2E7", "#26331F", "#5C7A2E", "#FFFFFF", "leaves", "arc", "none"],
  ["أبيض ووردي", "عصري", "#FFFFFF", "#2B1020", "#E11D74", "#FDF2F8", "blob", "dots", "none"],
  // دافئ: earthy
  ["طيني", "دافئ", "#4A2A1E", "#F6EDE3", "#E4A272", "#5E3626", "arc", "halftone", "none"],
  ["رملي وذهبي", "دافئ", "#EADBC3", "#2E2410", "#8A5A10", "#F5EBD8", "dots", "corner", "rounded"],
  ["كاكاو وكريمي", "دافئ", "#3B2418", "#FBF2E6", "#D9A066", "#4B2F20", "lines", "sparkle", "none"],
  ["قرميدي", "دافئ", "#F8EEE6", "#3A1A14", "#B5391F", "#FFFFFF", "arc", "blob", "none"],
  ["زيتوني داكن", "دافئ", "#2C3321", "#F4F0DC", "#D2B04C", "#3A432C", "lines", "lines", "none"],
  ["شروق", "دافئ", "#FFF4CC", "#3A2A00", "#B85F0C", "#FFFFFF", "circles", "waves", "rounded"],
];
POST_PALETTES[38][6] = "leaves";

const FONTS: Record<string, string[]> = {
  "فاخر": ["Amiri", "Almarai", "Cairo"],
  "ناعم": ["Tajawal", "Almarai", "Cairo"],
  "جريء": ["Changa", "Cairo", "Tajawal"],
  "عصري": ["Cairo", "Tajawal", "Almarai"],
  "دافئ": ["Almarai", "Amiri", "Tajawal"],
};
const LAB: Partial<Record<LayoutId, string>> = { classic: "كلاسيكي", bold: "جريء", bento: "بينتو", minimal: "طباعي", cover: "غلاف", split: "نص وصورة", photo: "صورة كبيرة" };
const col = (p: Pal): DColors => ({ bg: p[2], ink: p[3], accent: p[4], soft: p[5] });

// a carousel is read slide after slide, so its decoration stays quiet; a post is one loud image
const QUIET: Deco[] = ["none", "lines", "dots", "circles", "corner", "arc", "grid"];
function build(prefix: string, fams: { front: LayoutId; mid?: LayoutId; n: number }[]): PStyle[] {
  const out: PStyle[] = [];
  const carousel = prefix === "c";
  let fi = 0;
  for (const f of fams) {
    for (let j = 0; j < f.n; j++) {
      // carousels start from a different place in the palette list so the two libraries do not look alike
      const p = POST_PALETTES[(fi * 7 + j * 3 + (carousel ? 11 : 0)) % POST_PALETTES.length];
      const fonts = FONTS[p[1]];
      const d = j % 2 ? p[7] : p[6];
      out.push({
        id: `${prefix}${out.length + 1}`,
        name: `${LAB[f.front]} · ${p[0]}`,
        cat: p[1], front: f.front, mid: f.mid, end: f.mid ? "cta" : undefined,
        colors: col(p), font: fonts[(j + fi + (carousel ? 1 : 0)) % fonts.length],
        deco: carousel && !QUIET.includes(d) ? "lines" : d, frame: carousel ? "none" : j % 3 === 0 ? p[8] : "none", finish: "flat",
      });
    }
    fi++;
  }
  return out;
}

export const POST_STYLES: PStyle[] = build("p", [
  { front: "classic", n: 18 }, { front: "bold", n: 16 }, { front: "bento", n: 18 }, { front: "minimal", n: 18 },
  { front: "cover", n: 14 }, { front: "split", n: 8 }, { front: "photo", n: 8 },
]);
export const CAROUSEL_STYLES: PStyle[] = build("c", [
  { front: "cover", mid: "point", n: 20 }, { front: "minimal", mid: "point", n: 18 }, { front: "classic", mid: "point", n: 16 },
  { front: "bold", mid: "point", n: 16 }, { front: "cover", mid: "bento", n: 16 }, { front: "minimal", mid: "classic", n: 14 },
]);
