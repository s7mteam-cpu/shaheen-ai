// Makes an «original HTML» design work with NO internet: designs from Gemini usually load Tailwind (and fonts) from a CDN.
// We remove those links, compile the Tailwind classes used by the page ourselves, and put the CSS inside the page.
import vm from "node:vm";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

const BAD_CFG = /\b(constructor|process|require|import|eval|Function|globalThis|global|this|__proto__|prototype|window|document|fetch)\b/;

/** the object written after `tailwind.config =` (balanced braces), evaluated with no access to anything */
function readConfig(html) {
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
  if (!str || str.length > 20_000 || BAD_CFG.test(str.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""'))) return {};
  try { return vm.runInNewContext(`(${str})`, Object.create(null), { timeout: 200 }) ?? {}; } catch { return {}; }
}

/** returns {html, notes}: html with Tailwind compiled in and the CDN links removed; notes: what still cannot load */
export async function prepareHtml(html) {
  const notes = [];
  let out = html;
  const usesTw = /cdn\.tailwindcss\.com|tailwind\.config|<style[^>]*type=["']text\/tailwindcss["']/i.test(html);
  if (usesTw) {
    const config = readConfig(html);
    const custom = [...html.matchAll(/<style[^>]*type=["']text\/tailwindcss["'][^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
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
