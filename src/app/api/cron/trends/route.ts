import { NextResponse } from "next/server";
import { GROUPS, learnFromCustomers, researchGroup } from "@/lib/server/trends";

export const maxDuration = 300;

/** Daily (vercel.json → crons): one group of fields is researched per day, so each group refreshes about weekly.
 *  On Fridays it also learns from what customers changed. Vercel sends «Authorization: Bearer CRON_SECRET». */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const day = Math.floor(Date.now() / 864e5);
  const group = GROUPS[day % GROUPS.length];
  const out: Record<string, unknown> = { group };
  try { out.research = await researchGroup(group); } catch (e) { out.researchError = String(e instanceof Error ? e.message : e).slice(0, 300); }
  if (new Date().getUTCDay() === 5) {
    try { out.customers = await learnFromCustomers(); } catch (e) { out.customersError = String(e instanceof Error ? e.message : e).slice(0, 300); }
  }
  return NextResponse.json({ ok: true, ...out });
}
