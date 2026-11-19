// «مكتبة الأساليب» — الرفع المباشر: كود Remotion جاهز (من جيميناي مثلًا) يُنظَّف تلقائيًا بدون Claude ثم يمرّ بالفحص الحقيقي.
// دالة نقية (بدون شبكة ولا ملفات) حتى تنختبر لوحدها. ما تغيّر التصميم: تصلح الشكل فقط (أقواس، استيراد غلط، حجم، خط، قائمة الحقول).
const OK_SRC = new Set(["react", "remotion", "./brand"]);
const clip = (s, n) => String(s ?? "").slice(0, n);

/** النصوص الافتراضية D من الكود: { key: "value" } */
function readDefaults(code) {
  const out = {};
  const m = code.match(/const\s+D\b[^=]*=\s*\{([\s\S]*?)\}\s*;/);
  if (!m) return out;
  for (const e of m[1].matchAll(/["']?([A-Za-z_]\w*)["']?\s*:\s*(["'`])((?:\\.|(?!\2)[^\\])*)\2/g)) {
    let v = e[3];
    try { v = e[2] === '"' ? JSON.parse(`"${v}"`) : v.replace(/\\(["'`\\])/g, "$1"); } catch { /* keep raw */ }
    out[e[1]] = v;
  }
  return out;
}

