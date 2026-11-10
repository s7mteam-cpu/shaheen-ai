// Shaheen video worker
// 1) "video-editing": cut silences → Arabic captions → resize → trim → upload.
// 2) "motion-video": renders the customer's motion-graphics design with Remotion → MP4 → upload.
// Run anywhere with ffmpeg (Railway, Fly.io, a small VPS). Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ELEVENLABS_API_KEY
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
const setProgress = (id, p) => db.from("jobs").update({ progress: Math.max(0, Math.min(100, Math.round(p))), updated_at: new Date().toISOString() }).eq("id", id).then(() => {}, () => {});

async function ff(args) { return run("ffmpeg", ["-hide_banner", "-y", ...args], { maxBuffer: 64 * 1024 * 1024 }); }
async function duration(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
  return Number(stdout.trim());
}

async function cutSilence(input, out, dir) {
  const { stderr } = await ff(["-i", input, "-af", "silencedetect=noise=-32dB:d=0.6", "-f", "null", "-"]);
  const starts = [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const total = await duration(input);
  const keep = []; let cursor = 0;
  starts.forEach((s, i) => { if (s - cursor > 0.15) keep.push([cursor, s + 0.1]); cursor = Math.max(cursor, (ends[i] ?? total) - 0.1); });
  if (total - cursor > 0.15) keep.push([cursor, total]);
  if (keep.length <= 1) return input;
  const parts = keep.map(([a, b], i) => `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS[a${i}];`).join("");
  const concat = keep.map((_, i) => `[v${i}][a${i}]`).join("") + `concat=n=${keep.length}:v=1:a=1[v][a]`;
  await writeFile(join(dir, "graph.txt"), parts + concat);
  await ff(["-i", input, "-filter_complex_script", join(dir, "graph.txt"), "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", out]);
  return out;
}

function srtTime(t) {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), ms = Math.round((t % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

async function captionsGoogle(audio, dir, model) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: "user", parts: [
      { inlineData: { mimeType: "audio/mp3", data: (await readFile(audio)).toString("base64") } },
      { text: "Transcribe this Arabic audio exactly as spoken (keep the dialect). Return ONLY a valid SRT subtitle file, max 6 words per subtitle, accurate timestamps." },
    ] }] }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  const srt = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").replace(/^```(srt)?\n?|```$/g, "").trim();
  const file = join(dir, "subs.srt");
  await writeFile(file, srt + "\n");
  return file;
}

async function captions(input, dir, cfg) {
  const audio = join(dir, "audio.mp3");
  await ff(["-i", input, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio]);
  if (cfg.provider === "google") return captionsGoogle(audio, dir, cfg.model || "gemini-2.5-flash");
  const form = new FormData();
  form.append("model_id", cfg.model || "scribe_v1");
  form.append("timestamps_granularity", "word");
  form.append("file", new Blob([await readFile(audio)]), "audio.mp3");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }, body: form });
  if (!res.ok) throw new Error(`scribe ${res.status}`);
  const words = ((await res.json()).words ?? []).filter((w) => w.type === "word");
  const lines = []; let cur = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= 6 || /[.!؟?،,]$/.test(w.text)) { lines.push(cur); cur = []; }
  }
  if (cur.length) lines.push(cur);
  const srt = lines.map((l, i) => `${i + 1}\n${srtTime(l[0].start)} --> ${srtTime(l[l.length - 1].end)}\n${l.map((w) => w.text).join(" ")}\n`).join("\n");
  const file = join(dir, "subs.srt");
  await writeFile(file, srt);
  return file;
}

function scaleFilter(aspect) {
  const map = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080] };
  const s = map[aspect];
  if (!s) return null;
  return `scale=${s[0]}:${s[1]}:force_original_aspect_ratio=increase,crop=${s[0]}:${s[1]}`;
}

