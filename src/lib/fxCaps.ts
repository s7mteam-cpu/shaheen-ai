/** «ترجمة كلمة كلمة» of the innovative montage, for the studio preview. The SAME layer the worker draws (worker/fxflow.mjs captionLayer): keep the two identical. */
export type FxWord = { t: string; s: number; e: number };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
export const FX_FILLER = /^(?:[أاآإ]+[مه]+|م{2,}|[أاآ]ه+|ه+م+)[،,.!؟?]*$/;
export function captionLayer(words: FxWord[], a: number, b: number, { tall = true, accent = "#ffd400" }: { tall?: boolean; accent?: string } = {}) {
  const ws = words.filter((w) => w.s >= a - 0.01 && w.s < b && String(w.t).trim() && !FX_FILLER.test(String(w.t).trim()));
  if (!ws.length) return "";
  const max = tall ? 4 : 7, groups: FxWord[][] = []; let cur: FxWord[] = [];
  for (const w of ws) {
    if (cur.length && (w.s - cur[cur.length - 1].e > 0.45 || cur.length >= max || w.s - cur[0].s > 2.4 || cur.reduce((n, x) => n + String(x.t).length + 1, 0) + String(w.t).length > (tall ? 18 : 40))) { groups.push(cur); cur = []; }
    cur.push(w);
  }
  if (cur.length) groups.push(cur);
  const hi = /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#ffd400";
  const o = tall ? 0.55 : 0.28;
  const ring = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]].map(([x, y]) => `${(x * o).toFixed(2)}vw ${(y * o).toFixed(2)}vw 0 #000`).join(",");
  const rows = groups.map((g, i) => {
    const s = Math.max(0, g[0].s - a - 0.06), next = groups[i + 1] ? groups[i + 1][0].s - a - 0.06 : b - a;
    const e = Math.max(s + 0.4, Math.min(next, g[g.length - 1].e - a + 0.4));
    return `<div class="fxc" style="animation-delay:${s.toFixed(2)}s;animation-duration:${(e - s).toFixed(2)}s">${g.map((w) => `<span style="animation-delay:${Math.max(0, w.s - a).toFixed(2)}s">${esc(String(w.t))}</span>`).join(" ")}</div>`;
  }).join("");
  return `<style>#fxcaps{position:fixed;left:5vw;right:5vw;top:${tall ? 73 : 82}vh;height:0;z-index:2147483000;direction:rtl;pointer-events:none;font-family:'Cairo',sans-serif}
#fxcaps .fxc{position:absolute;left:0;right:0;top:0;text-align:center;font-weight:900;font-size:${tall ? 6.8 : 3.4}vw;line-height:1.4;color:#fff;opacity:0;transform:translateY(-50%);animation-name:fxc;animation-timing-function:linear;animation-fill-mode:both;text-shadow:${ring},0 .5vw 1.6vw rgba(0,0,0,.6)}
#fxcaps .fxc span{display:inline-block;margin:0 .14em;animation:fxw .16s ease-out both}
@keyframes fxc{0%{opacity:0;transform:translateY(-50%) scale(.9)}6%{opacity:1;transform:translateY(-50%) scale(1)}94%{opacity:1}100%{opacity:0}}
@keyframes fxw{0%{color:#fff;transform:scale(1)}50%{transform:scale(1.16)}100%{color:${hi};transform:scale(1)}}</style><div id="fxcaps" aria-hidden="true">${rows}</div>`;
}
export const withCaps = (page: string, caps: string) => { if (!caps) return page; const at = page.toLowerCase().lastIndexOf("</body>"); return at > 0 ? page.slice(0, at) + caps + page.slice(at) : page + caps; };
export const FX_EMPTY = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"></head><body></body></html>`;

/** «صور العميل» (the same as worker/fxflow.mjs injectPhotos): the page marks the place with <img data-shot="p1">; the picture is put in only for showing. */
export function injectPhotos(html: string, photos: Record<string, string> | null | undefined) {
  if (!photos || !Object.keys(photos).length) return html;
  return String(html).replace(/<img\b[^>]*\bdata-shot\s*=\s*["']?(p[1-3]|g[1-9])["']?[^>]*>/gi, (tag: string, k: string) => {
    const src = photos[String(k).toLowerCase()];
    if (typeof src !== "string" || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(src)) return tag;
    return tag.replace(/\ssrc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "").replace(/<img\b/i, `<img src="${src}"`);
  });
}

/** «ورا المتحدث» (the same as the worker): which graphics sit behind the speaker, and a page showing one layer only */
export const FX_BEHIND = /class\s*=\s*["'][^"']*\bfx-behind\b/i;
export const onlyLayer = (page: string, which: "back" | "front") => { const css = `<style>${which === "back" ? ".cue:not(.fx-behind)" : ".cue.fx-behind"}{display:none!important}</style>`; const at = page.toLowerCase().lastIndexOf("</head>"); return at > 0 ? page.slice(0, at) + css + page.slice(at) : css + page; };

/** «3D حقيقي»: the saved page only marks where the 3D library goes; for the studio preview it is loaded from the site's own copy */
export const injectLibs = (html: string, origin: string) => String(html).replace(/<script\b[^>]*\bdata-lib\s*=\s*["']?three["']?[^>]*>\s*<\/script>/gi, () => `<script src="${origin}/vendor/three.min.js"></script>`);
