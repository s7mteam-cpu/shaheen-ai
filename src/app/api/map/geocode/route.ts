import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { geocode } from "@/lib/server/maptiler";

export const runtime = "nodejs";

/** Place name -> coordinates, for the studio's "real map" scene (signed-in users only). */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hit = await geocode(q);
  if (!hit) return NextResponse.json({ error: "ما لقيت المكان." }, { status: 404 });
  return NextResponse.json(hit);
}
