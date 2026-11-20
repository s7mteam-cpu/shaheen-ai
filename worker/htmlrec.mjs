// Records a self-contained HTML design (e.g. straight from Gemini) to an mp4, frame by frame, on a VIRTUAL clock:
// the page cannot reach any network, its timers / requestAnimationFrame / CSS animations advance exactly 1/30 s per frame,
// so the picture is the same as the original and never stutters even if this server is slow.
import { spawn } from "node:child_process";
import { openBrowser } from "@remotion/renderer";

const CLOCK = `(() => {
  window.open = () => null; // no popups
  for (const ev of ["click", "auxclick", "submit"]) window.addEventListener(ev, (e) => { try { const el = e.target && e.target.closest ? e.target.closest("a,form,area") : null; if (el) el.removeAttribute("target"); } catch (x) {} }, true);
  try { Object.defineProperty(HTMLAnchorElement.prototype, "target", { get() { return "_self"; }, set() {} }); Object.defineProperty(HTMLFormElement.prototype, "target", { get() { return "_self"; }, set() {} }); } catch (x) {}
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
/** The page is laid out like on the preview (a phone-sized screen: 432 css px wide for portrait) and drawn at a higher pixel density,
 * so the video is exactly what the live preview shows (designs switch to their "mobile" layout on narrow screens). */
function layoutOf(width, height) {
  const baseW = height > width ? 432 : height === width ? 540 : 960;
  const scale = width / baseW;
  return { lw: baseW, lh: Math.round(height / scale), scale };
}
async function openHtmlPage({ html, width, height, fontCss, browserExecutable }) {
  const { lw, lh, scale } = layoutOf(width, height);
  const csp = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; media-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
  const head = `<meta http-equiv="Content-Security-Policy" content="${csp}"><style>${fontCss}html,body{margin:0;overflow:hidden}</style>`;
  const page0 = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + head) : `<!doctype html><html><head>${head}</head><body>${html}</body></html>`;
  const browser = await openBrowser("chrome", { browserExecutable, chromiumOptions: {}, logLevel: "error", forceDeviceScaleFactor: scale });
  try {
    const page = await browser.newPage({ context: { indent: false, logLevel: "error" }, logLevel: "error", indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {} });
    const cdp = page._client();
    await page.setViewport({ width: lw, height: lh, deviceScaleFactor: scale });
    await page.evaluateOnNewDocument(CLOCK);
    await cdp.send("Network.enable");
    await cdp.send("Network.setBlockedURLs", { urls: ["http://*", "https://*", "ws://*", "wss://*", "ftp://*"] }).catch(() => {});
    // every request and every navigation of this page must be data:/blob:/about: — anything else is refused before it leaves the browser
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    cdp.on("Fetch.requestPaused", async (ev) => {
      const e = ev?.params ?? ev; const url = String(e?.request?.url ?? "");
      try { if (/^(data:|blob:|about:)/i.test(url)) await cdp.send("Fetch.continueRequest", { requestId: e.requestId }); else await cdp.send("Fetch.failRequest", { requestId: e.requestId, errorReason: "BlockedByClient" }); } catch {}
    });
    // any new tab/window the page manages to open is closed at once
    await cdp.send("Target.setDiscoverTargets", { discover: true }).catch(() => {});
    cdp.on("Target.targetCreated", async (ev) => { const t = (ev?.params ?? ev)?.targetInfo; if (t && t.type === "page" && t.url && !/^about:blank$/.test(t.url)) { try { await cdp.send("Target.closeTarget", { targetId: t.targetId }); } catch {} } });
    await cdp.send("Page.enable");
    await cdp.send("Page.navigate", { url: "about:blank" }); await sleep(200);
    await page.evaluate((h) => { document.open(); document.write(h); document.close(); }, page0);
    await sleep(600); // fonts / first layout
    if (!(await page.evaluate(() => typeof window.__step === "function").catch(() => false))) throw new Error("page clock not installed");
    const step = (ms) => page.evaluate((dt) => window.__step(dt), ms);
    const shot = async (format = "jpeg", quality = 94, crop = null) => {
      const clip = crop ? { x: crop.x, y: crop.y, width: crop.w, height: crop.h, scale: width / crop.w } : undefined; // crop is in css px
      const r = await cdp.send("Page.captureScreenshot", { format, quality, fromSurface: true, captureBeyondViewport: false, ...(clip ? { clip } : {}) });
      return Buffer.from((r.value ?? r).data, "base64");
    };
    const evalIn = (fn, arg) => page.evaluate(fn, arg);
    return { step, shot, evalIn, browser };
  } catch (e) { try { await browser.close({ silent: true }); } catch {} throw e; }
}

/** Designs made for a desktop screen often draw a small phone frame in the middle of the page. Find it (the biggest box with the video's shape that is clearly smaller than the page) so only it is recorded, full size. */
export async function findCrop({ html, width, height, fontCss = "", browserExecutable, fps = 30 }) {
  const { lw, lh } = layoutOf(width, height);
  const { step, evalIn, browser } = await openHtmlPage({ html, width, height, fontCss, browserExecutable });
  try {
    for (let i = 0; i < 2 * fps; i++) await step(1000 / fps);
    const r = await evalIn(({ W, H }) => { // W,H: only the shape matters
      const vw = innerWidth, vh = innerHeight, target = W / H; let best = null;
      for (const el of document.querySelectorAll("body *")) {
        const b = el.getBoundingClientRect();
        if (b.width < 200 || b.height < 300 || b.left < -1 || b.top < -1 || b.right > vw + 1 || b.bottom > vh + 1) continue;
        if (Math.abs(b.width / b.height - target) / target > 0.12) continue;
        const area = b.width * b.height;
        if (area > 0.9 * vw * vh || area < 0.1 * vw * vh) continue;
        if (!best || area > best.area) best = { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), area };
      }
      return best;
    }, { W: width, H: height });
    return r ? { x: r.x, y: r.y, w: r.w, h: r.h } : null;
  } finally { try { await browser.close({ silent: true }); } catch {} }
}

/** stills at given seconds (PNG buffers), same clock as the recording */
export async function htmlStills({ html, width, height, times, fontCss = "", browserExecutable, fps = 30, crop = false }) {
  const box = crop ? await findCrop({ html, width, height, fontCss, browserExecutable, fps }) : null;
  const { step, shot, browser } = await openHtmlPage({ html, width, height, fontCss, browserExecutable });
  try {
    const out = []; let t = 0;
    for (const sec of [...times].sort((a, b) => a - b)) {
      const target = Math.round(sec * fps);
      while (t < target) { await step(1000 / fps); t++; }
      out.push(await shot("png", 94, box));
    }
    return out;
  } finally { try { await browser.close({ silent: true }); } catch {} }
}

/** html: the whole page. fontCss: @font-face rules with data: urls (fonts cannot be downloaded). Returns {frames}. */
export async function recordHtml({ html, width, height, seconds, fps = 30, outFile, fontCss = "", browserExecutable, onProgress = () => {}, ffmpeg = "ffmpeg", crop = false }) {
  const box = crop ? await findCrop({ html, width, height, fontCss, browserExecutable, fps }) : null;
  const { step, shot, browser } = await openHtmlPage({ html, width, height, fontCss, browserExecutable });
  let ff = null;
  try {
    const frames = Math.max(1, Math.round(seconds * fps));
    ff = spawn(ffmpeg, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-", "-vf", `scale=${width}:${height}:flags=lanczos`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outFile], { stdio: ["pipe", "ignore", "pipe"] });
    let ffErr = ""; ff.stderr.on("data", (d) => { ffErr += d; });
    const done = new Promise((res, rej) => { ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg: ${ffErr.slice(0, 300)}`)))); ff.on("error", rej); });
    ff.stdin.on("error", () => {}); done.catch(() => {});
    for (let i = 0; i < frames; i++) {
      await step(1000 / fps);
      if (!ff.stdin.write(await shot("jpeg", 94, box))) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 15 === 0) onProgress(i / frames);
    }
    ff.stdin.end(); await done; ff = null;
    return { frames, cropped: !!box };
  } finally { try { ff?.kill("SIGKILL"); } catch {} try { await browser.close({ silent: true }); } catch {} }
}
