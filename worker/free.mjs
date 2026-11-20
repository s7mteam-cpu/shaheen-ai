// «تصميم مبتكر»: motion graphics written by the AI as React code, rendered in a locked-down way.
// The code never runs in Node: it is only bundled, then runs inside the headless browser page of the render, whose
// Content-Security-Policy (injected into the bundle's index.html) forbids every network request, eval and frames.
// Layers: 1) static check (allowed imports, no network/eval words)  2) CSP in the page  3) time limit  4) caller falls back to the ready templates.
import { bundle } from "@remotion/bundler";
import { renderFrames, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_CODE = 45_000;
const BAD = [
  [/\bimport\s*\(/, "dynamic import"], [/\brequire\s*\(/, "require"], [/\beval\b/, "eval"], [/\bnew\s+Function\b|\bFunction\s*\(/, "Function"],
  [/\bfetch\b/, "fetch"], [/XMLHttpRequest/, "XHR"], [/\bWebSocket\b|EventSource|sendBeacon|\bWorker\b|SharedWorker|serviceWorker/, "network/worker"],
  [/\bdocument\s*\.\s*(cookie|domain|write|location)|localStorage|sessionStorage|indexedDB/, "storage/document"], [/\bwindow\s*\.\s*(open|location|top|parent|opener)|\blocation\s*[.=]|\bparent\s*\.|\btop\s*\./, "navigation"],
  [/<\s*(script|iframe|form|object|embed|link|meta|base)\b/i, "tag"], [/dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacent|createElement\s*\(\s*['"`](script|iframe|link|form)/i, "html injection"],
  [/import\.meta|\bprocess\b|globalThis|\[\s*['"`](fetch|eval|location|document|window)['"`]\s*\]/, "global access"], [/\bnew\s+Image\b|\bAudio\s*\(|\bnew\s+Audio\b/, "image/audio constructor"],
  // second ring: ways to reach the page's globals or run strings without the plain words above
  [/\b(window|document)\b(?!\s*\.\s*(innerWidth|innerHeight|devicePixelRatio|fonts)\b)/, "global object (window/document)"], [/\b(self|frames|history|navigator)\b/, "global object"],
  [/\.\s*constructor\b|\bconstructor\s*\[|["'`]constructor["'`]|__proto__|__lookup\w*|__define\w*|\bReflect\b|\bAsyncFunction\b|\bGeneratorFunction\b/, "prototype tricks"],
  [/\b(setTimeout|setInterval)\s*\(\s*["'`]/, "string timer"], [/javascript\s*:/i, "javascript url"], [/(?:src|href|action|poster|xlinkHref)\s*=\s*[{"'`\s]*["'`]?\s*\/\/[\w.-]/i, "protocol-relative url"], [/["'`]\s*\/\/[\w-]+\.[a-z]{2,}/i, "protocol-relative url"],
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

/** The TSX of the host: plays every chapter (an AI-written component each) one after another and lays the customer's logo above them.
 *  Chapter k starts when its first narration sentence (b0) starts, so the picture follows the voice. Shared by the render and the live preview. */
export function hostTsx(chapters) {
  return `import React from "react";
import { Sequence } from "remotion";
${chapters.map((_, i) => `import * as M${i} from "./Free${i}";`).join("\n")}
class Guard extends React.Component<any, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  componentDidCatch(e: any) { try { console.error("free chapter error #" + (this.props as any).i + ": " + String(e && e.message || e).slice(0, 200)); } catch {} }
  render() { return this.state.bad ? null : (this.props as any).children; }
}
const FS: any[] = [${chapters.map((_, i) => `(M${i} as any).Free ?? (M${i} as any).default`).join(", ")}];
const B0: number[] = ${JSON.stringify(chapters.map((c) => c.b0 ?? 0))};
const N = B0.length;
function layout(p: any) {
  const total = Math.round((p.seconds || 15) * 30);
  const beats = p.beats || [];
  const starts = B0.map((b, i) => (i === 0 ? 0 : beats.length ? Math.round(beats[Math.min(b, beats.length - 1)].start * 30) : Math.round((i * total) / N)));
  return starts.map((s, i) => ({ from: s, frames: Math.max(30, (i < N - 1 ? starts[i + 1] : total) - s) }));
}
export const Host = (p: any) => {
  const L = layout(p);
  return (<>
    {L.map((c, i) => {
      const F = FS[i];
      const t = N === 1 ? p.t : Object.fromEntries(Object.entries(p.t || {}).filter(([k]) => k.startsWith("c" + i + "_")).map(([k, v]) => [k.slice(("c" + i + "_").length), v]));
      const assets = N === 1 ? p.assets : Object.fromEntries(Object.entries(p.assets || {}).filter(([k]) => k.startsWith("c" + i + "_")).map(([k, v]) => [k.slice(("c" + i + "_").length), v]));
      const beats = (p.beats || []).slice(B0[i], i < N - 1 ? B0[i + 1] : undefined).map((b: any) => ({ ...b, start: +(b.start - c.from / 30).toFixed(2), end: +(b.end - c.from / 30).toFixed(2) }));
      return <Sequence key={i} from={c.from} durationInFrames={c.frames}><Guard i={i}><F {...p} t={t} assets={assets || {}} beats={beats} seconds={c.frames / 30} /></Guard></Sequence>;
    })}
    {p.logoOn && p.logo ? <img src={p.logo} style={{ position: "absolute", left: (p.logoBox?.x ?? 0.85) * 100 + "%", top: (p.logoBox?.y ?? 0.09) * 100 + "%", width: (p.logoBox?.w ?? 0.18) * 100 + "%", transform: "translate(-50%, -50%)", objectFit: "contain" }} /> : null}
  </>);
};
`;
}

const CSP = (media) => `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: ${media}; media-src 'self' data: blob: ${media}; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;

/** Bundles the code once (CSP injected) and gives back render helpers: a check still, the full video, and a cleanup. */
/** The AI's code gets crash-proof versions of Sequence and interpolate (a negative or NaN duration, or a range that is not increasing, would otherwise blank the whole picture). */
export const SAFE_TSX = `import React from "react";
import { Sequence as S, interpolate as I } from "remotion";
export const Sequence: any = (p: any) => {
  const d = p.durationInFrames;
  const dur = d == null || d === Infinity ? d : Number.isFinite(d) ? Math.max(1, Math.round(d)) : 1;
  return <S {...p} from={Number.isFinite(p.from) ? Math.round(p.from) : 0} durationInFrames={dur} />;
};
export const interpolate: any = (x: number, inR: number[], outR: any[], o?: any) => {
  try { return (I as any)(x, inR, outR, o); } catch {
    try { return (I as any)(x, inR.map((v, i) => (i === 0 ? v : Math.max(v, inR[i - 1] + 0.001))), outR, o); } catch { return outR[outR.length - 1]; }
  }
};
`;
export function safeChapter(code) {
  return String(code).replace(/import\s*\{([^}]*)\}\s*from\s*["']remotion["'];?/g, (m, names) => {
    const list = names.split(",").map((x) => x.trim()).filter(Boolean);
    const safe = list.filter((n) => /^(Sequence|interpolate)(\s+as\s+\w+)?$/.test(n));
    if (!safe.length) return m;
    const rest = list.filter((n) => !safe.includes(n));
    return (rest.length ? `import { ${rest.join(", ")} } from "remotion";\n` : "") + `import { ${safe.join(", ")} } from "./safe";`;
  });
}

/** brand.ts for a render/preview: the brand + social icons file, plus the bundled general icon set (Icon, ICON_NAMES). */
export function writeBrand(dir, brandFile) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  fs.writeFileSync(path.join(dir, "brand.ts"), fs.readFileSync(brandFile, "utf8") + '\nexport * from "./icons";\n');
  fs.copyFileSync(path.join(here, "icons.tsx"), path.join(dir, "icons.tsx"));
}

export async function prepareFree({ code, chapters, width, height, fps = 30, seconds, workDir, brandFile, fontCss = [], mediaOrigin = "", browserExecutable, timeoutMs = 240_000, unsafeSkipCheckForTests = false }) {
  const chs = chapters?.length ? chapters : [{ code, b0: 0 }];
  for (const c of chs) { const why = unsafeSkipCheckForTests ? "" : checkFreeCode(c.code); if (why) throw new Error(`unsafe code: ${why}`); }
  const dir = fs.mkdtempSync(path.join(workDir, "free-"));
  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });
  try {
    chs.forEach((c, i) => fs.writeFileSync(path.join(dir, `Free${i}.tsx`), safeChapter(c.code)));
    fs.writeFileSync(path.join(dir, "safe.tsx"), SAFE_TSX);
    writeBrand(dir, brandFile);
    fs.writeFileSync(path.join(dir, "host.tsx"), hostTsx(chs));
    fs.writeFileSync(path.join(dir, "index.tsx"), `import React from "react";
import { Composition, registerRoot } from "remotion";
${fontCss.map((f) => `import "${f}";`).join("\n")}
import { Host as C } from "./host";
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
      /** Plays the picture frame after frame on ONE page (like the real render and the live preview) and collects chapter crashes that a single still never shows (e.g. React hooks called in a different order). Returns [[chapterIndex, message]]. */
      async scrub(props, step = 15) {
        const found = new Map();
        const outputDir = fs.mkdtempSync(path.join(dir, "scrub-"));
        try {
          await renderFrames({ composition: await comp(props), serveUrl, inputProps: props, imageFormat: "jpeg", jpegQuality: 30, scale: 0.2, concurrency: 1, everyNthFrame: step, outputDir, onStart: () => {}, onFrameUpdate: () => {},
            onBrowserLog: (l) => { const m = /free chapter error #(\d+): (.*)/.exec(String(l?.text ?? "")); if (m && !found.has(+m[1])) found.set(+m[1], m[2]); }, ...o });
        } finally { fs.rmSync(outputDir, { recursive: true, force: true }); }
        return [...found.entries()];
      },
      async video(props, out, onProgress) {
        await renderMedia({ composition: await comp(props), serveUrl, codec: "h264", crf: 22, x264Preset: "veryfast", outputLocation: out, inputProps: props, concurrency: Number(process.env.RENDER_CONCURRENCY) || null, onProgress: onProgress ? ({ progress }) => onProgress(progress) : undefined, ...o });
      },
    };
  } catch (e) { cleanup(); throw e; }
}
