// Helpers for «original HTML» templates (kept exactly as Gemini made them). Pure functions, no network.
// Texts are the visible text pieces between tags; colours are the #rrggbb values used in the page. Both can be swapped before showing/recording.
const TEXT_RE = />([^<>]{1,400})</g;
const HEX_RE = /#[0-9a-fA-F]{6}\b/g;

const strip = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, (m) => "<script></script>".padEnd(m.length, " ")).replace(/<style[\s\S]*?<\/style>/gi, (m) => "<style></style>".padEnd(m.length, " "));
const dec = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
const enc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** unique visible texts in order of appearance: [{key:"t0", label, value}] */
export function extractTexts(html, max = 60) {
  const seen = new Set(), out = [];
  for (const m of strip(html).matchAll(TEXT_RE)) {
    const v = dec(m[1]).replace(/\s+/g, " ").trim();
    if (v.length < 2 || v.length > 160 || !/[\p{L}\p{N}]/u.test(v) || seen.has(v)) continue;
    seen.add(v); out.push({ key: `t${out.length}`, label: v.slice(0, 40), value: v });
    if (out.length >= max) break;
  }
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
  for (const [from, to] of Object.entries(hex)) if (/^#[0-9a-f]{6}$/i.test(from) && /^#[0-9a-f]{6}$/i.test(to) && from.toLowerCase() !== to.toLowerCase()) out = out.replace(new RegExp(from, "gi"), to);
  return out;
}

export const looksHtml = (s) => /<(!doctype html|html|body|div|svg|style|script)\b/i.test(s) && !/export\s+(const|function)\s+Free\b/.test(s);
