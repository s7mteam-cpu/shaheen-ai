"use client";
/**
 * Finds the beat of a music file in the browser (no server, no cost).
 * Onset envelope (energy rises) → tempo by autocorrelation (70–180 BPM) → a beat grid aligned to the strongest hits.
 * Returns beat times in seconds of the FILE, between start and end.
 */
export async function detectBeats(url: string, start = 0, end?: number | null): Promise<{ bpm: number; beats: number[] }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("download");
  const buf = await res.arrayBuffer();
  const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const ctx = new Ctx();
  const audio = await ctx.decodeAudioData(buf);
  ctx.close().catch(() => {});
  const sr = audio.sampleRate;
  const from = Math.max(0, Math.floor(start * sr));
  const to = Math.min(audio.length, end ? Math.floor(end * sr) : audio.length);
  const ch = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
  const hop = 512, win = 1024;
  const env: number[] = [];
  let prev = 0;
  for (let i = from; i + win < to; i += hop) {
    let e = 0;
    for (let j = 0; j < win; j += 2) { let v = 0; for (const c of ch) v += c[i + j]; e += v * v; }
    e = Math.log1p(e);
    env.push(Math.max(0, e - prev));   // only rises count
    prev = e;
  }
  if (env.length < 40) return { bpm: 0, beats: [] };
  // normalise + remove local average
  const fps = sr / hop;
  const avg = (k: number) => { let s = 0, n = 0; for (let j = Math.max(0, k - 8); j < Math.min(env.length, k + 8); j++) { s += env[j]; n++; } return s / n; };
  const on = env.map((v, k) => Math.max(0, v - avg(k)));
  // tempo
  const minLag = Math.round(fps * 60 / 180), maxLag = Math.round(fps * 60 / 70);
  let best = minLag, bestScore = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let k = 0; k + lag < on.length; k++) s += on[k] * on[k + lag];
    s /= on.length - lag;
    // gentle preference for 100–130 BPM (most pop / reels music)
    const bpm = (60 * fps) / lag;
    s *= 1 + 0.15 * Math.exp(-((bpm - 118) ** 2) / 800);
    if (s > bestScore) { bestScore = s; best = lag; }
  }
  // phase: where the grid hits the most energy
  let phase = 0, phaseScore = -1;
  for (let p = 0; p < best; p++) {
    let s = 0;
    for (let k = p; k < on.length; k += best) s += on[k];
    if (s > phaseScore) { phaseScore = s; phase = p; }
  }
  const beats: number[] = [];
  for (let k = phase; k < on.length; k += best) {
    // snap each grid point to the nearest strong hit (±3 frames) so it feels tight
    let kk = k, mv = on[k];
    for (let d = -3; d <= 3; d++) if (on[k + d] > mv) { mv = on[k + d]; kk = k + d; }
    beats.push(+(start + (kk * hop + win / 2) / sr).toFixed(3));
  }
  return { bpm: Math.round((60 * fps) / best), beats };
}
