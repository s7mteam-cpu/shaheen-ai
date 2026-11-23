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

/** the final sound: the customer's own voice untouched in level, the effects and the music quietly under it. Returns "" when nothing was added or it failed. */
export async function mixSound({ d, norm, out, sfx = [], music = "", seconds }) {
  const ev = sfx.filter((e) => VOL[e.k] && existsSync(join(SFX_DIR, `${e.k}.mp3`)));
  if (!ev.length && !music) return "";
  try {
    const args = ["-i", norm], chains = ["[0:a]aresample=44100,aformat=channel_layouts=stereo[a0]"], labels = ["[a0]"];
    let n = 1;
    if (music) { args.push("-stream_loop", "-1", "-i", music); chains.push(`[${n}:a]aresample=44100,aformat=channel_layouts=stereo,atrim=0:${seconds.toFixed(2)},volume=0.11,afade=t=in:st=0:d=1.2,afade=t=out:st=${Math.max(0, seconds - 2.5).toFixed(2)}:d=2.5[m]`); labels.push("[m]"); n++; }
    for (const e of ev) { args.push("-i", join(SFX_DIR, `${e.k}.mp3`)); const ms = Math.round(e.t * 1000); chains.push(`[${n}:a]aresample=44100,aformat=channel_layouts=stereo,volume=${VOL[e.k]},adelay=${ms}|${ms}[s${n}]`); labels.push(`[s${n}]`); n++; }
    const script = join(out + ".txt");
    await writeFile(script, `${chains.join(";")};${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=first:dropout_transition=0,alimiter=limit=0.97[o]`);
    await d.ff([...args, "-filter_complex_script", script, "-map", "[o]", "-vn", "-t", seconds.toFixed(3), "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2", out]);
    return out;
  } catch (e) { console.error("fx sound", e?.message ?? e); return ""; }
}

/** a quick light sweep at a change of topic, for the piece from a to b (pure CSS, timed like the captions) */
export function beatLayer(beats, a, b) {
  const mine = (beats ?? []).filter((t) => t >= a && t < b - 0.4);
  if (!mine.length) return "";
  return `<style>.fxbeat{position:fixed;inset:0;z-index:2147482000;pointer-events:none;opacity:0;background:linear-gradient(105deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.85) 50%,rgba(255,255,255,0) 70%);background-size:300% 100%;animation:fxbeat .42s ease-out both}
@keyframes fxbeat{0%{opacity:0;background-position:120% 0}35%{opacity:.34}100%{opacity:0;background-position:-20% 0}}</style>${mine.map((t) => `<div class="fxbeat" aria-hidden="true" style="animation-delay:${(t - a).toFixed(2)}s"></div>`).join("")}`;
}
