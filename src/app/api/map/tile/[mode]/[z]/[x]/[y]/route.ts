import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Map tiles for the "real map" scene. The MapTiler key stays on the server. */
export async function GET(_req: Request, { params }: { params: Promise<{ mode: string; z: string; x: string; y: string }> }) {
  const { mode, z, x, y } = await params;
  const key = process.env.MAPTILER_KEY;
  const Z = Number(z), X = Number(x), Y = Number(y.replace(/\.\w+$/, ""));
  if (!key || (mode !== "sat" && mode !== "relief") || !Number.isInteger(Z) || Z < 2 || Z > 16 || !Number.isInteger(X) || !Number.isInteger(Y) || X < 0 || Y < 0 || X >= 2 ** Z || Y >= 2 ** Z)
    return new NextResponse("bad request", { status: 400 });
  const url = mode === "sat"
    ? `https://api.maptiler.com/tiles/satellite-v2/${Z}/${X}/${Y}.jpg?key=${key}`
    : `https://api.maptiler.com/maps/outdoor-v2/256/${Z}/${X}/${Y}.png?key=${key}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!r || !r.ok) return new NextResponse("upstream", { status: 502 });
  return new NextResponse(await r.arrayBuffer(), { headers: { "Content-Type": mode === "sat" ? "image/jpeg" : "image/png", "Cache-Control": "public, max-age=2592000, s-maxage=2592000, immutable", "Access-Control-Allow-Origin": "*" } });
}
