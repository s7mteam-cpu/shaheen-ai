// Shaheen video worker (Railway). Renders with Remotion, listens with ElevenLabs, plans with Claude.
// 1) "motion-video" (queued + spec)          → render the motion-graphics design → MP4.
// 2) "video-editing" (queued, no spec yet)   → smart montage analysis: transcript + AI edit plan → "draft" (customer edits it live).
// 3) "video-editing" (queued + render: true) → render the edited montage → MP4.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY, ANTHROPIC_API_KEY (optional: smarter plans), RENDER_CONCURRENCY
import { createClient } from "@supabase/supabase-js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const run = promisify(execFile);
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const MAX_SECONDS = 600;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const setProgress = (id, p) => db.from("jobs").update({ progress: Math.max(0, Math.min(100, Math.round(p))), updated_at: now() }).eq("id", id).then(() => {}, () => {});

async function ff(args) { return run("ffmpeg", ["-hide_banner", "-y", ...args], { maxBuffer: 64 * 1024 * 1024 }); }
async function probe(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_tags=rotate:format=duration", "-of", "json", file]);
  const j = JSON.parse(stdout);
  const s = j.streams?.[0] ?? {};
  const rot = Math.abs(Number(s.tags?.rotate ?? 0));
  const [w, h] = rot === 90 || rot === 270 ? [s.height, s.width] : [s.width, s.height];
  return { duration: Number(j.format?.duration ?? 0), width: Number(w) || 1080, height: Number(h) || 1920 };
}

async function fail(job, e) {
  console.error("failed", job.id, e);
  await db.from("jobs").update({ status: "failed", error: String(e?.message ?? e).slice(0, 500), updated_at: now() }).eq("id", job.id);
  await db.rpc("refund_job", { p_job: job.id });
}

