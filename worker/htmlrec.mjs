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
      try { typeof best.cb === "function" && best.cb(...best.a); } catch (e) { (window.__errs = window.__errs || []).push("timer: " + String(e && e.message || e)); }
    }
    now = end;
    const list = [...raf]; raf.clear();
    for (const [, cb] of list) { try { cb(now); } catch (e) { (window.__errs = window.__errs || []).push("frame: " + String(e && e.message || e)); } }
    try { for (const a of document.getAnimations()) { if (a.__t0 === undefined) { a.__t0 = now - dt; a.pause(); } a.currentTime = now - a.__t0; } } catch (e) {}
  };
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Puts our security header (the Content-Security-Policy) where the browser reads it BEFORE anything of the page.
 * Normal pages: right after their real <head>. If the page tries to hide a "<head>" inside a comment, or places a script / tag before its head,
 * the page is wrapped instead, so the policy is always first and can never be skipped. */
export function withHead(html, head) {
  const masked = String(html).replace(/<!--[\s\S]*?-->/g, (c) => " ".repeat(c.length));
  const m = /<head[^>]*>/i.exec(masked);
  if (m && !/<!--|<(?:script|style|link|meta|base|iframe|img|svg|object|embed|body)\b/i.test(masked.slice(0, m.index))) { const at = m.index + m[0].length; return html.slice(0, at) + head + html.slice(at); }
  return `<!doctype html><html><head>${head}</head><body>${html}</body></html>`;
}
const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; media-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
/** the page as the admin's sandboxed iframe plays it live: no network at all, fonts embedded */
export function htmlPreviewDoc(html, fontCss = "") {
  const head = `<meta http-equiv="Content-Security-Policy" content="${CSP}"><script>window.__errs=[];addEventListener("error",function(e){__errs.push(String(e.message)+" @"+(e.lineno||""))});addEventListener("unhandledrejection",function(e){__errs.push("rejection: "+String(e.reason))});</script><style>${fontCss}html,body{margin:0;overflow:hidden}</style>`;
  return withHead(html, head);
}
/** The page is laid out like on the preview (a phone-sized screen: 432 css px wide for portrait) and drawn at a higher pixel density,
 * so the video is exactly what the live preview shows (designs switch to their "mobile" layout on narrow screens). */
function layoutOf(width, height, base) {
  const baseW = base || (height > width ? 432 : height === width ? 540 : 960);
  const scale = width / baseW;
  return { lw: baseW, lh: Math.round(height / scale), scale };
}
async function openHtmlPage({ html, width, height, fontCss, browserExecutable, baseW }) {
  const { lw, lh, scale } = layoutOf(width, height, baseW);
  const csp = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: blob:; media-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
  const head = `<meta http-equiv="Content-Security-Policy" content="${csp}"><style>${fontCss}html,body{margin:0;overflow:hidden}</style>`;
  const page0 = withHead(html, head);
  const browser = await openBrowser("chrome", { browserExecutable: browserExecutable || process.env.SHAHEEN_TEST_CHROME || undefined, chromiumOptions: {}, logLevel: "error", forceDeviceScaleFactor: scale });
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
    const errors = () => page.evaluate(() => (window.__errs || []).slice(0, 8)).catch(() => []);
    return { step, shot, evalIn, errors, browser, cdp, lw, lh };
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
/** the page as a real PDF (selectable text, fonts inside): one PDF page per .slide, each exactly the design's size. Same locked browser as the stills. */
export async function htmlPdf({ html, width, height, fontCss = "", browserExecutable, baseW }) {
  const { lw, lh } = layoutOf(width, height, baseW);
  const print = `<style>@page{size:${lw}px ${lh}px;margin:0}html,body{overflow:visible!important;height:auto!important;width:${lw}px!important;background:none}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.slide{break-after:page;page-break-after:always;break-inside:avoid;page-break-inside:avoid;overflow:hidden}.slide:last-of-type{break-after:auto;page-break-after:auto}</style>`;
  const page = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, print + "</head>") : print + html;
  const { cdp, browser } = await openHtmlPage({ html: page, width, height, fontCss, browserExecutable, baseW });
  try {
    await sleep(300);
    const r = await cdp.send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, paperWidth: lw / 96, paperHeight: lh / 96, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    return Buffer.from((r.value ?? r).data, "base64");
  } finally { try { await browser.close({ silent: true }); } catch {} }
}
export async function htmlStills({ html, width, height, times, fontCss = "", browserExecutable, fps = 30, crop = false, sig = false, baseW }) {
  const box = crop ? await findCrop({ html, width, height, fontCss, browserExecutable, fps }) : null;
  const { step, shot, evalIn, errors, browser } = await openHtmlPage({ html, width, height, fontCss, browserExecutable, baseW });
  try {
    const out = []; let t = 0;
    for (const sec of [...times].sort((a, b) => a - b)) {
      const target = Math.round(sec * fps);
      while (t < target) { await step(1000 / fps); t++; }
      if (sig) out.push(await evalIn(() => Array.from(document.querySelectorAll("body *")).slice(0, 2500).map((el) => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return cs.opacity + "|" + cs.transform + "|" + Math.round(r.x) + "," + Math.round(r.y) + "," + Math.round(r.width) + "," + Math.round(r.height) + "|" + (el.children.length ? "" : String(el.textContent || "").slice(0, 40)); })));
      else out.push(await shot("png", 94, box));
    }
    out.errors = await errors();
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
    // watchdog: a stuck page must never hold the queue. One frame may take at most 2 minutes; the whole recording at most max(15 min, 40 s per video second).
    const deadline = Date.now() + Math.max(15 * 60_000, seconds * 40_000);
    const guard = (p, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`التسجيل علّق (${what})`)), 120_000).unref())]);
    for (let i = 0; i < frames; i++) {
      if (Date.now() > deadline) throw new Error("التسجيل أخذ وقتًا أطول من المسموح، تم إيقافه");
      await guard(step(1000 / fps), "step");
      if (!ff.stdin.write(await guard(shot("jpeg", 94, box), "shot"))) await new Promise((r) => ff.stdin.once("drain", r));
      if (i % 15 === 0) onProgress(i / frames);
    }
    ff.stdin.end(); await done; ff = null;
    return { frames, cropped: !!box };
  } finally { try { ff?.kill("SIGKILL"); } catch {} try { await browser.close({ silent: true }); } catch {} }
}

