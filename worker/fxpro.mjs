// «لمسات المونتير» for «مونتاج مبتكر»: punch-in zooms on the speaker, sound effects under the graphics, a light flash between topics and quiet music.
// Everything here is arithmetic and ffmpeg (no model writes any of it); the director only says WHEN. Any failure simply leaves that touch out: the montage itself never fails here.
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const SFX_DIR = fileURLToPath(new URL("../public/sfx/", import.meta.url));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

/** the director's zoom moments → clean, sorted, not touching each other */
export function cleanZooms(raw, seconds) {
  const out = [];
  for (const z of (Array.isArray(raw) ? raw : []).slice(0, 40)) {
    const s = num(z?.s), e0 = num(z?.e); if (s == null || s < 0.3 || s > seconds - 2.5) continue;
    const e = Math.min(seconds - 0.5, Math.max(s + 1.6, Math.min(s + 6, e0 ?? s + 3)));
    if (out.length && s - out.at(-1).e < 2.5) continue;
    out.push({ s: +s.toFixed(2), e: +e.toFixed(2) });
    if (out.length >= Math.max(1, Math.round(seconds / 9))) break;
  }
  return out;
}
/** the director's topic changes → clean times for the flash */
export function cleanBeats(raw, seconds) {
  const out = [];
  for (const b of (Array.isArray(raw) ? raw : []).map(num).filter((x) => x != null).sort((a, b) => a - b)) {
    if (b < 2 || b > seconds - 1.5 || (out.length && b - out.at(-1) < 5)) continue;
    out.push(+b.toFixed(2));
    if (out.length >= Math.max(1, Math.round(seconds / 10))) break;
  }
  return out;
}

