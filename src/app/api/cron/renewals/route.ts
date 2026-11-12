import { NextResponse } from "next/server";
import { runRenewals } from "@/lib/server/tapBilling";
import { tapEnabled } from "@/lib/tap";
import { purgeArchive } from "@/lib/server/archive";

/** Daily (vercel.json → crons). Vercel sends «Authorization: Bearer CRON_SECRET». */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // «الحسابات المغلقة»: anything past its 5 years is deleted for good (runs every day, Tap or not)
  const archive = await purgeArchive().catch((e) => ({ error: String(e) }));
  if (!tapEnabled()) return NextResponse.json({ ok: true, archive, skipped: "tap off" });
  return NextResponse.json({ ok: true, archive, log: await runRenewals() });
}
