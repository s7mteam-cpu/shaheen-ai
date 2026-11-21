// Makes an «original HTML» design work with NO internet: designs from Gemini usually load Tailwind (and fonts) from a CDN.
// We remove those links, compile the Tailwind classes used by the page ourselves, and put the CSS inside the page.
import postcss from "postcss";
import tailwindcss from "tailwindcss";

// SECURITY: the page comes from an AI model (or an upload), so nothing written in it may ever run on this server.
// `tailwind.config = {...}` is therefore READ AS DATA by the small parser below (objects, arrays, strings, numbers, true/false/null).
// It is never evaluated: a config containing a function, a call, a template or any expression is ignored whole.
// (It used to go through node:vm, which is not a security boundary: a function in the config was called by Tailwind with real server objects.)
const FORBIDDEN_KEY = new Set(["__proto__", "constructor", "prototype"]);
const ALLOWED_TOP = new Set(["theme", "darkMode", "important", "prefix", "separator"]); // no plugins / presets / content / safelist functions

function parseLiteral(src) {
  let i = 0; let nodes = 0;
  const ws = () => { for (;;) { while (i < src.length && /\s/.test(src[i])) i++; if (src.startsWith("//", i)) { const e = src.indexOf("\n", i); i = e < 0 ? src.length : e; } else if (src.startsWith("/*", i)) { const e = src.indexOf("*/", i + 2); if (e < 0) throw new Error("comment"); i = e + 2; } else return; } };
  const str = () => {
    const q = src[i++]; let out = "";
    for (;;) {
      if (i >= src.length) throw new Error("string");
      const c = src[i++];
      if (c === q) return out;
      if (c === "\n") throw new Error("string");
      if (c === "\\") { const n = src[i++]; out += n === "n" ? "\n" : n === "t" ? "\t" : n === "\\" || n === "'" || n === '"' ? n : (() => { throw new Error("escape"); })(); }
      else out += c;
    }
  };
  const value = (depth) => {
    if (depth > 12 || ++nodes > 4000) throw new Error("too big");
    ws();
    const c = src[i];
    if (c === "{") {
      i++; const o = Object.create(null);
      for (;;) {
        ws(); if (src[i] === "}") { i++; break; }
        let k;
        if (src[i] === '"' || src[i] === "'") k = str();
        else { const m = /^[A-Za-z_$][\w$-]*|^\d+(?:\.\d+)?/.exec(src.slice(i, i + 80)); if (!m) throw new Error("key"); k = m[0]; i += k.length; }
        if (FORBIDDEN_KEY.has(k)) throw new Error("key");
        ws(); if (src[i++] !== ":") throw new Error("colon");
        o[k] = value(depth + 1);
        ws(); if (src[i] === ",") { i++; continue; }
        if (src[i] === "}") { i++; break; }
        throw new Error("object");
      }
      return o;
    }
    if (c === "[") {
      i++; const arr = [];
      for (;;) {
        ws(); if (src[i] === "]") { i++; break; }
        arr.push(value(depth + 1));
        ws(); if (src[i] === ",") { i++; continue; }
        if (src[i] === "]") { i++; break; }
        throw new Error("array");
      }
      return arr;
    }
    if (c === '"' || c === "'") return str();
    const m = /^(?:-?\d+(?:\.\d+)?|true|false|null)(?![\w$.(\[`])/.exec(src.slice(i, i + 40));
    if (!m) throw new Error("value"); // identifiers, functions, calls, templates, spreads, operators: not data
    i += m[0].length;
    return m[0] === "true" ? true : m[0] === "false" ? false : m[0] === "null" ? null : Number(m[0]);
  };
  const v = value(0); ws();
  if (i < src.length) throw new Error("trailing");
  return v;
}
/** plain objects again (the parser builds prototype-less ones), limited to the keys a design may set */
function plain(v) { return Array.isArray(v) ? v.map(plain) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)])) : v; }

/** the object written after `tailwind.config =` (balanced braces), read as data only */
export function readConfig(html) {
  const m = /tailwind\.config\s*=\s*\{/.exec(html);
  if (!m) return {};
  let i = m.index + m[0].length - 1, depth = 0, str = "", q = "";
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (q) { if (c === "\\") j++; else if (c === q) q = ""; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { str = html.slice(i, j + 1); break; } }
  }
  if (!str || str.length > 20_000) return {};
  try {
    const all = plain(parseLiteral(str));
    return Object.fromEntries(Object.entries(all).filter(([k]) => ALLOWED_TOP.has(k)));
  } catch { return {}; }
}

/** returns {html, notes}: html with Tailwind compiled in and the CDN links removed; notes: what still cannot load */
export async function prepareHtml(html) {
  const notes = [];
  let out = html;
  const usesTw = /cdn\.tailwindcss\.com|tailwind\.config|<style[^>]*type=["']text\/tailwindcss["']/i.test(html);
  if (usesTw) {
    const config = readConfig(html);
    const custom = [...html.matchAll(/<style[^>]*type=["']text\/tailwindcss["'][^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n")
      .replace(/@(?:config|plugin|import|source|reference)\b[^;{}]*;?/gi, ""); // these directives make Tailwind load files or code from this server's disk
    out = out.replace(/<script[^>]*src=["'][^"']*cdn\.tailwindcss\.com[^"']*["'][^>]*>\s*<\/script>/gi, "");
    const css = `@tailwind base;@tailwind components;@tailwind utilities;\n${custom}`;
    const res = await postcss([tailwindcss({ ...config, content: [{ raw: html, extension: "html" }], corePlugins: { preflight: true } })]).process(css, { from: undefined });
    const stub = `<script>window.tailwind={config:{}};</script><style>${res.css}</style>`;
    out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, (m) => m + stub) : stub + out;
    notes.push("حمّلنا Tailwind عندنا (بدون إنترنت) وطبّقنا تنسيقاته.");
  }
  // google fonts links cannot load: fonts are embedded (Cairo, Tajawal, Almarai, Changa, Amiri)
  out = out.replace(/<link[^>]*href=["']https?:\/\/fonts\.(googleapis|gstatic)\.com[^>]*>/gi, "").replace(/@import\s+url\(["']?https?:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/gi, "");
  const ext = new Set();
  for (const m of out.matchAll(/<(?:script|link|img|source|video|audio|iframe)[^>]*\s(?:src|href)=["'](https?:)?\/\/([^"'/]+)[^"']*["']/gi)) ext.add(m[2]);
  for (const m of out.matchAll(/url\(["']?https?:\/\/([^"')/]+)/gi)) ext.add(m[1]);
  if (ext.size) notes.push(`⚠️ التصميم يعتمد على مصادر من الإنترنت ما تشتغل عندنا: ${[...ext].slice(0, 5).join("، ")}. اطلب من جيميناي نسخة مستقلة بدون روابط خارجية.`);
  return { html: out, notes };
}
