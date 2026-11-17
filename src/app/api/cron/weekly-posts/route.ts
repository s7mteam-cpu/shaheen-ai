import { NextResponse } from "next/server";
import { runWeekly } from "@/lib/server/weeklyPosts";

export const maxDuration = 300;

/** Saturday 9:00 Kuwait = 06:00 UTC (vercel.json → crons, repeated at :15 and :30 to finish what didn't fit; finished slots are skipped).
 *  Vercel sends «Authorization: Bearer CRON_SECRET». */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runWeekly()) });
}
