// The asset broker: the video itself has no network. When the designer needs a symbol it did not draw, it lists
// what it needs ("linkedin logo", "rocket", "grinning face") and THIS server-side library finds it in bundled icon sets
// (no internet involved at all) and hands it over as an inline picture.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// order = priority for each style; every set is open-licensed (CC0 / MIT / Apache / ISC)
const SETS = {
  brand: ["simple-icons"],
  line: ["lucide", "tabler", "ph"],
  solid: ["mdi", "ph", "tabler", "lucide"],
  color: ["fluent-emoji-flat"],
};
const MONO = new Set(["simple-icons", "lucide", "tabler", "ph", "mdi"]);
const cache = new Map();
function load(prefix) {
  if (cache.has(prefix)) return cache.get(prefix);
  let set = null;
  try {
    const j = require(`@iconify-json/${prefix}/icons.json`);
    const names = Object.keys(j.icons);
    const alias = j.aliases ?? {};
    set = { prefix, j, names, all: [...names, ...Object.keys(alias)], tokens: new Map() };
  } catch { set = null; }
  cache.set(prefix, set);
  return set;
}
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function score(name, q, toks) {
  const n = name.toLowerCase(), nt = n.split(/[-_]/);
  if (n === q.replace(/ /g, "-")) return 100;
  if (toks.every((t) => nt.includes(t))) return 80 - Math.min(20, nt.length - toks.length);   // all words are whole parts of the name; shorter names first
  if (toks.every((t) => n.includes(t))) return 50 - Math.min(20, n.length - q.length);
  return 0;
}
function find(query, style) {
  const q = norm(query); if (!q) return null;
  const toks = q.split(" ").filter(Boolean);
  // the asked style first, then every other set as a last resort
  const chain = [...new Set([...(SETS[style] ?? SETS.line), ...SETS.line, ...SETS.solid, ...SETS.brand, ...SETS.color])];
  for (const prefix of chain) {
    const set = load(prefix); if (!set) continue;
    let best = null, bs = 0;
    for (const name of set.all) { const s = score(name, q, toks); if (s > bs) { bs = s; best = name; } }
    if (best && bs >= 50) return { set, name: best };
  }
  return null;
}
function resolve(set, name) {
  let ic = set.j.icons[name];
  let n = name;
  for (let h = 0; !ic && h < 3; h++) { const a = set.j.aliases?.[n]; if (!a) break; n = a.parent; ic = set.j.icons[n]; }
  return ic ? { ...ic, width: ic.width ?? set.j.width ?? 24, height: ic.height ?? set.j.height ?? 24 } : null;
}
const clean = (svg) => svg.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "").replace(/(href|xlink:href)="(?!#)[^"]*"/gi, "");

/** requests: [{ key, query, style }]  ->  { key: { src, mono, name } }  (src is a data: URL; only keys that were found are returned) */
export function resolveAssets(requests, { max = 14 } = {}) {
  const out = {};
  for (const r of (Array.isArray(requests) ? requests : []).slice(0, max)) {
    const key = String(r?.key ?? "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 40);
    if (!key || out[key]) continue;
    const style = ["brand", "line", "solid", "color"].includes(r?.style) ? r.style : "line";
    const hit = find(String(r?.query ?? "").slice(0, 60), style);
    if (!hit) continue;
    const ic = resolve(hit.set, hit.name); if (!ic) continue;
    const svg = clean(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ic.width} ${ic.height}" width="${ic.width}" height="${ic.height}">${ic.body}</svg>`);
    if (svg.length > 60_000) continue;
    out[key] = { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, mono: MONO.has(hit.set.prefix), name: `${hit.set.prefix}:${hit.name}` };
  }
  return out;
}
