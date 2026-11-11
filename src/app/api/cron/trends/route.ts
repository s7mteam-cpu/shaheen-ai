import { NextResponse } from "next/server";
import { GROUPS, learnFromCustomers, researchGroup } from "@/lib/server/trends";

export const maxDuration = 300;

/** Weekly, Friday (vercel.json → crons): two groups of fields are researched (each group about once a month),
 *  then the lab learns from what customers changed. Kept small on purpose to save AI credit.
 *  Vercel sends «Authorization: Bearer CRON_SECRET». Run any group anytime from /admin/trends. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const week = Math.floor(Date.now() / (7 * 864e5));
  const picks = [GROUPS[(week * 2) % GROUPS.length], GROUPS[(week * 2 + 1) % GROUPS.length]];
  const out: Record<string, unknown> = { groups: picks };
  for (const g of picks) {
    try { out[g] = await researchGroup(g); } catch (e) { out[`${g}:error`] = String(e instanceof Error ? e.message : e).slice(0, 300); }
  }
  try { out.customers = await learnFromCustomers(); } catch (e) { out.customersError = String(e instanceof Error ? e.message : e).slice(0, 300); }
  return NextResponse.json({ ok: true, ...out });
}