// ---------- «مونتاج مبتكر»: a see-through page drawn on top of the customer's own video ----------
const CLEAR = `<style>html,body{background:transparent!important}</style>`;
/** opens the page with a transparent background. full(): the frame as a PNG with alpha. tiny(): a small probe of the same frame (equal to `blankTiny` when nothing is drawn). */
async function openOverlay(o) {
  const p = await openHtmlPage({ ...o, html: withHead(o.html, CLEAR) });
  try {
    await p.cdp.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    const png = async (scale) => { const r = await p.cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true, ...(scale ? { clip: { x: 0, y: 0, width: p.lw, height: p.lh, scale } } : {}) }); return Buffer.from((r.value ?? r).data, "base64"); };
    const full = () => png(0), tiny = () => png(0.25);
    await p.evalIn(() => { document.documentElement.style.visibility = "hidden"; });
    const blankFull = await full(), blankTiny = await tiny();
    await p.evalIn(() => { document.documentElement.style.visibility = ""; });
    return { ...p, full, tiny, blankFull, blankTiny };
  } catch (e) { try { await p.browser.close({ silent: true }); } catch {} throw e; }
}
/** For the checks: at each time, is anything drawn (blank), and a JPEG of the overlay over `bg` (one frame of the customer's video, a data: url). */
export async function overlayStills({ html, width, height, times, bg = "", fontCss = "", browserExecutable, fps = 30 }) {
  const p = await openOverlay({ html, width, height, fontCss, browserExecutable });
  try {
    await p.evalIn((u) => { const d = document.createElement("div"); d.id = "__fxbg"; d.style.cssText = "position:fixed;inset:0;z-index:-2147483647;display:none;background:#222 center/cover no-repeat"; if (u) d.style.backgroundImage = `url(${u})`; document.documentElement.appendChild(d); }, bg);
    const out = []; let t = 0;
    for (const sec of [...times].sort((a, b) => a - b)) {
      const target = Math.round(sec * fps);
      while (t < target) { await p.step(1000 / fps); t++; }
      const blank = (await p.tiny()).equals(p.blankTiny);
      await p.evalIn(() => { document.getElementById("__fxbg").style.display = "block"; });
      const frame = await p.shot("jpeg", 82);
      await p.evalIn(() => { document.getElementById("__fxbg").style.display = "none"; });
      out.push({ t: sec, blank, frame });
    }
    out.errors = await p.errors();
    return out;
  } finally { try { await p.browser.close({ silent: true }); } catch {} }
}
/** Records the page over `base` (a constant-fps video) from second `start`, for `seconds`. Video only (the sound is added once at the end).
 *  Frames where nothing is drawn are not captured: a small probe tells, and a ready empty frame is sent instead, so quiet stretches cost almost nothing. */