// ---------- Listening: word-level Arabic transcript ----------
async function transcribe(video, dir) {
  const audio = join(dir, "audio.mp3");
  await ff(["-i", video, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio]);
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("timestamps_granularity", "word");
  form.append("file", new Blob([await readFile(audio)]), "audio.mp3");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" }, body: form });
  if (!res.ok) throw new Error(`scribe ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()).words ?? []).filter((w) => w.type === "word").map((w) => ({ t: w.text, s: +w.start.toFixed(2), e: +w.end.toFixed(2) }));
}

function sentences(words) {
  const out = []; let cur = [];
  for (const w of words) {
    if (cur.length && (w.s - cur[cur.length - 1].e > 0.7)) { out.push(cur); cur = []; }
    cur.push(w);
    if (/[.!؟?]$/.test(w.t) || cur.length >= 18) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out.map((c) => ({ s: c[0].s, e: c[c.length - 1].e, text: c.map((w) => w.t).join(" ") }));
}

// ---------- Directing: AI edit plan ----------
const PLAN_SYSTEM = `أنت مونتير محترف لريلز السوشال ميديا الخليجية. عندك نص فيديو مع توقيت كل جملة بالثواني (من الفيديو الأصلي).
مهمتك: خطة مونتاج JSON فقط، بالشكل:
{
 "hook": {"s":0,"e":0} أو null   // أقوى جملة قصيرة (2-6 ثواني) تنعرض بالبداية لتشد المشاهد
 "keep": [{"s":0,"e":0}]          // المقاطع اللي تنحفظ بالترتيب الزمني، احذف الأخطاء والتكرار والتأتأة والكلام الضعيف
 "titles": [{"text":"","at":0,"dur":2.5,"pos":"top"}]   // عناوين متحركة قصيرة جداً (2-5 كلمات) عند أهم الأفكار، "at" بتوقيت الفيديو الأصلي
 "zooms": [{"at":0,"dur":2,"scale":1.15}]               // تكبير عند الجمل المهمة، scale بين 1.08 و1.25
 "intro": {"on":true,"title":"","subtitle":""},          // بطاقة افتتاحية قصيرة
 "outro": {"on":true,"title":"","subtitle":""},          // بطاقة ختامية (دعوة للمتابعة/التواصل)
 "colors": {"text":"#FFFFFF","accent":"#hex","bg":"#hex"},
 "font": "Cairo|Tajawal|Almarai|Changa|Amiri",
 "caption_style": "karaoke|box|minimal",
 "caption_pos": "bottom|middle|top",  // مكان الترجمة، الافتراضي bottom
 "transition": "none|flash|zoom",     // تأثير عند كل قطع أو انتقال بين اللقطات
 "emojis": [{"e":"🔥","at":0,"dur":1.5}]  // إيموجي قليلة (3-6) عند لحظات مناسبة، "at" بتوقيت الفيديو الأصلي. للمحتوى الديني أو الجاد استخدم إيموجي محترمة قليلة (🤲 💡 ✅) أو لا شيء
}
القواعد: التزم بالمدة المطلوبة تقريباً. لا تقص جملة من نصها. العناوين من كلام الفيديو نفسه أو تلخيص دقيق له، بدون اختراع معلومات.
نفّذ وصف العميل بدقة إذا ذكره. حسابات أو أرقام تواصل فقط إذا ذكرها العميل.`;

async function claudePlan(user) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: process.env.MONTAGE_MODEL || "claude-sonnet-5-5", max_tokens: 6000, system: PLAN_SYSTEM + "\nأجب بـ JSON صالح فقط.", messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const text = (await res.json()).content.map((c) => c.text ?? "").join("");
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}

const hex = (v, d) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Split ranges where nobody speaks for a while (silence cut), keep a little air around words. */
function speechIslands(seg, words) {
  const inside = words.filter((w) => w.s >= seg.s - 0.05 && w.e <= seg.e + 0.1);
  if (!inside.length) return [];
  const out = []; let start = inside[0].s, last = inside[0].e;
  for (const w of inside.slice(1)) {
    if (w.s - last > 0.6) { out.push({ s: Math.max(seg.s, start - 0.12), e: Math.min(seg.e, last + 0.18) }); start = w.s; }
    last = w.e;
  }
  out.push({ s: Math.max(seg.s, start - 0.12), e: Math.min(seg.e, last + 0.18) });
  return out;
}

/** Source time → output time over the given segments (first match), or null if cut. */
function toOutput(segments, t) {
  let off = 0;
  for (const g of segments) { if (t >= g.s && t <= g.e) return off + (t - g.s); off += g.e - g.s; }
  return null;
}

async function analyzeMontage(job) {
  const dir = await mkdtemp(join(tmpdir(), "montage-"));
  try {
    const paths = (job.input.video ?? []).slice(0, 6);
    if (!paths.length) throw new Error("no video");
    const dims = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080] };
    const local = [];
    for (const [i, p] of paths.entries()) {
      const { data: file, error } = await db.storage.from("uploads").download(p);
      if (error) throw new Error(`download: ${error.message}`);
      const f = join(dir, `clip${i}.mp4`);
      await writeFile(f, Buffer.from(await file.arrayBuffer()));
      local.push(f);
    }
    // Several clips → one source: same size, 30fps, stereo audio (silent if a clip has none), then join.
    let path = paths[0];
    let video = local[0];
    if (local.length > 1) {
      const first = await probe(local[0]);
      const [W, H] = dims[job.input.aspect] ?? (first.width > first.height ? [1920, 1080] : [1080, 1920]);
      const parts = [];
      for (const [i, f] of local.entries()) {
        const o = join(dir, `n${i}.mp4`);
        await ff(["-i", f, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-filter_complex",
          `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,setsar=1[v]`,
          "-map", "[v]", "-map", "0:a?", "-map", "1:a", "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-ar", "44100", "-ac", "2", o]);
        // keep only the first audio stream (the clip's own when it has one)
        const o2 = join(dir, `m${i}.mp4`);
        await ff(["-i", o, "-map", "0:v", "-map", "0:a:0", "-c", "copy", o2]);
        parts.push(o2);
        await setProgress(job.id, 3 + Math.round((i + 1) / local.length * 7));
      }
      await writeFile(join(dir, "list.txt"), parts.map((x) => `file '${x}'`).join("\n"));
      video = join(dir, "joined.mp4");
      await ff(["-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), "-c", "copy", "-movflags", "+faststart", video]);
      path = `${job.user_id}/${job.id}-joined.mp4`;
      const up = await db.storage.from("uploads").upload(path, await readFile(video), { contentType: "video/mp4", upsert: true });
      if (up.error) throw new Error(`upload joined: ${up.error.message}`);
    }
    await setProgress(job.id, 10);

    const meta = await probe(video);
    if (meta.duration > MAX_SECONDS) throw new Error("VIDEO_TOO_LONG");
    const paidMinutes = Math.max(1, Math.ceil(Number(job.input.duration_seconds ?? 60) / 60));
    if (Math.ceil(meta.duration / 60) > paidMinutes + 1) throw new Error("DURATION_MISMATCH");

    const words = await transcribe(video, dir);
    await setProgress(job.id, 45);

    const full = job.input.target === "full" || !(Number(job.input.target) > 0);
    const target = full ? meta.duration : Number(job.input.target);
    const { data: kit } = await db.from("brand_kits").select("business_name,colors,logo_url").eq("user_id", job.user_id).maybeSingle();
    const brandColors = (kit?.colors ?? []).filter((c) => /^#[0-9a-f]{6}$/i.test(c ?? ""));
    const lines = sentences(words).map((x) => `[${x.s.toFixed(1)}-${x.e.toFixed(1)}] ${x.text}`).join("\n");

    let plan = null;
    try {
      plan = await claudePlan(
        `طول الفيديو: ${meta.duration.toFixed(1)} ثانية. المدة المطلوبة: ${full ? "بدون تقصير" : `${target} ثانية تقريباً`}.\n` +
        `وصف العميل: ${job.input.notes || "مونتاج احترافي جذاب للريلز"}\n` +
        (local.length > 1 ? `الفيديو مركّب من ${local.length} لقطات ورا بعض.\n` : "") +
        `اسم النشاط: ${kit?.business_name || "غير محدد"}${brandColors.length ? `، ألوان الهوية: ${brandColors.join(", ")}` : ""}\n\nالنص:\n${lines || "(لا يوجد كلام واضح)"}`);
    } catch (e) { console.error("plan fallback", job.id, e); }
    await setProgress(job.id, 75);

    // Kept ranges (chronological) → silence cut → optional hook in front → requested length.
    const fix = (g) => ({ s: clamp(Number(g?.s) || 0, 0, meta.duration), e: clamp(Number(g?.e) || 0, 0, meta.duration) });
    let keep = (Array.isArray(plan?.keep) && plan.keep.length ? plan.keep.map(fix) : [{ s: 0, e: meta.duration }]).filter((g) => g.e - g.s >= 0.3).sort((a, b) => a.s - b.s);
    if (job.input.cut_silence !== false && words.length) keep = keep.flatMap((g) => speechIslands(g, words));
    if (!keep.length) keep = [{ s: 0, e: meta.duration }];
    const h = plan?.hook ? fix(plan.hook) : null;
    const hook = h && h.e - h.s >= 1 && h.e - h.s <= 8 ? h : null;
    let segments = hook ? [hook, ...keep] : keep;
    if (!full) {
      let left = target; const cut = [];
      for (const g of segments) { if (left <= 0.3) break; const len = Math.min(g.e - g.s, left); cut.push({ s: g.s, e: g.s + len }); left -= len; }
      segments = cut;
    }
    segments = segments.map((g) => ({ s: +g.s.toFixed(2), e: +g.e.toFixed(2) }));
    const total = segments.reduce((a, g) => a + g.e - g.s, 0);

    // Titles/zooms come in source time: place them on the body (after the hook), else wherever they appear.
    const body = hook ? segments.slice(1) : segments;
    const hookLen = hook ? segments[0].e - segments[0].s : 0;
    const place = (arr, map) => (Array.isArray(arr) ? arr : []).slice(0, 12).flatMap((x) => {
      const inBody = toOutput(body, Number(x.at));
      const at = inBody !== null ? inBody + hookLen : toOutput(segments, Number(x.at));
      return at === null || at > total - 0.5 ? [] : [map(x, +at.toFixed(2))];
    });

    const aspect = ["9:16", "1:1", "16:9"].includes(job.input.aspect) ? job.input.aspect : meta.width > meta.height ? "16:9" : "9:16";
    const spec = {
      src: "", srcPath: path, srcW: meta.width, srcH: meta.height, aspect,
      font: ["Cairo", "Tajawal", "Almarai", "Changa", "Amiri"].includes(plan?.font) ? plan.font : "Cairo",
      colors: { text: hex(plan?.colors?.text, "#FFFFFF"), accent: hex(plan?.colors?.accent, brandColors[0] ?? "#C9A45C"), bg: hex(plan?.colors?.bg, brandColors[1] ?? "#0B2A4A") },
      captions: { on: job.input.captions !== false, style: ["karaoke", "box", "minimal"].includes(plan?.caption_style) ? plan.caption_style : "karaoke", pos: ["bottom", "middle", "top"].includes(plan?.caption_pos) ? plan.caption_pos : "bottom" },
      segments, words,
      titles: place(plan?.titles, (x, at) => ({ text: String(x.text ?? "").slice(0, 60), at, dur: clamp(Number(x.dur) || 2.5, 1.2, 5), pos: x.pos === "center" ? "center" : "top" })).filter((x) => x.text),
      zooms: place(plan?.zooms, (x, at) => ({ at, dur: clamp(Number(x.dur) || 2, 0.8, 5), scale: clamp(Number(x.scale) || 1.15, 1.05, 1.3) })),
      intro: { on: !!plan?.intro?.on, title: String(plan?.intro?.title || kit?.business_name || "").slice(0, 60), subtitle: String(plan?.intro?.subtitle ?? "").slice(0, 60) },
      outro: { on: !!plan?.outro?.on, title: String(plan?.outro?.title || "تابعنا للمزيد").slice(0, 60), subtitle: String(plan?.outro?.subtitle ?? "").slice(0, 60) },
      music: null,
      transition: ["none", "flash", "zoom"].includes(plan?.transition) ? plan.transition : local.length > 1 ? "zoom" : "none",
      logo: kit?.logo_url ? { path: kit.logo_url, url: "", on: true, pos: "tl" } : null,
      emojis: place(plan?.emojis, (x, at) => ({ e: String(x.e ?? "").slice(0, 4), at, dur: clamp(Number(x.dur) || 1.5, 0.8, 3) })).filter((x) => x.e).slice(0, 8),
      sfx: true,
      progress: true,
    };
    if (spec.intro.on && !spec.intro.title) spec.intro.on = false;

    await db.from("jobs").update({ status: "draft", progress: 100, input: { ...job.input, spec }, updated_at: now() }).eq("id", job.id);
    console.log("montage planned", job.id, segments.length, "segments", plan ? "(ai)" : "(basic)");
  } catch (e) {
    await fail(job, e);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ---------- Rendering (motion + montage) ----------
const here = dirname(fileURLToPath(import.meta.url));
const serveUrl = await bundle({ entryPoint: join(here, "remotion", "entry.tsx"), publicDir: join(here, "..", "public") });

async function render(job, compositionId, props) {
  const dir = await mkdtemp(join(tmpdir(), "render-"));
  try {
    const composition = await selectComposition({ serveUrl, id: compositionId, inputProps: props });
    const out = join(dir, "out.mp4");
    let last = 0;
    await setProgress(job.id, 3);
    await renderMedia({
      composition, serveUrl, codec: "h264", crf: 20, x264Preset: "veryfast", outputLocation: out, inputProps: props,
      concurrency: Number(process.env.RENDER_CONCURRENCY) || null,
      onProgress: ({ progress }) => { const p = 3 + progress * 92; if (p - last >= 4) { last = p; setProgress(job.id, p); } },
      chromiumOptions: { gl: "swangle" },
    });
    await setProgress(job.id, 97);
    const dest = `${job.user_id}/${job.id}/${crypto.randomUUID()}.mp4`;
    const up = await db.storage.from("results").upload(dest, await readFile(out), { contentType: "video/mp4" });
    if (up.error) throw new Error(`upload: ${up.error.message}`);
    await db.from("jobs").update({ status: "done", progress: 100, output: { files: [{ path: dest, type: "video/mp4" }] }, updated_at: now() }).eq("id", job.id);
    console.log("rendered", compositionId, job.id);
  } catch (e) {
    await fail(job, e);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function renderMontage(job) {
  const spec = job.input.spec;
  const { data } = await db.storage.from("uploads").createSignedUrl(spec.srcPath, 60 * 60 * 3);
  if (!data?.signedUrl) return fail(job, new Error("source video missing"));
  let logo = spec.logo ?? null;
  if (logo?.on && logo.path) {
    const l = await db.storage.from("uploads").createSignedUrl(logo.path, 60 * 60 * 3);
    logo = { ...logo, url: l.data?.signedUrl ?? "" };
  }
  return render(job, "Montage", { ...spec, src: data.signedUrl, logo });
}

console.log("Shaheen video worker started");

// Jobs left "running" by a crash/restart: retry once, then fail and refund (never stuck forever).
async function recoverStale(minutes) {
  const cutoff = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data: stale } = await db.from("jobs").select("id,input").in("tool_id", ["video-editing", "motion-video"]).eq("status", "running").lt("updated_at", cutoff);
  for (const j of stale ?? []) {
    const attempts = Number(j.input?.attempts ?? 0) + 1;
    if (attempts >= 2) {
      await db.from("jobs").update({ status: "failed", error: "WORKER_RESTARTED", updated_at: now() }).eq("id", j.id);
      await db.rpc("refund_job", { p_job: j.id });
      console.log("gave up", j.id);
    } else {
      await db.from("jobs").update({ status: "queued", progress: 0, input: { ...j.input, attempts }, updated_at: now() }).eq("id", j.id);
      console.log("re-queued", j.id);
    }
  }
}
await recoverStale(3); // interrupted jobs stop updating; a job another instance is still rendering keeps updated_at fresh
setInterval(() => recoverStale(15).catch(() => {}), 60_000);

for (;;) {
  const { data: jobs } = await db.from("jobs").select("id,user_id,tool_id,input").in("tool_id", ["video-editing", "motion-video"]).eq("status", "queued").order("created_at").limit(1);
  const job = jobs?.[0];
  if (!job) { await sleep(4000); continue; }
  // claim it (only one worker wins)
  const { data: claimed } = await db.from("jobs").update({ status: "running", updated_at: now() }).eq("id", job.id).eq("status", "queued").select("id");
  if (!claimed?.length) continue;
  if (job.tool_id === "motion-video") await render(job, "Motion", job.input.spec);
  else if (job.input.render && job.input.spec) await renderMontage(job);
  else await analyzeMontage(job);
}
