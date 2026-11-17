// Ready-made styles for business cards and invitations: each one is a layout + colours + fonts + decoration.
// The studio shows every style on the customer's own text, and one click applies it (the text never changes).
import type { DColors, Deco, Frame, DKind, DesignSpec, LayoutId } from "./spec";

export type DStyle = { id: string; name: string; front: LayoutId; back: LayoutId; colors: DColors; font: string; titleFont?: string; deco: Deco; frame: Frame; finish: "flat" | "foil" };

type Pal = [name: string, bg: string, ink: string, accent: string, soft: string];
const col = (p: Pal): DColors => ({ bg: p[1], ink: p[2], accent: p[3], soft: p[4] });

// ---------- invitations (weddings, engagements, newborns, graduations, Eid) ----------
const IP: Record<string, Pal> = {
  ivory: ["عاجي وذهبي", "#FBF6EC", "#2B2A26", "#B8924A", "#F3EAD6"],
  blush: ["وردي بودرة", "#FBEFEC", "#3A1F25", "#B76E79", "#FFFFFF"],
  sage: ["مريمية", "#F2F4EC", "#2A3326", "#7C8F66", "#E4E9D8"],
  dusty: ["أزرق ضبابي", "#EEF3F7", "#1F2F42", "#6E8CAA", "#DCE6EF"],
  wine: ["عنابي وذهبي", "#F8EFEA", "#4A1424", "#B8924A", "#F0DFD6"],
  navy: ["كحلي ملكي", "#F6F3EA", "#0B2A4A", "#C9A45C", "#E9E3D2"],
  noir: ["أسود وذهبي", "#F5F0E6", "#141210", "#D4AF5F", "#EBE4D3"],
  clay: ["طيني دافئ", "#F6EDE3", "#4A2A1E", "#B4532F", "#EBDCCB"],
  lilac: ["لافندر", "#F4F0F8", "#2E2540", "#8E73B5", "#E6DEF0"],
  emerald: ["زمردي", "#EEF3EF", "#0E3B2E", "#C0A062", "#DCE8DF"],
  champ: ["شمباني", "#F4EBDD", "#3B3224", "#A8845A", "#EBDFCA"],
  silver: ["أبيض وفضي", "#FFFFFF", "#1F2933", "#8A97A6", "#F1F4F7"],
  teal: ["تركوازي", "#EAF4F2", "#0F2D2A", "#0F8B7E", "#FFFFFF"],
  apricot: ["مشمشي", "#FFF1E6", "#4A2A1A", "#E08A5B", "#FFE3CF"],
  night: ["ليل الصحراء", "#F3EEE4", "#10213A", "#D9B25F", "#E7DFCD"],
  rose: ["وردة جورية", "#FCEEF0", "#4B1B2B", "#C45A78", "#F8DDE3"],
};
// [layout, palette, bodyFont, titleFont, deco, frame, name]
type IRow = [LayoutId, string, string, string, Deco, Frame, string];
const IROWS: IRow[] = [
  ["invA", "ivory", "Amiri", "Aref Ruqaa", "none", "none", "ذهب كلاسيكي"],
  ["invA", "blush", "Amiri", "Aref Ruqaa Ink", "sparkle", "none", "ورد بودرة"],
  ["invA", "navy", "Amiri", "Aref Ruqaa", "none", "none", "كحلي ملكي"],
  ["invA", "sage", "Tajawal", "Katibeh", "none", "none", "مريمية هادية"],
  ["invA", "wine", "Amiri", "Aref Ruqaa Ink", "none", "none", "عنابي فخم"],
  ["invA", "champ", "Almarai", "Mirza", "sparkle", "none", "شمباني ناعم"],
  ["invA", "emerald", "Amiri", "Aref Ruqaa", "geo", "none", "زمردي ونقش"],
  ["invB", "blush", "Tajawal", "Katibeh", "none", "none", "قوس وردي"],
  ["invB", "sage", "Tajawal", "Mirza", "none", "none", "قوس مريمي"],
  ["invB", "dusty", "Almarai", "Katibeh", "none", "none", "قوس ضبابي"],
  ["invB", "apricot", "Cairo", "Mirza", "none", "none", "قوس مشمشي"],
  ["invB", "lilac", "Tajawal", "Katibeh", "sparkle", "none", "قوس لافندر"],
  ["invB", "ivory", "Amiri", "Aref Ruqaa Ink", "none", "none", "قوس عاجي"],
  ["invB", "clay", "Almarai", "Reem Kufi", "none", "none", "قوس طيني"],
  ["invC", "silver", "Cairo", "Reem Kufi", "none", "none", "مجلة بيضاء"],
  ["invC", "noir", "Tajawal", "El Messiri", "none", "none", "مجلة سوداء"],
  ["invC", "clay", "Almarai", "El Messiri", "none", "none", "مجلة طينية"],
  ["invC", "teal", "Cairo", "Reem Kufi", "none", "none", "مجلة تركوازية"],
  ["invC", "rose", "Tajawal", "Mirza", "none", "none", "مجلة وردية"],
  ["invC", "dusty", "Almarai", "El Messiri", "none", "none", "مجلة زرقاء"],
  ["invD", "navy", "Amiri", "Aref Ruqaa", "none", "none", "ليلة ملكية"],
  ["invD", "noir", "Amiri", "Aref Ruqaa Ink", "none", "none", "سواد وذهب"],
  ["invD", "emerald", "Amiri", "Aref Ruqaa", "none", "none", "زمرد داكن"],
  ["invD", "wine", "Amiri", "Katibeh", "none", "none", "عنابي داكن"],
  ["invD", "night", "Tajawal", "El Messiri", "none", "none", "ليل ذهبي"],
  ["invD", "lilac", "Almarai", "Mirza", "none", "none", "بنفسجي ليلي"],
  ["invE", "apricot", "Cairo", "Reem Kufi", "none", "none", "فرحة مشمشية"],
  ["invE", "teal", "Tajawal", "El Messiri", "none", "none", "مولود تركوازي"],
  ["invE", "blush", "Almarai", "Katibeh", "none", "none", "مولودة وردية"],
  ["invE", "dusty", "Cairo", "Reem Kufi", "none", "none", "مولود أزرق"],
  ["invE", "sage", "Tajawal", "Mirza", "none", "none", "تخرج أخضر"],
  ["invE", "navy", "Almarai", "El Messiri", "none", "none", "تخرج كحلي"],
  ["invF", "ivory", "Amiri", "Aref Ruqaa", "none", "none", "ورقة عاجية"],
  ["invF", "blush", "Tajawal", "Katibeh", "none", "none", "ورقة وردية"],
  ["invF", "sage", "Almarai", "Mirza", "none", "none", "ورقة مريمية"],
  ["invF", "lilac", "Tajawal", "Aref Ruqaa Ink", "none", "none", "ورقة لافندر"],
  ["invF", "champ", "Amiri", "Aref Ruqaa", "none", "none", "ورقة شمباني"],
  ["invF", "apricot", "Cairo", "Mirza", "none", "none", "ورقة مشمشية"],
  ["invG", "silver", "Cairo", "Reem Kufi", "none", "none", "شريط فضي"],
  ["invG", "navy", "Tajawal", "El Messiri", "none", "none", "شريط كحلي"],
  ["invG", "clay", "Almarai", "El Messiri", "none", "none", "شريط طيني"],
  ["invG", "emerald", "Tajawal", "Reem Kufi", "none", "none", "شريط زمردي"],
  ["invG", "rose", "Almarai", "Mirza", "none", "none", "شريط وردة"],
  ["invH", "night", "Amiri", "Aref Ruqaa", "none", "none", "هلال ذهبي"],
  ["invH", "navy", "Tajawal", "Aref Ruqaa Ink", "none", "none", "هلال كحلي"],
  ["invH", "emerald", "Amiri", "Katibeh", "none", "none", "هلال زمردي"],
  ["invH", "wine", "Almarai", "Aref Ruqaa", "none", "none", "هلال عنابي"],
  ["invH", "noir", "Amiri", "El Messiri", "none", "none", "هلال وسواد"],
  ["invH", "lilac", "Tajawal", "Mirza", "none", "none", "هلال بنفسجي"],
  ["invA", "rose", "Amiri", "Katibeh", "sparkle", "none", "جورية ناعمة"],
];