export async function recordOverlay({ html, width, height, seconds, fps = 30, base, start = 0, outFile, fontCss = "", browserExecutable, onProgress = () => {}, ffmpeg = "ffmpeg" }) {
  const p = await openOverlay({ html, width, height, fontCss, browserExecutable });
  let ff = null;
  try {
    const frames = Math.max(1, Math.round(seconds * fps));
    ff = spawn(ffmpeg, ["-y", "-loglevel", "error", "-ss", start.toFixed(3), "-i", base, "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
      "-filter_complex", `[0:v]fps=${fps},setpts=PTS-STARTPTS[b];[1:v]scale=${width}:${height}:flags=lanczos,format=rgba[o];[b][o]overlay=eof_action=pass:format=auto[v]`,
      "-map", "[v]", "-an", "-frames:v", String(frames), "-r", String(fps), "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", outFile], { stdio: ["pipe", "ignore", "pipe"] });
    let ffErr = ""; ff.stderr.on("data", (d) => { ffErr += d; });
    const done = new Promise((res, rej) => { ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg: ${ffErr.slice(0, 300)}`)))); ff.on("error", rej); });
    ff.stdin.on("error", () => {}); done.catch(() => {});
    // ffmpeg may stop before the last frame (the video part of the file is shorter than its sound): its pipe is then never waited on again
    let closed = false; const gone = new Promise((res) => { ff.on("close", () => { closed = true; res(); }); ff.on("error", () => { closed = true; res(); }); });
    const deadline = Date.now() + Math.max(15 * 60_000, seconds * 40_000);
    const guard = (x, what) => Promise.race([x, new Promise((_, rej) => setTimeout(() => rej(new Error(`التسجيل علّق (${what})`)), 120_000).unref())]);
    let hot = 0, drawn = 0, sent = 0;
    for (let i = 0; i < frames && !closed; i++) {
      if (Date.now() > deadline) throw new Error("التسجيل أخذ وقتًا أطول من المسموح، تم إيقافه");
      await guard(p.step(1000 / fps), "step");
      let buf;
      if (hot > 0) { buf = await guard(p.full(), "shot"); hot--; drawn++; }
      else if ((await guard(p.tiny(), "probe")).equals(p.blankTiny)) buf = p.blankFull;
      else { buf = await guard(p.full(), "shot"); hot = 5; drawn++; }
      if (closed) break;
      if (!ff.stdin.write(buf)) await guard(Promise.race([new Promise((r) => ff.stdin.once("drain", r)), gone]), "pipe");
      sent++;
      if (i % 15 === 0) onProgress(i / frames);
    }
    try { ff.stdin.end(); } catch {}
    await guard(done, "ffmpeg"); ff = null;
    return { frames, drawn, sent };
  } finally { try { ff?.kill("SIGKILL"); } catch {} try { await p.browser.close({ silent: true }); } catch {} }
}

/** Records the see-through page ALONE into a video that keeps its transparency (QuickTime Animation, lossless). Used when the graphics are laid in more than one layer
 *  (behind the speaker / in front of him): each layer is a file, and the layers are then put together by one plain ffmpeg run over files. */
export async function recordAlpha({ html, width, height, seconds, fps = 30, outFile, fontCss = "", browserExecutable, onProgress = () => {}, ffmpeg = "ffmpeg" }) {
  const p = await openOverlay({ html, width, height, fontCss, browserExecutable });
  let ff = null;
  try {
    const frames = Math.max(1, Math.round(seconds * fps));
    ff = spawn(ffmpeg, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-", "-frames:v", String(frames), "-vf", `scale=${width}:${height}:flags=lanczos`, "-c:v", "qtrle", "-pix_fmt", "argb", outFile], { stdio: ["pipe", "ignore", "pipe"] });
    let ffErr = ""; ff.stderr.on("data", (d) => { ffErr += d; });
    const done = new Promise((res, rej) => { ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg: ${ffErr.slice(0, 300)}`)))); ff.on("error", rej); });
    ff.stdin.on("error", () => {}); done.catch(() => {});
    let closed = false; const gone = new Promise((res) => { ff.on("close", () => { closed = true; res(); }); });
    const deadline = Date.now() + Math.max(15 * 60_000, seconds * 40_000);
    const guard = (x, what) => Promise.race([x, new Promise((_, rej) => setTimeout(() => rej(new Error(`التسجيل علّق (${what})`)), 120_000).unref())]);
    let hot = 0, drawn = 0;
    for (let i = 0; i < frames && !closed; i++) {
      if (Date.now() > deadline) throw new Error("التسجيل أخذ وقتًا أطول من المسموح، تم إيقافه");
      await guard(p.step(1000 / fps), "step");
      let buf;
      if (hot > 0) { buf = await guard(p.full(), "shot"); hot--; drawn++; }
      else if ((await guard(p.tiny(), "probe")).equals(p.blankTiny)) buf = p.blankFull;
      else { buf = await guard(p.full(), "shot"); hot = 5; drawn++; }
      if (closed) break;
      if (!ff.stdin.write(buf)) await guard(Promise.race([new Promise((r) => ff.stdin.once("drain", r)), gone]), "pipe");
      if (i % 15 === 0) onProgress(i / frames);
    }
    try { ff.stdin.end(); } catch {}
    await guard(done, "ffmpeg"); ff = null;
    return { frames, drawn };
  } finally { try { ff?.kill("SIGKILL"); } catch {} try { await p.browser.close({ silent: true }); } catch {} }
}
