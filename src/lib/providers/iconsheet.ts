import "server-only";
import sharp from "sharp";

/**
 * A generated icon sheet (icons in an even grid on a flat key colour) → one transparent, trimmed PNG per cell.
 * The key colour is removed with a soft edge, then each icon is cropped to its own content.
 */
export async function splitIconSheet(png: Buffer, cols: number, rows: number, key: [number, number, number]) {
  const img = sharp(png).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const px = Buffer.from(data);
  const [kr, kg, kb] = key;
  for (let i = 0; i < px.length; i += C) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const d = Math.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2);
    const a = Math.max(0, Math.min(1, (d - 80) / 90));
    if (a < 1) {
      // remove the key colour bleeding into the edges
      const k = 1 - a;
      px[i] = Math.max(0, Math.min(255, Math.round((r - kr * k) / Math.max(0.15, a))));
      px[i + 1] = Math.max(0, Math.min(255, Math.round((g - kg * k) / Math.max(0.15, a))));
      px[i + 2] = Math.max(0, Math.min(255, Math.round((b - kb * k) / Math.max(0.15, a))));
    }
    px[i + 3] = Math.round(px[i + 3] * a);
  }
  const cw = Math.floor(W / cols), ch = Math.floor(H / rows);
  const out: Buffer[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // content box inside the cell
      let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        if (px[((r * ch + y) * W + (c * cw + x)) * C + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 < 0) { out.push(Buffer.alloc(0)); continue; }
      const side = Math.max(x1 - x0, y1 - y0) + 1;
      const pad = Math.round(side * 0.06);
      const tile = await sharp(px, { raw: { width: W, height: H, channels: C } })
        .extract({ left: c * cw + x0, top: r * ch + y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
        .extend({ top: pad + Math.floor((side - (y1 - y0 + 1)) / 2), bottom: pad + Math.ceil((side - (y1 - y0 + 1)) / 2), left: pad + Math.floor((side - (x1 - x0 + 1)) / 2), right: pad + Math.ceil((side - (x1 - x0 + 1)) / 2), background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      out.push(tile);
    }
  }
  return out;
}

/** A key colour far from the brand colours (green screen, or magenta when the brand is green). */
export function keyFor(accent: string): [number, number, number] {
  const n = parseInt(accent.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return g > r + 30 && g > b + 30 ? [255, 0, 255] : [0, 255, 0];
}