// ---------- business cards ----------
const BP: Record<string, Pal> = {
  navy: ["كحلي وذهبي", "#F7F5EF", "#0B2A4A", "#C9A45C", "#FFFFFF"],
  graphite: ["فحمي وبرتقالي", "#F4F4F2", "#1B1D21", "#E8651A", "#FFFFFF"],
  emerald: ["زمردي", "#F2F6F3", "#0E3B2E", "#1F8A62", "#FFFFFF"],
  wine: ["عنابي", "#FAF3F0", "#4A1424", "#9E2A44", "#FFFFFF"],
  white: ["أبيض وأزرق", "#FFFFFF", "#111827", "#2251CC", "#F3F5F9"],
  sand: ["رملي وطيني", "#F3ECE2", "#1E1B18", "#B4532F", "#FBF7F1"],
  noir: ["أسود وذهبي", "#F5F0E6", "#111114", "#D4AF5F", "#FFFFFF"],
  teal: ["تركوازي", "#EAF4F2", "#0F2D2A", "#0F8B7E", "#FFFFFF"],
  plum: ["بنفسجي", "#F5F1F8", "#2A1B3D", "#7B4FB0", "#FFFFFF"],
  olive: ["زيتوني", "#F1F1EA", "#1F2A1F", "#6B7F3A", "#FFFFFF"],
  rose: ["وردي هادي", "#FBEFEC", "#3A1F25", "#C2566B", "#FFFFFF"],
  sky: ["سماوي", "#EEF5FB", "#0D2A47", "#1E88D6", "#FFFFFF"],
  red: ["أحمر جريء", "#FFF4F2", "#2B0F0D", "#C62F26", "#FFFFFF"],
  gold: ["ذهبي دافئ", "#FBF6EA", "#2E2410", "#B8862B", "#FFFFFF"],
  steel: ["رصاصي", "#F1F3F5", "#2B3440", "#5E7388", "#FFFFFF"],
};
type BRow = [LayoutId, string, string, string, Deco, Frame, string];
const BROWS: BRow[] = [
  ["cardA", "navy", "Cairo", "", "none", "none", "شريط كحلي"],
  ["cardA", "graphite", "Tajawal", "", "none", "none", "شريط برتقالي"],
  ["cardA", "emerald", "Almarai", "", "none", "none", "شريط زمردي"],
  ["cardA", "white", "Cairo", "", "dots", "none", "شريط أزرق"],
  ["cardA", "wine", "Tajawal", "El Messiri", "none", "none", "شريط عنابي"],
  ["cardA", "teal", "Changa", "", "none", "none", "شريط تركوازي"],
  ["cardB", "navy", "Amiri", "", "none", "gold", "وسط ملكي"],
  ["cardB", "noir", "Amiri", "El Messiri", "none", "double", "وسط أسود وذهب"],
  ["cardB", "sand", "Almarai", "Reem Kufi", "none", "none", "وسط رملي"],
  ["cardB", "wine", "Amiri", "", "none", "corners", "وسط عنابي"],
  ["cardB", "white", "Cairo", "", "none", "none", "وسط نظيف"],
  ["cardB", "olive", "Tajawal", "El Messiri", "none", "none", "وسط زيتوني"],
  ["cardC", "navy", "Cairo", "", "none", "none", "نصفين كحلي"],
  ["cardC", "red", "Tajawal", "Reem Kufi", "none", "none", "نصفين أحمر"],
  ["cardC", "teal", "Almarai", "", "none", "none", "نصفين تركوازي"],
  ["cardC", "plum", "Cairo", "", "none", "none", "نصفين بنفسجي"],
  ["cardC", "gold", "Amiri", "El Messiri", "none", "none", "نصفين ذهبي"],
  ["cardC", "sky", "Tajawal", "", "none", "none", "نصفين سماوي"],
  ["cardD", "graphite", "Cairo", "", "none", "none", "داكن برتقالي"],
  ["cardD", "navy", "Tajawal", "Reem Kufi", "none", "none", "داكن كحلي"],
  ["cardD", "emerald", "Almarai", "", "none", "none", "داكن زمردي"],
  ["cardD", "noir", "Amiri", "El Messiri", "none", "none", "داكن ذهبي"],
  ["cardD", "plum", "Cairo", "", "none", "none", "داكن بنفسجي"],
  ["cardD", "wine", "Tajawal", "", "none", "none", "داكن عنابي"],
  ["cardE", "white", "Cairo", "", "none", "none", "طباعي أبيض"],
  ["cardE", "sand", "Almarai", "", "none", "none", "طباعي رملي"],
  ["cardE", "steel", "Tajawal", "", "none", "none", "طباعي رصاصي"],
  ["cardE", "navy", "Amiri", "", "none", "none", "طباعي كلاسيكي"],
  ["cardE", "rose", "Cairo", "El Messiri", "none", "none", "طباعي وردي"],
  ["cardF", "navy", "Cairo", "", "none", "none", "علوي كحلي"],
  ["cardF", "graphite", "Tajawal", "Reem Kufi", "none", "none", "علوي برتقالي"],
  ["cardF", "emerald", "Almarai", "", "none", "none", "علوي زمردي"],
  ["cardF", "wine", "Tajawal", "", "none", "none", "علوي عنابي"],
  ["cardF", "sky", "Cairo", "", "dots", "none", "علوي سماوي"],
  ["cardF", "olive", "Almarai", "El Messiri", "none", "none", "علوي زيتوني"],
  ["cardG", "noir", "Amiri", "El Messiri", "none", "none", "ختم أسود وذهب"],
  ["cardG", "navy", "Amiri", "Reem Kufi", "none", "none", "ختم كحلي"],
  ["cardG", "sand", "Almarai", "Reem Kufi", "none", "none", "ختم رملي"],
  ["cardG", "emerald", "Tajawal", "El Messiri", "none", "none", "ختم زمردي"],
  ["cardG", "rose", "Amiri", "El Messiri", "none", "none", "ختم وردي"],
  ["cardG", "gold", "Amiri", "", "none", "none", "ختم ذهبي"],
  ["cardH", "red", "Cairo", "", "none", "none", "قطري أحمر"],
  ["cardH", "navy", "Tajawal", "Reem Kufi", "none", "none", "قطري كحلي"],
  ["cardH", "teal", "Almarai", "", "none", "none", "قطري تركوازي"],
  ["cardH", "graphite", "Cairo", "", "none", "none", "قطري برتقالي"],
  ["cardH", "plum", "Tajawal", "", "none", "none", "قطري بنفسجي"],
  ["cardH", "sky", "Almarai", "", "none", "none", "قطري سماوي"],
  ["cardA", "gold", "Amiri", "El Messiri", "geo", "none", "شريط ذهبي ونقش"],
  ["cardB", "teal", "Tajawal", "", "none", "rounded", "وسط تركوازي"],
  ["cardE", "wine", "Amiri", "", "none", "none", "طباعي عنابي"],
  ["cardD", "sky", "Cairo", "Reem Kufi", "none", "none", "داكن سماوي"],
  ["cardG", "teal", "Almarai", "", "none", "none", "ختم تركوازي"],
];

