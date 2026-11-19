// «فيديو من موقعك»: opens the customer's website in a real browser (Remotion's Chrome), scrolls it so lazy pictures load,
// and takes one tall picture of the whole page in a phone size and a computer size, plus the page's text and where each section starts.
// The page is untrusted: every request the browser makes is checked, and anything that points to a private / internal address is blocked.
import { openBrowser } from "@remotion/renderer";
import dns from "node:dns/promises";
import net from "node:net";

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return x === "::" || x === "::1" || /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith("ff");
  }
  return true;
}

/** True only when the host name resolves, and every address it resolves to is public. */
export async function hostIsPublic(host, cache = new Map()) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (cache.has(h)) return cache.get(h);
  let ok = false;
  try {
    if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) ok = false;
    else if (net.isIP(h)) ok = !isPrivateIp(h);
    else { const all = await dns.lookup(h, { all: true }); ok = all.length > 0 && all.every((a) => !isPrivateIp(a.address)); }
  } catch { ok = false; }
  cache.set(h, ok);
  return ok;
}

export function cleanUrl(raw) {
  let u;
  const t = String(raw ?? "").trim();
  if (!t || /^[a-z][a-z0-9+.-]*:/i.test(t) && !/^https?:\/\//i.test(t) && !/^[^/]*:\d+(\/|$)/.test(t)) return null; // only http(s)
  try { u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`); } catch { return null; }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) return null;
  if (u.port && !["80", "443"].includes(u.port)) return null;
  return u;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_CSS_H = 6500;

const SECTIONS_JS = `(() => {
  const maxH = ${MAX_CSS_H};
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 40 && r.height > 8 && s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) !== 0; };
  const clean = (t) => String(t || "").replace(/\\s+/g, " ").trim();
  const out = [];
  const heads = [...document.querySelectorAll("h1,h2,h3")].filter(vis);
  for (const h of heads) {
    const y = Math.round(h.getBoundingClientRect().top + window.scrollY);
    if (y > maxH - 120) continue;
    const title = clean(h.innerText).slice(0, 120);
    if (title.length < 2) continue;
    const box = h.closest("section,article,li,div") || h.parentElement;
    let text = clean(box ? box.innerText : "");
    if (text.length > 260) text = text.slice(0, 260);
    out.push({ y, title, text });
  }
  out.sort((a, b) => a.y - b.y);
  const keep = [];
  for (const s of out) { if (!keep.length || s.y - keep[keep.length - 1].y >= 260) keep.push(s); }
  if (!keep.length || keep[0].y > 200) keep.unshift({ y: 0, title: clean(document.title).slice(0, 120), text: clean(document.querySelector('meta[name="description"]')?.content).slice(0, 260) });
  keep[0].y = 0;
  return keep.slice(0, 14);
})()`;

const SCROLL_JS = `(async () => {
  const maxH = ${MAX_CSS_H};
  const step = Math.max(300, Math.round(window.innerHeight * 0.8));
  const total = Math.min(document.documentElement.scrollHeight, maxH);
  for (let y = 0; y < total; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 220)); }
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 500));
  return Math.min(document.documentElement.scrollHeight, maxH);
})()`;

const TIDY_JS = `(() => {
  const bad = '[id*="cookie" i],[class*="cookie" i],[id*="consent" i],[class*="consent" i],[class*="gdpr" i],[id*="gdpr" i],[class*="newsletter-popup" i],[class*="chat-widget" i],[id*="intercom" i],[class*="whatsapp" i]';
  document.querySelectorAll(bad).forEach((e) => { const p = getComputedStyle(e).position; if (p === "fixed" || p === "sticky" || /cookie|consent|gdpr/i.test(e.id + e.className)) e.remove(); });
  document.documentElement.style.scrollBehavior = "auto";
})()`;

const INFO_JS = `(() => {
  const m = (n) => document.querySelector('meta[name="' + n + '"],meta[property="' + n + '"]')?.content || "";
  const clean = (t) => String(t || "").replace(/[ \\t]+/g, " ").replace(/\\n\\s*\\n+/g, "\\n").trim();
  return { title: clean(document.title).slice(0, 200), desc: clean(m("description") || m("og:description")).slice(0, 500), siteName: clean(m("og:site_name")).slice(0, 80), lang: document.documentElement.lang || "", theme: m("theme-color"), text: clean(document.body ? document.body.innerText : "").slice(0, 7000), links: Array.from(document.querySelectorAll("a[href]")).map((a) => a.href).filter((h) => /^https?:/i.test(h) && /(wa\\.me|whatsapp\\.com|instagram\\.com|tiktok\\.com|snapchat\\.com|twitter\\.com|x\\.com|youtube\\.com|facebook\\.com|fb\\.com|t\\.me|threads\\.net|pinterest\\.com)/i.test(h)).slice(0, 60) };
})()`;

async function shoot(browser, url, kind, cache, hostCheck) {
  const mobile = kind === "mobile";
  const page = await browser.newPage({ context: { logLevel: "error", indent: false, shouldDumpIo: false }, logLevel: "error", indent: false, pageIndex: mobile ? 1 : 0, onBrowserLog: null, onLog: () => {} });
  const cdp = page._client();
  try {
    const view = mobile ? { width: 390, height: 844, scale: 2 } : { width: 1280, height: 800, scale: 1 };
    await page.setViewport({ width: view.width, height: view.height, deviceScaleFactor: view.scale });
    if (mobile) {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await cdp.send("Emulation.setUserAgentOverride", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" });
    }
    // every request the page makes is checked first
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
    cdp.on("Fetch.requestPaused", async (e) => {
      const id = e.requestId;
      try {
        const u = new URL(e.request.url);
        if (u.protocol === "data:" || u.protocol === "blob:" || u.protocol === "about:") return void cdp.send("Fetch.continueRequest", { requestId: id }).catch(() => {});
        const okType = e.resourceType !== "Media" && e.resourceType !== "WebSocket";
        if ((u.protocol === "http:" || u.protocol === "https:") && okType && (!u.port || ["80", "443"].includes(u.port)) && (await hostCheck(u.hostname, cache))) return void cdp.send("Fetch.continueRequest", { requestId: id }).catch(() => {});
      } catch { /* fall through: blocked */ }
      cdp.send("Fetch.failRequest", { requestId: id, errorReason: "BlockedByClient" }).catch(() => {});
    });
    try { await page.goto({ url, timeout: 25000, options: { waitUntil: "load" } }); } catch (e) { if (!String(e?.message ?? e).match(/timeout/i)) throw e; }
    await sleep(1500);
    await page.evaluate(TIDY_JS).catch(() => {});
    const height = Math.max(view.height, Number(await page.evaluate(SCROLL_JS)) || view.height);
    await page.evaluate(TIDY_JS).catch(() => {});
    await sleep(400);
    const info = await page.evaluate(INFO_JS);
    const sections = await page.evaluate(SECTIONS_JS);
    const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 82, captureBeyondViewport: true, clip: { x: 0, y: 0, width: view.width, height, scale: 1 } });
    const data = shot?.value?.data;
    if (!data) throw new Error("no screenshot");
    return { buf: Buffer.from(data, "base64"), w: view.width, h: height, sc: view.scale, info, sections: Array.isArray(sections) ? sections : [] };
  } finally { await page.close().catch(() => {}); }
}

/** Opens the page twice (phone, computer) and returns both pictures with the page's text and sections. */
export async function captureSite(rawUrl, { hostCheck = hostIsPublic, browserExecutable } = {}) {
  const u = cleanUrl(rawUrl);
  if (!u) throw new Error("bad url");
  const cache = new Map();
  if (!(await hostCheck(u.hostname, cache))) throw new Error("private or unknown host");
  const browser = await openBrowser("chrome", { logLevel: "error", ...(browserExecutable ? { browserExecutable } : {}) });
  try {
    const mobile = await shoot(browser, u.toString(), "mobile", cache, hostCheck);
    const desktop = await shoot(browser, u.toString(), "desktop", cache, hostCheck);
    const blocked = /just a moment|attention required|access denied|captcha|are you human|verify you are/i.test(mobile.info.title + " " + mobile.info.text.slice(0, 200));
    if (blocked || (mobile.info.text.length < 25 && mobile.h < 900)) throw new Error("blocked or empty page");
    return { url: u.toString(), host: u.hostname.replace(/^www\./, ""), mobile, desktop };
  } finally { await browser.close({ silent: true }).catch(() => {}); }
}
