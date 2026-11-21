import { NextResponse } from "next/server";
import { getRetention } from "@/lib/server/retention";

/** Public and tiny: the screens that show a finished result read «how long are files kept» from here. */
export async function GET() {
  const r = await getRetention().catch(() => ({ enabled: false, days: 45, warn: 7 }));
  return NextResponse.json({ enabled: r.enabled, days: r.days }, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