// palettes whose accent is a metal (gold, rose gold, copper, silver): they get the foil finish
const METAL = new Set(["ivory", "blush", "navy", "wine", "noir", "champ", "emerald", "night", "silver", "gold", "clay", "rose", "graphite", "sand"]);
const pick = (kind: DKind): DStyle[] => {
  if (kind === "invite") return IROWS.map(([front, p, font, titleFont, deco, frame, name], i) => ({ id: `i${i + 1}`, name, front, back: "invBack", colors: col(IP[p]), font, titleFont, deco, frame, finish: METAL.has(p) ? "foil" : "flat" }));
  if (kind === "bcard") return BROWS.map(([front, p, font, titleFont, deco, frame, name], i) => ({ id: `b${i + 1}`, name, front, back: i % 2 ? "cardBackB" : "cardBack", colors: col(BP[p]), font, titleFont: titleFont || undefined, deco, frame, finish: METAL.has(p) ? "foil" : "flat" }));
  return [];
};
export const stylesFor = (kind: DKind): DStyle[] => pick(kind);

/** Same design with a style applied: layouts, colours, fonts, decoration. The customer's text is untouched. */
export function applyStyle(spec: DesignSpec, st: DStyle): DesignSpec {
  return {
    ...spec,
    colors: st.colors, font: st.font, titleFont: st.titleFont, deco: st.deco, frame: st.frame, finish: st.finish,
    slides: spec.slides.map((s, i) => ({ ...s, layout: i === 0 ? st.front : st.back, pos: undefined, hide: undefined, col: undefined })),
  };
}
