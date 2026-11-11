import { NextResponse } from "next/server";
import { runRenewals } from "@/lib/server/tapBilling";
import { tapEnabled } from "@/lib/tap";

/** Daily (vercel.json → crons). Vercel sends «Authorization: Bearer CRON_SECRET». */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!tapEnabled()) return NextResponse.json({ ok: true, skipped: "tap off" });
  return NextResponse.json({ ok: true, log: await runRenewals() });
}
