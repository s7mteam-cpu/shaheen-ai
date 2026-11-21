// Helpers for «original HTML» templates (kept exactly as Gemini made them). Pure functions, no network.
// Texts are the visible text pieces between tags; colours are the #rrggbb values used in the page. Both can be swapped before showing/recording.
const TEXT_RE = />([^<>]{1,400})</g;
const HEX_RE = /#[0-9a-fA-F]{6}\b/g;

const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, (m) => "<script></script>".padEnd(m.length, " ")).replace(/<style[\s\S]*?<\/style>/gi, (m) => "<style></style>".padEnd(m.length, " "));
const dec = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
const enc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const AR = /[\u0600-\u06FF]/;
const ATTR_RE = /\b(alt|title|placeholder|aria-label|data-[\w-]+)=("([^"<>]{2,200})"|'([^'<>]{2,200})')/gi;
const SCRIPT_RE = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const STR_RE = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
const unesc = (s) => s.replace(/\\n/g, " ").replace(/\\(["'`\\])/g, "$1");
const escq = (s, q) => String(s).replace(/\\/g, "\\\\").replace(/\r?\n/g, " ").split(q).join("\\" + q).replace(q === "`" ? /\$\{/g : /$^/g, "\\${").replace(/</g, "\\x3C");

/** unique visible texts in order of appearance: [{key:"t0", label, value}]. Order: text between tags, then Arabic attribute values, then Arabic string literals inside <script> (designs that write their words from JavaScript). */
export function extractTexts(html, max = 60) {
  const seen = new Set(), out = [];
  const add = (raw) => {
    const v = dec(raw).replace(/\s+/g, " ").trim();
    if (v.length < 2 || v.length > 160 || !/[\p{L}\p{N}]/u.test(v) || seen.has(v)) return;
    seen.add(v); out.push({ key: `t${out.length}`, label: v.slice(0, 40), value: v });
  };
  for (const m of strip(html).matchAll(TEXT_RE)) { add(m[1]); if (out.length >= max) return out; }
  for (const m of html.matchAll(ATTR_RE)) { const v = m[3] ?? m[4] ?? ""; if (AR.test(v)) add(v); if (out.length >= max) return out; }
  for (const sc of html.matchAll(SCRIPT_RE)) for (const m of sc[1].matchAll(STR_RE)) { const v = unesc(m[2]); if (AR.test(v) && !/\$\{/.test(v) && !/[{}<>=;]/.test(v)) add(v); if (out.length >= max) return out; }
  return out;
}

/** colours by how often they appear (most used first) */
export function extractColors(html, max = 8) {
  const n = new Map();
  for (const m of html.matchAll(HEX_RE)) { const c = m[0].toLowerCase(); n.set(c, (n.get(c) ?? 0) + 1); }
  return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([hex]) => hex);
}

/** texts: {key: newValue} (keys from extractTexts of the ORIGINAL), hex: {"#aabbcc": "#112233"}. Only changed pieces are touched. */
export function applyEdits(html, { texts = {}, hex = {} } = {}) {
  let out = html;
  const orig = extractTexts(html, 200), map = new Map();
  for (const f of orig) { const nv = texts[f.key]; if (typeof nv === "string" && nv !== f.value) map.set(f.value, nv.slice(0, 300)); }
  if (map.size) {
    const safe = strip(html);
    let res = "", last = 0;
    for (const m of safe.matchAll(TEXT_RE)) {
      const v = dec(m[1]).replace(/\s+/g, " ").trim();
      if (!map.has(v)) continue;
      const start = m.index + 1, end = start + m[1].length; // position of the text inside "> … <"
      res += out.slice(last, start) + m[1].replace(m[1].trim(), enc(map.get(v))); last = end;
    }
    out = res + out.slice(last);
  }
  if (map.size) {
    out = out.replace(ATTR_RE, (all, name, quoted, d, sq) => { const v = dec(d ?? sq ?? "").replace(/\s+/g, " ").trim(); return map.has(v) ? `${name}="${enc(map.get(v)).replace(/"/g, "&quot;")}"` : all; });
    out = out.replace(SCRIPT_RE, (all, body) => all.replace(body, body.replace(STR_RE, (lit, q, inner) => { const v = unesc(inner); return map.has(v) ? q + escq(map.get(v), q) + q : lit; })));
  }
  for (const [from, to] of Object.entries(hex)) if (/^#[0-9a-f]{6}$/i.test(from) && /^#[0-9a-f]{6}$/i.test(to) && from.toLowerCase() !== to.toLowerCase()) out = out.replace(new RegExp(from, "gi"), to);
  return out;
}

import { FONT_IDS } from "./fontlib.mjs";
// longest names first so "Cairo Play" is never mistaken for "Cairo"
const FONT_NAMES = [...FONT_IDS].sort((a, b) => b.length - a.length);
/** the first font family the page asks for (only the library fonts the platform embeds count) */
export function currentFont(html) {
  const m = html.match(/font-family\s*:\s*([^;}]*)/i);
  const hit = m ? FONT_NAMES.find((f) => new RegExp(`\\b${f}\\b`, "i").test(m[1])) : undefined;
  return hit ?? "Cairo";
}
/** switch every use of the page's current font to another embedded font */
export function applyFont(html, to) {
  if (!FONT_NAMES.includes(to)) return html;
  const from = currentFont(html);
  if (from === to) return html;
  return html.replace(/font-family\s*:\s*([^;}]*)/gi, (all, v) => (new RegExp(`\\b${from}\\b`, "i").test(v) ? all.replace(new RegExp(`\\b${from}\\b`, "gi"), to) : all));
}

/** put (or remove, when logo is null) the customer's logo on top of the page. box = centre x,y and width as fractions of the frame. Any earlier logo is replaced. */
export function applyLogo(html, logo) {
  const clean = html.replace(/<img id="__shlogo"[^>]*>/gi, "");
  if (!logo) return clean;
  const c = (v, a, b) => Math.min(b, Math.max(a, Number(v) || a));
  const tag = `<img id="__shlogo" alt="" src="${logo.src.replace(/"/g, "")}" style="position:fixed;left:${(c(logo.x, 0.03, 0.97) * 100).toFixed(2)}%;top:${(c(logo.y, 0.03, 0.97) * 100).toFixed(2)}%;width:${(c(logo.w, 0.06, 0.7) * 100).toFixed(2)}%;height:auto;transform:translate(-50%,-50%);z-index:2147483000;pointer-events:none;object-fit:contain">`;
  return /<\/body>/i.test(clean) ? clean.replace(/<\/body>/i, tag + "</body>") : clean + tag;
}

const SEL_RE = /^body(?: > :nth-child\(\d{1,3}\)){1,30}$/;
/** element edits made by clicking in the studio: only a strict structural path and clamped numbers get through */
export function cleanEls(list) {
  const out = [];
  const n = (v, d, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Number(v) : d));
  for (const e of Array.isArray(list) ? list.slice(0, 40) : []) {
    const o = e ?? {};
    if (typeof o.sel !== "string" || !SEL_RE.test(o.sel)) continue;
    out.push({ sel: o.sel, hide: o.hide === true, s: Math.round(n(o.s, 1, 0.3, 3) * 100) / 100, x: Math.round(n(o.x, 0, -2000, 2000)), y: Math.round(n(o.y, 0, -2000, 2000)) });
  }
  return out;
}
/** hide / move / resize the chosen elements with one style block (the page's own animations keep running: translate and scale are separate from transform) */
export function applyEls(html, list) {
  const els = cleanEls(list);
  if (!els.length) return html;
  const css = els.map((e) => (e.hide ? `${e.sel}{visibility:hidden !important}` : `${e.sel}{translate:${e.x}px ${e.y}px !important;scale:${e.s} !important}`)).join("");
  const tag = `<style data-shel="1">${css}</style>`;
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, tag + "</head>") : /<body[^>]*>/i.test(html) ? html.replace(/<\/body>/i, tag + "</body>") : tag + html;
}

export const looksHtml = (s) => /<(!doctype html|html|body|div|svg|style|script)\b/i.test(s) && !/export\s+(const|function)\s+Free\b/.test(s);
