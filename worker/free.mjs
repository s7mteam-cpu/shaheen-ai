// «تصميم مبتكر»: motion graphics written by the AI as React code, rendered in a locked-down way.
// The code never runs in Node: it is only bundled, then runs inside the headless browser page of the render, whose
// Content-Security-Policy (injected into the bundle's index.html) forbids every network request, eval and frames.
// Layers: 1) static check (allowed imports, no network/eval words)  2) CSP in the page  3) time limit  4) caller falls back to the ready templates.
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

export const MAX_CODE = 45_000;
const BAD = [
  [/\bimport\s*\(/, "dynamic import"], [/\brequire\s*\(/, "require"], [/\beval\b/, "eval"], [/\bnew\s+Function\b|\bFunction\s*\(/, "Function"],
  [/\bfetch\b/, "fetch"], [/XMLHttpRequest/, "XHR"], [/\bWebSocket\b|EventSource|sendBeacon|\bWorker\b|SharedWorker|serviceWorker/, "network/worker"],
  [/\bdocument\s*\.\s*(cookie|domain|write|location)|localStorage|sessionStorage|indexedDB/, "storage/document"], [/\bwindow\s*\.\s*(open|location|top|parent|opener)|\blocation\s*[.=]|\bparent\s*\.|\btop\s*\./, "navigation"],
  [/<\s*(script|iframe|form|object|embed|link|meta|base)\b/i, "tag"], [/dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacent|createElement\s*\(\s*['"`](script|iframe|link|form)/i, "html injection"],
  [/import\.meta|\bprocess\b|globalThis|\[\s*['"`](fetch|eval|location|document|window)['"`]\s*\]/, "global access"], [/\bnew\s+Image\b|\bAudio\s*\(|\bnew\s+Audio\b/, "image/audio constructor"],
  [/https?:\/\//i, "url"], [/@import|url\s*\(\s*['"]?\s*(https?:|\/\/)/i, "css import"],
];
const OK_IMPORT = new Set(["react", "remotion", "./brand"]);

/** Returns "" when the code is acceptable, otherwise the reason. */
export function checkFreeCode(code) {
  const c = String(code ?? "").replace(/http:\/\/www\.w3\.org\/\d+\/\w+/g, ""); // the svg namespace is not a link
  if (c.length < 200 || c.length > MAX_CODE) return "size";
  for (const [re, why] of BAD) if (re.test(c)) return why;
  for (const m of c.matchAll(/(?:^|\n)\s*import\s+[^;'"]*?from\s*['"]([^'"]+)['"]/g)) if (!OK_IMPORT.has(m[1])) return `import ${m[1]}`;
  if ((c.match(/\bimport\b/g) ?? []).length !== [...c.matchAll(/(?:^|\n)\s*import\s+[^;'"]*?from\s*['"][^'"]+['"]/g)].length) return "odd import";
  if (!/export\s+(const|function)\s+Free\b|export\s+default/.test(c)) return "no Free component";
  return "";
}

const CSP = (media) => `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: ${media}; media-src 'self' data: blob: ${media}; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;

/** Bundles the code once (CSP injected) and gives back render helpers: a check still, the full video, and a cleanup. */
export async function prepareFree({ code, width, height, fps = 30, seconds, workDir, brandFile, fontCss = [], mediaOrigin = "", browserExecutable, timeoutMs = 240_000, unsafeSkipCheckForTests = false }) {
  const why = unsafeSkipCheckForTests ? "" : checkFreeCode(code);
  if (why) throw new Error(`unsafe code: ${why}`);
  const dir = fs.mkdtempSync(path.join(workDir, "free-"));
  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });
  try {
    fs.writeFileSync(path.join(dir, "Free.tsx"), code);
    fs.writeFileSync(path.join(dir, "brand.ts"), fs.readFileSync(brandFile, "utf8"));
    fs.writeFileSync(path.join(dir, "index.tsx"), `import React from "react";
import { Composition, registerRoot } from "remotion";
${fontCss.map((f) => `import "${f}";`).join("\n")}
import * as M from "./Free";
const C = (M as any).Free ?? (M as any).default;
registerRoot(() => <Composition id="Free" component={C} durationInFrames={${Math.round(seconds * fps)}} fps={${fps}} width={${width}} height={${height}} defaultProps={{}} />);
`);
    const serveUrl = await bundle({ entryPoint: path.join(dir, "index.tsx"), outDir: path.join(dir, "out") });
    const idx = path.join(dir, "out", "index.html");
    const html = fs.readFileSync(idx, "utf8").replace(/<head>/i, `<head><meta http-equiv="Content-Security-Policy" content="${CSP(mediaOrigin).replace(/"/g, "&quot;")}">`);
    fs.writeFileSync(idx, html);
    const o = { chromiumOptions: { gl: "swangle" }, ...(browserExecutable ? { browserExecutable } : {}), timeoutInMilliseconds: timeoutMs };
    const comp = (props) => selectComposition({ serveUrl, id: "Free", inputProps: props, ...o });
    return {
      cleanup,
      async still(props, frame, out) { await renderStill({ composition: await comp(props), serveUrl, frame, output: out, inputProps: props, imageFormat: "png", ...o }); },
      async video(props, out, onProgress) {
        await renderMedia({ composition: await comp(props), serveUrl, codec: "h264", crf: 22, x264Preset: "veryfast", outputLocation: out, inputProps: props, concurrency: Number(process.env.RENDER_CONCURRENCY) || null, onProgress: onProgress ? ({ progress }) => onProgress(progress) : undefined, ...o });
      },
    };
  } catch (e) { cleanup(); throw e; }
}
