// Records a self-contained HTML design (e.g. straight from Gemini) to an mp4, frame by frame, on a VIRTUAL clock:
// the page cannot reach any network, its timers / requestAnimationFrame / CSS animations advance exactly 1/30 s per frame,
// so the picture is the same as the original and never stutters even if this server is slow.
import { spawn } from "node:child_process";
import { openBrowser } from "@remotion/renderer";

const CLOCK = `(() => {
  let now = 0; const T0 = 1767225600000; let id = 1;
  const raf = new Map(), timers = new Map(); const RealDate = Date;
  performance.now = () => now;
  Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(T0 + now); } static now() { return T0 + now; } };
  window.requestAnimationFrame = (cb) => { raf.set(id, cb); return id++; };
  window.cancelAnimationFrame = (i) => { raf.delete(i); };
  window.setTimeout = (cb, ms = 0, ...a) => { timers.set(id, { cb, due: now + Math.max(0, +ms || 0), a, every: 0 }); return id++; };
  window.setInterval = (cb, ms = 0, ...a) => { const e = Math.max(1, +ms || 1); timers.set(id, { cb, due: now + e, a, every: e }); return id++; };
  window.clearTimeout = window.clearInterval = (i) => { timers.delete(i); };
  window.__step = (dt) => {
    const end = now + dt;
    for (let guard = 0; guard < 2000; guard++) {
      let best = null, bk = 0;
      for (const [k, t] of timers) if (t.due <= end && (!best || t.due < best.due)) { best = t; bk = k; }
      if (!best) break;
      now = Math.max(now, best.due);
      if (best.every) best.due += best.every; else timers.delete(bk);
      try { typeof best.cb === "function" && best.cb(...best.a); } catch (e) {}
    }
    now = end;
    const list = [...raf]; raf.clear();
    for (const [, cb] of list) { try { cb(now); } catch (e) {} }
    try { for (const a of document.getAnimations()) { if (a.__t0 === undefined) { a.__t0 = now - dt; a.pause(); } a.currentTime = now - a.__t0; } } catch (e) {}
  };
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; media-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
/** the page as the admin's sandboxed iframe plays it live: no network at all, fonts embedded */
export function htmlPreviewDoc(html, fontCss = "") {
  const head = `<meta http-equiv="Content-Security-Policy" content="${CSP}"><style>${fontCss}html,body{margin:0;overflow:hidden}</style>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + head) : `<!doctype html><html><head>${head}</head><body>${html}</body></html>`;
}
async function openHtmlPage({ html, width, height, fontCss, browserExecutable }) {
  const csp = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; media-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
  const head = `<meta http-equiv="Content-Security-Policy" content="${csp}"><style>${fontCss}html,body{margin:0;overflow:hidden}</style>`;
  const page0 = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + head) : `<!doctype html><html><head>${head}</head><body>${html}</body></html>`;
  const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions: {}, logLevel: "error", forceDeviceScaleFactor: 1 });
  try {
    const page = await browser.newPage({ context: { indent: false, logLevel: "error" }, logLevel: "error", indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {} });
    const cdp = page._client();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(CLOCK);
    await cdp.send("Network.enable");
    await cdp.send("Network.setBlockedURLs", { urls: ["http://*", "https://*", "ws://*", "wss://*", "ftp://*"] }).catch(() => {});
    await cdp.send("Page.enable");
    await cdp.send("Page.navigate", { url: "about:blank" }); await sleep(200);
    await page.evaluate((h) => { document.open(); document.write(h); document.close(); }, page0);
    await sleep(600); // fonts / first layout
    if (!(await page.evaluate(() => typeof window.__step === "function").catch(() => false))) throw new Error("page clock not installed");
    const step = (ms) => page.evaluate((dt) => window.__step(dt), ms);
    const shot = async (format = "jpeg", quality = 94) => { const r = await cdp.send("Page.captureScreenshot", { format, quality, fromSurface: true, captureBeyondViewport: false }); return Buffer.from((r.value ?? r).data, "base64"); };
    return { step, shot, browser };
  } catch (e) { try { await browser.close({ silent: true }); } catch {} throw e; }
}

/** stills at given seconds (PNG buffers), same clock as the recording */
export async function htmlStills({ html, width, height, times, fontCss = "", browserExecutable, fps = 30 }) {
  const { step, shot, browser } = await openHtmlPage({ html, width, height, fontCss, browserExecutable });
  try {
    const out = []; let t = 0;
    for (const sec of [...times].sort((a, b) => a - b)) {
      const target = Math.round(sec * fps);
      while (t < target) { await step(1000 / fps); t++; }
      out.push(await shot("png"));
    }
    return out;
  } finally { try { await browser.close({ silent: true }); } catch {} }
}

/** html: the whole page. fontCss: @font-face rules with data: urls (fonts cannot be downloaded). Returns {frames}. */
export async function recordHtml({ html, width, height, seconds, fps = 30, outFile, fontCss = "", browserExecutable, onProgress = () => {}, ffmpeg = "ffmpeg" }) {
  const { step, shot, browser } = await openHtmlPage({ html, width, height, fontCss, browserExecutable });
  let ff = null;
  try {
    const frames = Math.max(1, Math.round(seconds * fps));
    ff = spawn(ffmpeg, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outFile], { stdio: ["pipe", "ignore", "pipe"] });
    let ffErr = ""; ff.stderr.on("data", (d) => { ffErr += d; });
    const done = new Promise((res, rej) => { ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg: ${ffErr.slice(0, 300)}`)))); ff.on("error", rej); });
    ff.stdin.on("error", () => {}); done.catch(() => {});
    for (let i = 0; i < frames; i++) {
      await step(1000 / fps);
      if (!ff.stdin.write(await shot("jpeg", 94))) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 15 === 0) onProgress(i / frames);
    }
    ff.stdin.end(); await done; ff = null;
    return { frames };
  } finally { try { ff?.kill("SIGKILL"); } catch {} try { await browser.close({ silent: true }); } catch {} }
}
