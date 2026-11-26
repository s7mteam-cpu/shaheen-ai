// «حلّل حسابي»: opens ONE public Instagram profile page, like a normal visitor, in the platform's own browser (Remotion's Chrome),
// signed in with the platform's own account (its session cookie, set by the admin; never taken from a customer). It only looks:
// it takes a few pictures of the profile and reads the page text. Nothing is posted, followed or liked, and it never logs in by itself.
import { openBrowser } from "@remotion/renderer";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WALL = /log in to (see|continue)|log into instagram|sign up to see|تسجيل الدخول لمتابعة|سجّل الدخول|سجل الدخول للمتابعة/i;
const PRIVATE = /this account is private|هذا الحساب خاص/i;
const MISSING = /sorry, this page isn't available|the link you followed may be broken|الصفحة غير متاحة|قد يكون الرابط الذي اتبعته معطلاً/i;

/** returns { state: "ok" | "private" | "missing" | "wall", text, shots: Buffer[] } for @handle (the name is checked by the caller: letters, digits, dot, underscore) */
export async function captureInstagram(handle, sessionid) {
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) throw new Error("bad handle");
  const browser = await openBrowser("chrome", { logLevel: "error" });
  try {
    const page = await browser.newPage({ context: { logLevel: "error", indent: false, shouldDumpIo: false }, logLevel: "error", indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {} });
    const cdp = page._client();
    try {
      await page.setViewport({ width: 1100, height: 1300, deviceScaleFactor: 1 });
      await cdp.send("Network.enable");
      await cdp.send("Network.setCookie", { name: "sessionid", value: sessionid, domain: ".instagram.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" });
      // only Instagram's own hosts: nothing else is ever loaded by this page
      await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*" }] });
      cdp.on("Fetch.requestPaused", (e) => {
        let ok = false;
        try { const u = new URL(e.request.url); ok = u.protocol === "https:" && /(^|\.)(instagram\.com|cdninstagram\.com|fbcdn\.net|facebook\.com)$/i.test(u.hostname) && e.resourceType !== "Media" && e.resourceType !== "WebSocket"; } catch { ok = false; }
        if (ok) cdp.send("Fetch.continueRequest", { requestId: e.requestId }).catch(() => {});
        else cdp.send("Fetch.failRequest", { requestId: e.requestId, errorReason: "BlockedByClient" }).catch(() => {});
      });
      try { await page.goto({ url: `https://www.instagram.com/${handle}/`, timeout: 30000, options: { waitUntil: "load" } }); } catch (e) { if (!String(e?.message ?? e).match(/timeout/i)) throw e; }
      await sleep(3500);
      const text = String(await page.evaluate(`(document.body && document.body.innerText || "").replace(/[ \\t]+/g, " ").replace(/\\n\\s*\\n+/g, "\\n").trim().slice(0, 4000)`) ?? "");
      const meta = String(await page.evaluate(`(document.querySelector('meta[property="og:description"]') || {}).content || ""`) ?? "").slice(0, 600);
      const full = `${meta}\n${text}`.trim();
      if (MISSING.test(text)) return { state: "missing", text: "", shots: [] };
      if (PRIVATE.test(text)) return { state: "private", text: full, shots: [] };
      // a signed-out look (the session is no longer valid): the profile is covered by a log-in wall
      if (WALL.test(text) && !meta) return { state: "wall", text: "", shots: [] };
      const shots = [];
      for (let i = 0; i < 3; i++) {
        if (i > 0) { await page.evaluate(`window.scrollBy(0, ${i === 1 ? 900 : 1100})`).catch(() => {}); await sleep(1800); }
        const s = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 72 });
        const d = s?.value?.data ?? s?.data;
        if (d) shots.push(Buffer.from(d, "base64"));
      }
      if (!shots.length) throw new Error("no screenshot");
      return { state: "ok", text: full, shots };
    } finally { await page.close().catch(() => {}); }
  } finally { await browser.close({ silent: true }).catch(() => {}); }
}
