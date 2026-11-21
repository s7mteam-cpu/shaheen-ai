import { NextResponse } from "next/server";
import { runRetention } from "@/lib/server/retention";

export const maxDuration = 300;

/** Daily (vercel.json → crons). Vercel sends «Authorization: Bearer CRON_SECRET». */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await runRetention().catch((e) => ({ error: String(e) }))) });
}
