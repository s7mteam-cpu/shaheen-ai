import "server-only";
import type { Graphic, MontageSpec } from "@/remotion/montage";

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Find a place by name with MapTiler geocoding. Returns centre + a sensible zoom, or null. */
export async function geocode(q: string): Promise<{ lat: number; lon: number; zoom: number; name: string } | null> {
  const key = process.env.MAPTILER_KEY;
  if (!key || !q.trim()) return null;
  try {
    const r = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q.trim().slice(0, 80))}.json?key=${key}&limit=1&language=ar`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { features?: { center?: number[]; bbox?: number[]; place_name?: string; text?: string }[] };
    const f = j.features?.[0];
    if (!f?.center || f.center.length < 2) return null;
    let zoom = 10;
    if (f.bbox && f.bbox.length === 4) {
      const span = Math.max(Math.abs(f.bbox[2] - f.bbox[0]), Math.abs(f.bbox[3] - f.bbox[1]), 0.002);
      zoom = Math.round(Math.max(4, Math.min(14, Math.log2(360 / span) - 1)));
    }
    return { lat: f.center[1], lon: f.center[0], zoom, name: f.text ?? q };
  } catch { return null; }
}

/** Fill lat/lon/zoom of "terrain" scenes from their place name, and tell the video where the tile proxy lives. */
export async function resolveTerrain(m: Pick<MontageSpec, "graphics" | "mapBase">): Promise<void> {
  const gs = (m.graphics ?? []).filter((g: Graphic) => g.kind === "terrain");
  if (!gs.length) return;
  m.mapBase = `${site()}/api/map/tile`;
  const cache = new Map<string, Awaited<ReturnType<typeof geocode>>>();
  for (const g of gs) {
    if (g.lat !== undefined && g.lon !== undefined) continue;
    const q = g.place ?? g.text ?? "";
    if (!cache.has(q)) cache.set(q, await geocode(q));
    const hit = cache.get(q);
    if (hit) { g.lat = hit.lat; g.lon = hit.lon; g.zoom = g.zoom ?? hit.zoom; }
  }
}