/** @returns {{ code: string, fields: {key:string,label:string,value:string}[], notes: string[], error?: string }} */
export function normalizeTemplate(src, maxCode = 45_000) {
  const notes = [];
  let c = String(src ?? "").replace(/\r/g, "");

  // 1) أقواس الكود وأي كلام حول الكود
  const fence = c.match(/```[a-zA-Z]*[ \t]*\n([\s\S]*?)```/);
  if (fence) { c = fence[1]; notes.push("أزلنا أقواس الكود (```)"); }
  else if (/^\s*```/.test(c) || /```\s*$/.test(c)) { c = c.replace(/^\s*```[a-zA-Z]*\s*/, "").replace(/\s*```\s*$/, ""); notes.push("أزلنا أقواس الكود (```)"); }
  const first = c.search(/^[ \t]*(import\s|\/\/\s*FIELDS)/m);
  if (first > 0) { c = c.slice(first); notes.push("أزلنا كلامًا قبل الكود"); }
  c = c.trim();

  // 2) الاستيراد: react و remotion فقط. react-remotion يصير remotion، وأي شي ثاني يُحذف
  c = c.replace(/(^|\n)([ \t]*)import\s+([^;'"]*?)from\s*["']([^"']+)["'][^\n;]*;?/g, (m, nl, ind, what, srcName) => {
    if (OK_SRC.has(srcName) && !/\bas\s+any\b/.test(m)) return m;
    if (srcName === "react-remotion" || srcName === "remotion/index") { notes.push(`صححنا الاستيراد (${srcName} ← remotion)`); return `${nl}${ind}import ${what}from "remotion";`; }
    if (OK_SRC.has(srcName)) { notes.push("أزلنا «as any» من سطر الاستيراد"); return `${nl}${ind}import ${what}from "${srcName}";`; }
    notes.push(`حذفنا استيرادًا غير مسموح (${clip(srcName, 30)})`);
    return nl;
  });

  // 3) قائمة الحقول
  const defaults = readDefaults(c);
  let listed = [];
  const fm = c.match(/^[ \t]*\/\/\s*FIELDS:\s*(\[.*\])[ \t]*$/m);
  if (fm) { try { listed = JSON.parse(fm[1]); } catch { notes.push("قائمة FIELDS غير صالحة، أعدنا بناءها من النصوص"); } }
  else notes.push("ما لقينا سطر FIELDS، بنيناه من النصوص");
  const fields = [], seen = new Set();
  const push = (key, label, value) => {
    if (!/^\w{1,40}$/.test(key) || seen.has(key) || fields.length >= 120) return;
    seen.add(key); fields.push({ key, label: clip(label || key, 60), value: clip(value ?? "", 300) });
  };
  for (const it of Array.isArray(listed) ? listed : []) if (it && typeof it.key === "string") push(it.key, typeof it.label === "string" ? it.label : it.key, typeof it.value === "string" ? it.value : defaults[it.key] ?? "");
  const before = fields.length;
  for (const k of Object.keys(defaults)) push(k, k, defaults[k]);
  for (const m of c.matchAll(/\bT\(\s*["'](\w+)["']\s*\)/g)) push(m[1], m[1], defaults[m[1]] ?? "");
  for (const m of c.matchAll(/\.t\s*\??\.\s*\[\s*["'](\w+)["']\s*\]/g)) push(m[1], m[1], defaults[m[1]] ?? "");
  if (fields.length > before) notes.push(`أضفنا ${fields.length - before} حقل ناقص إلى قائمة الحقول`);

  // 4) النصوص لازم تنقرأ من p.t حتى يشتغل التعديل
  if (!/\bp\??\.t\b|\.t\s*\??\.\s*\[|\{\s*t\s*[,}]|\bt\s*\??\.\s*\[/.test(c)) return { code: c, fields, notes, error: "الكود ما يقرأ النصوص من p.t، فالتعديل من اللوحة ما راح يشتغل. اطلب من جيميناي يقرأها بصيغة T(key) من p.t" };
  if (!fields.length) return { code: c, fields, notes, error: "ما لقينا أي نص قابل للتعديل" };

  // 5) الخط: اسم خط مكتوب ثابتًا يصير يتبع خط العميل
  let fontFixed = false;
  c = c.replace(/fontFamily\s*:\s*(["'])[^"'$]*\1/g, () => { fontFixed = true; return 'fontFamily: "inherit"'; });
  c = c.replace(/fontFamily=(["'])[^"'$]*\1/g, () => { fontFixed = true; return 'fontFamily="inherit"'; });
  if (fontFixed) {
    if (/export\s+const\s+Free\b/.test(c)) c = c.replace(/export\s+const\s+Free\b/, "const FreeInner");
    else if (/export\s+function\s+Free\b/.test(c)) c = c.replace(/export\s+function\s+Free\b/, "function FreeInner");
    else fontFixed = false;
    if (fontFixed) {
      c += '\nexport const Free = (p: any) => (<div style={{ position: "absolute", inset: 0, fontFamily: `${p?.font ?? "Cairo"}, sans-serif` }}><FreeInner {...(p as any)} /></div>);\n';
      notes.push("ربطنا الخط الثابت بخط العميل");
    }
  }

  // 6) الحجم: نشيل التعليقات والمسافات إذا زاد عن الحد
  if (c.length > maxCode) {
    const keep = c.split("\n").filter((l) => { const t = l.trim(); return t && !(t.startsWith("//") && !/^\/\/\s*FIELDS/.test(t)) && !/^\{\/\*.*\*\/\}$/.test(t); }).map((l) => l.trim());
    c = keep.join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
    notes.push("ضغطنا الكود (أزلنا التعليقات والمسافات) عشان يدخل الحد");
    if (c.length > maxCode) return { code: c, fields, notes, error: `الكود أكبر من الحد (${c.length} من ${maxCode} حرف) حتى بعد الضغط` };
  }
  return { code: c.trim() + "\n", fields, notes };
}

/** الفحص الحقيقي بعد التنظيف: يبني الكود، يصوّر لقطات، يتأكد أن الصورة مو فاضية وأن التشغيل لقطة بعد لقطة ما ينهار،
 *  ثم يسوّي ورقة صور (٤ لقطات + لقطة بألوان وخط مختلفين تثبت أن التعديل يشتغل). تُحقن الأدوات من index.mjs.
 *  @returns {{ error?: string, sheet?: string }} */
export async function verifyTemplate({ code, fields, prepareFree, frameIsBlank, run, join, workDir, brandFile, mediaOrigin, fontCss, W, H, tag, seconds = 40, browserExecutable }) {
  const colors = { bg: "#0B2A4A", accent: "#E8B44C", text: "#FFFFFF" };
  const t = Object.fromEntries(fields.map((f) => [f.key, f.value]));
  const props = { assets: {}, t, colors, font: "Cairo", contact: [], logo: "", logoOn: false, beats: [], seconds };
  let prep = null;
  try {
    prep = await prepareFree({ chapters: [{ code, b0: 0 }], width: W, height: H, seconds, workDir, brandFile, fontCss, mediaOrigin, ...(browserExecutable ? { browserExecutable } : {}) });
    const png = join(workDir, `td-${tag}.png`);
    await prep.still(props, Math.round(seconds * 30 * 0.5), png);
    if (await frameIsBlank(png)) return { error: "الصورة فاضية (لون واحد). الكود ما يعرض شي" };
    const crash = await prep.scrub(props, Math.max(10, Math.ceil((seconds * 30) / 120)));
    if (crash.length) return { error: `الكود ينهار أثناء التشغيل: ${String(crash[0][1]).slice(0, 140)}` };
    const shots = [];
    for (const [i, f] of [0.1, 0.35, 0.62, 0.92].entries()) { const fp = join(workDir, `td-${tag}-${i}.png`); await prep.still(props, Math.round(seconds * 30 * f), fp); shots.push(fp); }
    const alt = { ...props, font: "Amiri", colors: { bg: "#1A0A0A", accent: "#F5B800", text: "#FFF4D6" } };
    const fp = join(workDir, `td-${tag}-alt.png`); await prep.still(alt, Math.round(seconds * 30 * 0.5), fp); shots.push(fp);
    const sheet = join(workDir, `td-${tag}-sheet.png`);
    await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...shots.flatMap((x) => ["-i", x]), "-filter_complex", shots.map((_, i) => `[${i}]scale=300:-1[v${i}]`).join(";") + ";" + shots.map((_, i) => `[v${i}]`).join("") + `hstack=${shots.length}`, sheet]);
    return { sheet, shots };
  } catch (e) { return { error: clip(e?.message ?? e, 300) }; }
  finally { prep?.cleanup(); }
}
