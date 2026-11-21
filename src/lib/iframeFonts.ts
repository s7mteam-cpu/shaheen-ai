/** A sealed preview frame (no origin) cannot use the page's fonts: this copies the chosen family's @font-face rules with the font files inlined. */
const fontCache = new Map<string, Promise<string>>();
export function fontCssFor(family: string): Promise<string> {
  const hit = fontCache.get(family); if (hit) return hit;
  const job = (async () => {
    const rules: { weight: string; range: string; url: string }[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let list: CSSRuleList; try { list = sheet.cssRules; } catch { continue; }
      for (const r of Array.from(list)) {
        if (!(r instanceof CSSFontFaceRule)) continue;
        if (r.style.getPropertyValue("font-family").replace(/["']/g, "").trim().toLowerCase() !== family.toLowerCase()) continue;
        const m = r.style.getPropertyValue("src").match(/url\(["']?([^"')]+\.woff2[^"')]*)["']?\)/);
        if (m) rules.push({ weight: r.style.getPropertyValue("font-weight") || "400", range: r.style.getPropertyValue("unicode-range"), url: new URL(m[1], sheet.href ?? location.href).href });
      }
    }
    const parts = await Promise.all(rules.slice(0, 6).map(async (x) => {
      const buf = new Uint8Array(await (await fetch(x.url)).arrayBuffer()); let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return `@font-face{font-family:"${family}";font-weight:${x.weight};${x.range ? `unicode-range:${x.range};` : ""}src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2");}`;
    }));
    return parts.join("");
  })().catch(() => "");
  fontCache.set(family, job); return job;
}
