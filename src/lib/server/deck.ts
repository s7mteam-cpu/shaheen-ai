import "server-only";
import PptxGenJS from "pptxgenjs";

/** One slide of the outline the writer returns. Everything on the slides is built as real, editable PowerPoint objects (text boxes, shapes), never as flat pictures. */
export type Slide = {
  kind: "title" | "section" | "bullets" | "twocol" | "stats" | "steps" | "quote" | "closing";
  title?: string;
  subtitle?: string;
  bullets?: string[];
  left?: { title?: string; bullets?: string[] };
  right?: { title?: string; bullets?: string[] };
  stats?: { value: string; label: string }[];
  steps?: { t: string; d?: string }[];
  quote?: string;
  by?: string;
  notes?: string;
  img?: string; // English picture prompt (the caller replaces it with `pic` once drawn)
  pic?: Buffer | null;
};
export type Deck = { title: string; lang: "ar" | "en"; primary: string; accent: string; slides: Slide[] };

const hex = (v: unknown, d: string) => (typeof v === "string" && /^#?[0-9a-f]{6}$/i.test(v) ? v.replace("#", "").toUpperCase() : d);
const lum = (h: string) => { const n = parseInt(h, 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const mix = (a: string, b: string, t: number) => {
  const x = parseInt(a, 16), y = parseInt(b, 16);
  const c = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return [16, 8, 0].map((s) => c(s).toString(16).padStart(2, "0")).join("").toUpperCase();
};

const W = 10, H = 5.625;

/** Builds the .pptx. Arabic decks are right-to-left: text boxes are RTL and aligned right, the picture sits on the left. */
export async function buildDeck(d: Deck, logo?: Buffer | null, font?: string | null): Promise<Buffer> {
  const rtl = d.lang === "ar";
  const P = hex(d.primary, "1F3A5F"), A = hex(d.accent, "C9A24B");
  const onP = lum(P) > 0.62 ? "1B1B1B" : "FFFFFF";
  const bg = "FAF8F4", ink = "222222", soft = mix(P, "FFFFFF", 0.9), muted = "6B7280";
  const face = font && /^[\w \-]{2,40}$/.test(font) ? font : rtl ? "Arial" : "Calibri";
  const al = rtl ? "right" : "left";
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9";
  pres.title = d.title;
  pres.rtlMode = rtl;
  const t = (s?: string) => String(s ?? "").trim();
  const x = (w: number, ww = W) => (rtl ? ww - w : w); // mirrors an x position for RTL decks

  const txt = (s: PptxGenJS.Slide, text: string, o: { x: number; y: number; w: number; h: number; size: number; color: string; bold?: boolean; align?: "left" | "right" | "center"; valign?: "top" | "middle" | "bottom" }) =>
    s.addText(text, { x: o.x, y: o.y, w: o.w, h: o.h, fontFace: face, fontSize: o.size, color: o.color, bold: !!o.bold, align: o.align ?? al, valign: o.valign ?? "top", rtlMode: rtl, margin: 0, fit: "shrink", paraSpaceAfter: 0 });

  const bullets = (s: PptxGenJS.Slide, list: string[], b: { x: number; y: number; w: number; h: number; size?: number; color?: string }) => {
    const items = list.map(t).filter(Boolean).slice(0, 7);
    if (!items.length) return;
    const size = b.size ?? (items.length > 5 ? 19 : items.length > 3 ? 22 : 25);
    s.addText(items.map((it) => ({ text: it, options: { bullet: { code: "25CF", indent: 18 }, paraSpaceAfter: 9, breakLine: true } })), {
      x: b.x, y: b.y, w: b.w, h: b.h, fontFace: face, fontSize: size, color: b.color ?? ink, align: al, valign: "top", rtlMode: rtl, margin: 0, fit: "shrink", lineSpacingMultiple: 1.1,
    });
  };

  const frame = (s: PptxGenJS.Slide, title: string, n: number) => {
    s.background = { color: bg };
    s.addShape(pres.ShapeType.rect, { x: rtl ? W - 0.18 : 0, y: 0, w: 0.18, h: H, fill: { color: P }, line: { color: P, width: 0 } });
    txt(s, title, { x: 0.6, y: 0.4, w: W - 1.4, h: 0.9, size: 28, color: P, bold: true, valign: "middle" });
    s.addShape(pres.ShapeType.rect, { x: rtl ? W - 0.6 - 0.9 : 0.6, y: 1.32, w: 0.9, h: 0.06, fill: { color: A }, line: { color: A, width: 0 } });
    txt(s, String(n), { x: rtl ? 0.4 : W - 0.9, y: H - 0.5, w: 0.5, h: 0.3, size: 11, color: muted, align: rtl ? "left" : "right" });
    if (logo) s.addImage({ data: `image/png;base64,${logo.toString("base64")}`, x: rtl ? 0.4 : W - 1.2, y: 0.35, w: 0.8, h: 0.5, sizing: { type: "contain", w: 0.8, h: 0.5 } });
  };

  d.slides.forEach((sl, i) => {
    const s = pres.addSlide();
    const title = t(sl.title);
    if (sl.kind === "title" || sl.kind === "closing") {
      s.background = { color: P };
      s.addShape(pres.ShapeType.rect, { x: rtl ? W - 0.35 : 0, y: 0, w: 0.35, h: H, fill: { color: A }, line: { color: A, width: 0 } });
      const hasPic = !!sl.pic;
      if (hasPic) s.addImage({ data: `image/jpeg;base64,${sl.pic!.toString("base64")}`, x: rtl ? 0 : W * 0.5, y: 0, w: W * 0.5, h: H, sizing: { type: "cover", w: W * 0.5, h: H } });
      const tw = hasPic ? W * 0.5 - 1.1 : W - 2;
      const tx = rtl ? W - 0.9 - tw : 0.9 + 0.35;
      txt(s, title || d.title, { x: tx, y: 1.5, w: tw, h: 1.7, size: sl.kind === "title" ? 38 : 34, color: onP, bold: true, valign: "middle" });
      s.addShape(pres.ShapeType.rect, { x: rtl ? tx + tw - 1 : tx, y: 3.3, w: 1, h: 0.07, fill: { color: A }, line: { color: A, width: 0 } });
      if (t(sl.subtitle)) txt(s, t(sl.subtitle), { x: tx, y: 3.55, w: tw, h: 1.1, size: 18, color: mix(P, onP === "FFFFFF" ? "FFFFFF" : "000000", 0.82) });
      if (logo) s.addImage({ data: `image/png;base64,${logo.toString("base64")}`, x: rtl ? W - 1.9 : 0.9, y: 0.45, w: 1.0, h: 0.62, sizing: { type: "contain", w: 1.0, h: 0.62 } });
    } else if (sl.kind === "section") {
      s.background = { color: soft };
      s.addShape(pres.ShapeType.rect, { x: 0, y: H / 2 - 0.04, w: W, h: 0.08, fill: { color: A }, line: { color: A, width: 0 } });
      txt(s, title, { x: 1, y: 1.2, w: W - 2, h: 1.6, size: 34, color: P, bold: true, valign: "bottom" });
      if (t(sl.subtitle)) txt(s, t(sl.subtitle), { x: 1, y: 3.1, w: W - 2, h: 1.2, size: 18, color: muted });
    } else if (sl.kind === "stats" && sl.stats?.length) {
      frame(s, title, i + 1);
      const st = sl.stats.slice(0, 4), n = st.length, gap = 0.3, cw = (W - 1.4 - gap * (n - 1)) / n;
      st.forEach((it, k) => {
        const cx = rtl ? W - 0.7 - cw - k * (cw + gap) : 0.7 + k * (cw + gap);
        s.addShape(pres.ShapeType.roundRect, { x: cx, y: 1.9, w: cw, h: 2.6, fill: { color: "FFFFFF" }, line: { color: mix(P, "FFFFFF", 0.75), width: 1 }, rectRadius: 0.12 });
        s.addShape(pres.ShapeType.rect, { x: cx + cw / 2 - 0.3, y: 1.9, w: 0.6, h: 0.07, fill: { color: A }, line: { color: A, width: 0 } });
        txt(s, t(it.value), { x: cx + 0.1, y: 2.2, w: cw - 0.2, h: 1.0, size: n > 3 ? 30 : 38, color: P, bold: true, align: "center", valign: "middle" });
        txt(s, t(it.label), { x: cx + 0.2, y: 3.3, w: cw - 0.4, h: 1.0, size: 15, color: muted, align: "center" });
      });
      if (sl.bullets?.length) bullets(s, sl.bullets.slice(0, 2), { x: 0.7, y: 4.65, w: W - 1.4, h: 0.7, size: 14, color: muted });
    } else if (sl.kind === "steps" && sl.steps?.length) {
      frame(s, title, i + 1);
      const st = sl.steps.slice(0, 5), n = st.length, gap = 0.2, cw = (W - 1.4 - gap * (n - 1)) / n;
      s.addShape(pres.ShapeType.line, { x: 0.7, y: 2.2, w: W - 1.4, h: 0, line: { color: mix(P, "FFFFFF", 0.7), width: 2 } });
      st.forEach((it, k) => {
        const cx = rtl ? W - 0.7 - cw - k * (cw + gap) : 0.7 + k * (cw + gap);
        s.addShape(pres.ShapeType.ellipse, { x: cx + cw / 2 - 0.3, y: 1.9, w: 0.6, h: 0.6, fill: { color: P }, line: { color: bg, width: 3 } });
        txt(s, String(k + 1), { x: cx + cw / 2 - 0.3, y: 1.9, w: 0.6, h: 0.6, size: 16, color: onP, bold: true, align: "center", valign: "middle" });
        txt(s, t(it.t), { x: cx, y: 2.7, w: cw, h: 0.8, size: 16, color: P, bold: true, align: "center" });
        if (t(it.d)) txt(s, t(it.d), { x: cx, y: 3.5, w: cw, h: 1.7, size: 13, color: muted, align: "center" });
      });
    } else if (sl.kind === "quote") {
      s.background = { color: soft };
      txt(s, "“", { x: rtl ? W - 2 : 0.8, y: 0.5, w: 1.2, h: 1.4, size: 96, color: A, bold: true, align: al });
      txt(s, t(sl.quote || title), { x: 1.2, y: 1.7, w: W - 2.4, h: 2.4, size: 28, color: P, bold: true, valign: "middle" });
      if (t(sl.by)) txt(s, `— ${t(sl.by)}`, { x: 1.2, y: 4.2, w: W - 2.4, h: 0.5, size: 16, color: muted });
    } else if (sl.kind === "twocol" && (sl.left || sl.right)) {
      frame(s, title, i + 1);
      const cw = (W - 1.4 - 0.4) / 2;
      [sl.left, sl.right].forEach((c, k) => {
        if (!c) return;
        const cx = rtl ? W - 0.7 - cw - k * (cw + 0.4) : 0.7 + k * (cw + 0.4);
        s.addShape(pres.ShapeType.roundRect, { x: cx, y: 1.7, w: cw, h: 3.4, fill: { color: "FFFFFF" }, line: { color: mix(P, "FFFFFF", 0.78), width: 1 }, rectRadius: 0.1 });
        if (t(c.title)) txt(s, t(c.title), { x: cx + 0.25, y: 1.85, w: cw - 0.5, h: 0.6, size: 20, color: P, bold: true, valign: "middle" });
        bullets(s, c.bullets ?? [], { x: cx + 0.25, y: 2.55, w: cw - 0.5, h: 2.4, size: 16 });
      });
    } else {
      frame(s, title, i + 1);
      const pic = sl.pic;
      const bw = pic ? W * 0.5 - 0.5 : W - 1.6;
      const bx = rtl ? W - 0.7 - bw : 0.7;
      if (t(sl.subtitle)) txt(s, t(sl.subtitle), { x: bx, y: 1.55, w: bw, h: 0.5, size: 15, color: muted });
      bullets(s, sl.bullets ?? [], { x: bx, y: t(sl.subtitle) ? 2.15 : 1.7, w: bw, h: t(sl.subtitle) ? 3.0 : 3.45 });
      if (pic) s.addImage({ data: `image/jpeg;base64,${pic.toString("base64")}`, x: rtl ? 0.7 : W - 0.7 - (W * 0.5 - 0.5), y: 1.7, w: W * 0.5 - 0.5, h: 3.45, sizing: { type: "cover", w: W * 0.5 - 0.5, h: 3.45 } });
    }
    if (t(sl.notes)) s.addNotes(t(sl.notes));
  });
  void x;
  const out = (await pres.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
