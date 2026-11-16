import { lum } from "@/design/spec";

export const ID_FONTS = ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"] as const;
export const TILE_KINDS = ["quote", "offer", "tip", "product", "testimonial", "brand"] as const;
export const TILE_LABEL: Record<string, string> = { quote: "عبارة", offer: "عرض", tip: "نصيحة", product: "منتج", testimonial: "رأي عميل", brand: "هوية" };

export type IdColor = { role: string; name: string; hex: string };
export type IdTile = { kind: string; text: string; bg: number; fg: string };
export type Concept = {
  id: string; name: string; idea: string; why: string; personality: string[];
  palette: IdColor[]; fonts: { head: string; body: string };
  logo: { direction: string; prompt: string; path?: string; url?: string };
  feed: { approach: string; rules: string[]; tiles: IdTile[] };
  reels: { cover: string; motion: string; captionStyle: string; length: string; hooks: string[] };
  content: { pillars: { name: string; share: string; ideas: string[] }[]; cadence: string };
  bio: string; highlights: string[]; captions: { type: string; text: string }[]; hashtags: string[];
};

const hex6 = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim().toUpperCase() : null);
const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const arr = (v: unknown, n: number, m: number) => (Array.isArray(v) ? v.map((x) => str(x, m)).filter(Boolean).slice(0, n) : []);

const ratio = (a: string, b: string) => { const f = (h: string) => { const n = parseInt(h.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map((x) => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }; const [x, y] = [f(a), f(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** the most readable text colour for a background: a palette colour if it reads well (4.5:1), else black/white. */
export function readable(bg: string, palette: string[]) {
  const best = [...palette, "#FFFFFF", "#111111"].filter((c) => c !== bg).sort((a, b) => ratio(bg, b) - ratio(bg, a))[0];
  return ratio(bg, best) >= 4.5 ? best : lum(bg) > 0.5 ? "#111111" : "#FFFFFF";
}

/** Cleans whatever the model returned into a safe concept (valid colours, allowed fonts, readable tiles). Returns null if unusable. */
export function normaliseConcept(raw: unknown, i: number): Concept | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const pal = (Array.isArray(r.palette) ? r.palette : []).map((c) => { const o = (c ?? {}) as Record<string, unknown>; const h = hex6(o.hex); return h ? { role: str(o.role, 20), name: str(o.name, 30), hex: h } : null; }).filter((c): c is IdColor => !!c).slice(0, 5);
  if (pal.length < 4 || !str(r.name, 60)) return null;
  const f = (r.fonts ?? {}) as Record<string, unknown>;
  const font = (v: unknown, d: string) => (ID_FONTS as readonly string[]).includes(String(v)) ? String(v) : d;
  const feed = (r.feed ?? {}) as Record<string, unknown>;
  const hexes = pal.map((c) => c.hex);
  const tiles: IdTile[] = (Array.isArray(feed.tiles) ? feed.tiles : []).slice(0, 9).map((t) => {
    const o = (t ?? {}) as Record<string, unknown>;
    const bg = Math.min(pal.length - 1, Math.max(0, Math.round(Number(o.bg)) || 0));
    const kind = (TILE_KINDS as readonly string[]).includes(String(o.kind)) ? String(o.kind) : "brand";
    return { kind, text: str(o.text, 60), bg, fg: readable(hexes[bg], hexes) };
  });
  const logo = (r.logo ?? {}) as Record<string, unknown>;
  const reels = (r.reels ?? {}) as Record<string, unknown>;
  const content = (r.content ?? {}) as Record<string, unknown>;
  return {
    id: `c${i + 1}`, name: str(r.name, 60), idea: str(r.idea, 400), why: str(r.why, 400), personality: arr(r.personality, 4, 24),
    palette: pal, fonts: { head: font(f.head, "Cairo"), body: font(f.body, "Tajawal") },
    logo: { direction: str(logo.direction, 300), prompt: str(logo.prompt, 400) },
    feed: { approach: str(feed.approach, 300), rules: arr(feed.rules, 5, 160), tiles },
    reels: { cover: str(reels.cover, 240), motion: str(reels.motion, 240), captionStyle: str(reels.captionStyle, 240), length: str(reels.length, 120), hooks: arr(reels.hooks, 3, 120) },
    content: {
      pillars: (Array.isArray(content.pillars) ? content.pillars : []).slice(0, 4).map((p) => { const o = (p ?? {}) as Record<string, unknown>; return { name: str(o.name, 40), share: str(o.share, 10), ideas: arr(o.ideas, 3, 120) }; }).filter((p) => p.name),
      cadence: str(content.cadence, 240),
    },
    bio: str(r.bio, 220), highlights: arr(r.highlights, 5, 16),
    captions: (Array.isArray(r.captions) ? r.captions : []).slice(0, 3).map((c) => { const o = (c ?? {}) as Record<string, unknown>; return { type: str(o.type, 30), text: str(o.text, 700) }; }).filter((c) => c.text),
    hashtags: arr(r.hashtags, 10, 30).map((h) => h.replace(/^#?/, "#")),
  };
}
