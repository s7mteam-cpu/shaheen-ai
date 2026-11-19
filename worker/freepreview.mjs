// Builds ONE self-contained HTML page that plays an AI-written design live (Remotion Player) inside a sandboxed iframe on the customer's page.
// The page has no network at all (CSP), runs in an opaque origin (sandbox without allow-same-origin) and only talks through postMessage.
import { build } from "esbuild";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
import { checkFreeCode, hostTsx } from "./free.mjs";

const ENTRY = `
import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { Host } from "./host";
const W = __W__, H = __H__;
const App = () => {
  const [props, setProps] = React.useState({ t: {}, colors: { bg: "#000", accent: "#fff", text: "#fff" }, font: "Cairo", contact: [], logo: "", beats: [], seconds: 15 });
  const ref = React.useRef(null);
  React.useEffect(() => {
    const on = (e) => {
      if (e.source !== window.parent) return;
      const m = e.data || {}; const pl = ref.current;
      if (m.type === "props" && m.props && typeof m.props === "object") setProps(m.props);
      else if (pl && m.type === "play") pl.play();
      else if (pl && m.type === "pause") pl.pause();
      else if (pl && m.type === "seek") pl.seekTo(Math.max(0, Math.round(+m.frame || 0)));
    };
    window.addEventListener("message", on);
    window.parent.postMessage({ type: "ready" }, "*");
    return () => window.removeEventListener("message", on);
  }, []);
  React.useEffect(() => {
    const pl = ref.current; if (!pl) return;
    const f = () => window.parent.postMessage({ type: "frame", frame: pl.getCurrentFrame() }, "*");
    const p = () => window.parent.postMessage({ type: "state", playing: true }, "*");
    const s = () => window.parent.postMessage({ type: "state", playing: false }, "*");
    pl.addEventListener("frameupdate", (e) => window.parent.postMessage({ type: "frame", frame: e.detail.frame }, "*"));
    pl.addEventListener("play", p); pl.addEventListener("pause", s); pl.addEventListener("ended", s);
  }, []);
  return React.createElement(Player, { ref, component: Host, inputProps: props, durationInFrames: Math.max(30, Math.round((props.seconds || 15) * 30)), compositionWidth: W, compositionHeight: H, fps: 30, controls: false, numberOfSharedAudioTags: 0, loop: true, clickToPlay: false, acknowledgeRemotionLicense: true, style: { width: "100%", height: "100%" } });
};
createRoot(document.getElementById("root")).render(React.createElement(App));
`;

/** fonts: [{family, weight, file}] woff2 files embedded as data URLs. mediaOrigin: where the logo may be loaded from. */
export async function buildPreview({ code, chapters, width, height, brandFile, fonts = [], mediaOrigin = "" }) {
  const chs = chapters?.length ? chapters : [{ code, b0: 0 }];
  for (const c of chs) { const bad = checkFreeCode(c.code); if (bad) throw new Error(`preview: ${bad}`); }
  const dir = await mkdtemp(join(tmpdir(), "freeprev-"));
  try {
    for (const [i, c] of chs.entries()) await writeFile(join(dir, `Free${i}.tsx`), c.code);
    await writeFile(join(dir, "host.tsx"), hostTsx(chs));
    await copyFile(brandFile, join(dir, "brand.ts"));
    await writeFile(join(dir, "entry.tsx"), ENTRY.replace("__W__", String(width)).replace("__H__", String(height)));
    const out = await build({
      entryPoints: [join(dir, "entry.tsx")], bundle: true, write: false, format: "iife", platform: "browser", target: "es2020", minify: true, jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' }, absWorkingDir: dir, nodePaths: [join(here, "node_modules"), join(here, "..", "node_modules")], logLevel: "silent",
    });
    const js = out.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
    let css = "";
    for (const f of fonts) css += `@font-face{font-family:"${f.family}";font-weight:${f.weight};src:url(data:font/woff2;base64,${(await readFile(f.file)).toString("base64")}) format("woff2");}`;
    const csp = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob: ${mediaOrigin}; media-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
    return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}html,body,#root{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;
  } finally { await rm(dir, { recursive: true, force: true }); }
}