async function processJob(job) {
  const dir = await mkdtemp(join(tmpdir(), "shaheen-"));
  try {
    const [path] = job.input.video ?? [];
    const { data: file, error } = await db.storage.from("uploads").download(path);
    if (error) throw new Error(`download: ${error.message}`);
    let current = join(dir, "in.mp4");
    await writeFile(current, Buffer.from(await file.arrayBuffer()));

    const secs = await duration(current);
    if (secs > MAX_SECONDS) throw new Error("VIDEO_TOO_LONG");
    const paidMinutes = Math.max(1, Math.ceil(Number(job.input.duration_seconds ?? 60) / 60));
    if (Math.ceil(secs / 60) > paidMinutes + 1) throw new Error("DURATION_MISMATCH");

    await setProgress(job.id, 15);
    if (job.input.cut_silence) current = await cutSilence(current, join(dir, "cut.mp4"), dir);

    await setProgress(job.id, 40);
    const filters = [];
    const sf = scaleFilter(job.input.aspect);
    if (sf) filters.push(sf);
    if (job.input.captions) {
      const { data: tool } = await db.from("tools").select("provider,provider_model").eq("id", "video-editing").single();
      const srt = await captions(current, dir, { provider: tool?.provider ?? "elevenlabs", model: tool?.provider_model ?? "" });
      filters.push(`subtitles=${srt}:force_style='FontName=Noto Naskh Arabic,FontSize=14,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=1,Shadow=0,MarginV=60,Alignment=2'`);
    }
    // Final length the customer picked (30s / 60s / 90s); "full" keeps everything.
    const target = Number(job.input.target);
    const limit = Number.isFinite(target) && target > 0 && (await duration(current)) > target ? ["-t", String(target)] : [];
    await setProgress(job.id, 70);
    const out = join(dir, "out.mp4");
    await ff(["-i", current, ...limit, ...(filters.length ? ["-vf", filters.join(",")] : []), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-movflags", "+faststart", out]);

    const dest = `${job.user_id}/${job.id}/${crypto.randomUUID()}.mp4`;
    const up = await db.storage.from("results").upload(dest, await readFile(out), { contentType: "video/mp4" });
    if (up.error) throw new Error(`upload: ${up.error.message}`);
    await db.from("jobs").update({ status: "done", progress: 100, output: { files: [{ path: dest, type: "video/mp4" }] }, updated_at: new Date().toISOString() }).eq("id", job.id);
    console.log("done", job.id);
  } catch (e) {
    console.error("failed", job.id, e);
    await db.from("jobs").update({ status: "failed", error: String(e?.message ?? e).slice(0, 500), updated_at: new Date().toISOString() }).eq("id", job.id);
    await db.rpc("refund_job", { p_job: job.id });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Bundle the motion-graphics composition once at start-up.
const here = dirname(fileURLToPath(import.meta.url));
const serveUrl = await bundle({ entryPoint: join(here, "remotion", "entry.tsx") });

async function renderMotion(job) {
  const dir = await mkdtemp(join(tmpdir(), "motion-"));
  try {
    const props = job.input.spec;
    const composition = await selectComposition({ serveUrl, id: "Motion", inputProps: props });
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
    await db.from("jobs").update({ status: "done", progress: 100, output: { files: [{ path: dest, type: "video/mp4" }] }, updated_at: new Date().toISOString() }).eq("id", job.id);
    console.log("motion done", job.id);
  } catch (e) {
    console.error("motion failed", job.id, e);
    await db.from("jobs").update({ status: "failed", error: String(e?.message ?? e).slice(0, 500), updated_at: new Date().toISOString() }).eq("id", job.id);
    await db.rpc("refund_job", { p_job: job.id });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

console.log("Shaheen video worker started");

// Jobs left "running" by a crash/restart: retry once, then fail and refund (never stuck forever).
async function recoverStale(minutes) {
  const cutoff = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data: stale } = await db.from("jobs").select("id,input").in("tool_id", ["video-editing", "motion-video"]).eq("status", "running").lt("updated_at", cutoff);
  for (const j of stale ?? []) {
    const attempts = Number(j.input?.attempts ?? 0) + 1;
    if (attempts >= 2) {
      await db.from("jobs").update({ status: "failed", error: "WORKER_RESTARTED", updated_at: new Date().toISOString() }).eq("id", j.id);
      await db.rpc("refund_job", { p_job: j.id });
      console.log("gave up", j.id);
    } else {
      await db.from("jobs").update({ status: "queued", progress: 0, input: { ...j.input, attempts }, updated_at: new Date().toISOString() }).eq("id", j.id);
      console.log("re-queued", j.id);
    }
  }
}
await recoverStale(0); // one worker: anything "running" at start-up was interrupted
setInterval(() => recoverStale(15).catch(() => {}), 60_000);
for (;;) {
  const { data: jobs } = await db.from("jobs").select("id,user_id,tool_id,input").in("tool_id", ["video-editing", "motion-video"]).eq("status", "queued").order("created_at").limit(1);
  const job = jobs?.[0];
  if (!job) { await sleep(5000); continue; }
  // claim it (only one worker wins)
  const { data: claimed } = await db.from("jobs").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", job.id).eq("status", "queued").select("id");
  if (claimed?.length) await (job.tool_id === "motion-video" ? renderMotion(job) : processJob(job));
}