/** the prepared video with soft punch-ins towards the face: same size, same number of frames, same sound. Returns "" when it could not be made (the plain video is used). */
export async function zoomBase({ d, norm, out, zooms, fx, fy, W, H, FPS, frames, amount = 0.1 }) {
  if (!zooms?.length) return "";
  try {
    const cx = Math.min(0.8, Math.max(0.2, fx ?? 0.5)).toFixed(3), cy = Math.min(0.7, Math.max(0.15, fy ?? 0.35)).toFixed(3);
    // each zoom: 0.4 s in, hold, 0.4 s out, eased (smoothstep). `it` is the frame's own time.
    const sum = zooms.map((z) => `st(0,clip((it-${z.s})/0.4,0,1)*clip((${z.e}-it)/0.4,0,1))*ld(0)*(3-2*ld(0))`).map((x) => `(${x})`).join("+");
    await d.ff(["-i", norm, "-vf", `zoompan=z='1+${amount}*(${sum})':x='(iw-iw/zoom)*${cx}':y='(ih-ih/zoom)*${cy}':d=1:s=${W}x${H}:fps=${FPS},format=yuv420p`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-c:a", "copy", "-movflags", "+faststart", out]);
    const got = await d.countFrames(out).catch(() => 0);
    if (Math.abs(got - frames) > 1) { console.error("fx zoom frames", got, frames); return ""; } // never trade sync for a zoom
    return out;
  } catch (e) { console.error("fx zoom", e?.message ?? e); return ""; }
}

/** which sound goes under which graphic (decided by the kind of the graphic, never by a model) */
export function sfxPlan(cues, beats = []) {
  const kind = (c) => ["hook", "title", "full", "image", "photo", "map", "compare", "clipping"].includes(c.type) || c.layer === "behind" ? "whoosh" : ["number", "outro"].includes(c.type) ? "ding" : "pop";
  const ev = [...cues.map((c) => ({ t: Math.max(0, c.s - 0.08), k: kind(c) })), ...beats.map((t) => ({ t: Math.max(0, t - 0.12), k: "whoosh" }))].sort((a, b) => a.t - b.t);
  const out = [];
  for (const e of ev) { if (out.length && e.t - out.at(-1).t < 0.7) continue; out.push({ t: +e.t.toFixed(2), k: e.k }); if (out.length >= 60) break; }
  return out;
}
const VOL = { whoosh: 0.3, pop: 0.38, ding: 0.2 };

/** the final sound: the customer's own voice untouched in level, the effects and the music quietly under it. `voice` is any file whose sound is his voice (the prepared video or the kept voice track).
 *  gSfx / gMusic are the studio's volume sliders (1 = as made, 0 = off). Returns "" when nothing was added or it failed. */
export async function mixSound({ d, voice, out, sfx = [], music = "", seconds, gSfx = 1, gMusic = 1 }) {
  const g1 = Math.min(2, Math.max(0, Number(gSfx) || 0)), g2 = Math.min(2, Math.max(0, Number(gMusic) || 0));
  const ev = g1 > 0 ? sfx.filter((e) => VOL[e?.k] && Number.isFinite(Number(e?.t)) && existsSync(join(SFX_DIR, `${e.k}.mp3`))).slice(0, 60) : [];
  const mus = g2 > 0 ? music : "";
  if (!ev.length && !mus) return "";
  try {
    const args = ["-i", voice], chains = ["[0:a]aresample=44100,aformat=channel_layouts=stereo[a0]"], labels = ["[a0]"];
    let n = 1;
    if (mus) { args.push("-stream_loop", "-1", "-i", mus); chains.push(`[${n}:a]aresample=44100,aformat=channel_layouts=stereo,atrim=0:${seconds.toFixed(2)},volume=${(0.11 * g2).toFixed(3)},afade=t=in:st=0:d=1.2,afade=t=out:st=${Math.max(0, seconds - 2.5).toFixed(2)}:d=2.5[m]`); labels.push("[m]"); n++; }
    for (const e of ev) { args.push("-i", join(SFX_DIR, `${e.k}.mp3`)); const ms = Math.max(0, Math.round(Number(e.t) * 1000)); chains.push(`[${n}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${(VOL[e.k] * g1).toFixed(3)},adelay=${ms}|${ms}[s${n}]`); labels.push(`[s${n}]`); n++; }
    const script = out + ".txt";
    await writeFile(script, `${chains.join(";")};${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=first:dropout_transition=0,alimiter=limit=0.97[o]`);
    await d.ff([...args, "-filter_complex_script", script, "-map", "[o]", "-vn", "-t", seconds.toFixed(3), "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2", out]);
    return out;
  } catch (e) { console.error("fx sound", e?.message ?? e); return ""; }
}

// ---------- «قص السكتات»: long silences are cut out of the prepared video before anything else, so the talk runs tight ----------
/** saved cut list → clean [[from,to],…] of the parts that stay */
export function cleanCuts(raw, FPS = 30) {
  const out = [];
  for (const k of (Array.isArray(raw) ? raw : []).slice(0, 80)) {
    const a = num(k?.[0]), b = num(k?.[1]); if (a == null || b == null || a < 0 || b - a < 0.2 || (out.length && a < out.at(-1)[1])) continue;
    out.push([Math.round(a * FPS) / FPS, Math.round(b * FPS) / FPS]);
  }
  return out;
}
/** listens for silences of 0.8 s and more; returns the parts that stay (a short breath is left at every cut), or [] when there is nothing worth cutting */
export async function findCuts({ d, norm, seconds, FPS }) {
  try {
    const { stderr } = await d.ff(["-i", norm, "-vn", "-af", "silencedetect=noise=-34dB:d=0.8", "-f", "null", "-"]);
    const starts = [...String(stderr).matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Number(m[1])), ends = [...String(stderr).matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
    const keep = []; let at = 0, cut = 0;
    for (let i = 0; i < starts.length && keep.length < 70; i++) {
      const s = Math.max(0, starts[i]) + 0.22, e = (ends[i] ?? seconds) - 0.22; // a breath stays on both sides
      if (e - s < 0.35 || s <= at) continue;
      if (s - at >= 0.2) keep.push([at, s]);
      cut += e - s; at = e;
    }
    if (seconds - at >= 0.2) keep.push([at, seconds]);
    const q = cleanCuts(keep, FPS);
    return cut >= 0.8 && q.length >= 2 && seconds - cut >= 3 ? q : [];
  } catch (e) { console.error("fx cuts", e?.message ?? e); return []; }
}
/** the prepared video with only the kept parts, picture and sound cut at the very same frame times (no drift). Returns "" when it failed. */
export async function applyCuts({ d, norm, out, keep, FPS }) {
  if (!keep?.length) return "";
  try {
    const parts = keep.map(([a, b], i) => `[0:v]trim=start=${a.toFixed(4)}:end=${b.toFixed(4)},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=start=${a.toFixed(4)}:end=${b.toFixed(4)},asetpts=PTS-STARTPTS[a${i}]`);
    const script = out + ".txt";
    await writeFile(script, `${parts.join(";")};${keep.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${keep.length}:v=1:a=1[v][a]`);
    await d.ff(["-i", norm, "-filter_complex_script", script, "-map", "[v]", "-map", "[a]", "-r", String(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "14", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2", "-movflags", "+faststart", out]);
    return out;
  } catch (e) { console.error("fx cuts apply", e?.message ?? e); return ""; }
}

/** a small copy of the prepared video (with its cuts and zooms) and the finished sound: what the studio plays under the graphics */
export async function previewBase({ d, base, sound, out, W, H }) {
  try {
    await d.ff(["-i", base, ...(sound ? ["-i", sound] : []), "-map", "0:v", "-map", sound ? "1:a" : "0:a?", "-vf", `scale=${Math.round(W / 4) * 2}:${Math.round(H / 4) * 2}`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "112k", "-shortest", "-movflags", "+faststart", out]);
    return out;
  } catch (e) { console.error("fx preview", e?.message ?? e); return ""; }
}

/** a quick light sweep at a change of topic, for the piece from a to b (pure CSS, timed like the captions) */
export function beatLayer(beats, a, b) {
  const mine = (beats ?? []).filter((t) => t >= a && t < b - 0.4);
  if (!mine.length) return "";
  return `<style>.fxbeat{position:fixed;inset:0;z-index:2147482000;pointer-events:none;opacity:0;background:linear-gradient(105deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.85) 50%,rgba(255,255,255,0) 70%);background-size:300% 100%;animation:fxbeat .42s ease-out both}
@keyframes fxbeat{0%{opacity:0;background-position:120% 0}35%{opacity:.34}100%{opacity:0;background-position:-20% 0}}</style>${mine.map((t) => `<div class="fxbeat" aria-hidden="true" style="animation-delay:${(t - a).toFixed(2)}s"></div>`).join("")}`;
}
