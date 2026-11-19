import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { estimateSeconds } from "@/lib/freeEstimate";

export const maxDuration = 10;

/** «تلقائي»: how long the video should be for this idea, and what it costs, shown to the customer BEFORE anything is charged. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const idea = String(b.idea ?? "").replace(/\s+/g, " ").trim().slice(0, 1500);
  if (idea.length < 10) return NextResponse.json({ error: "اكتب فكرتك بتفصيل أكثر (جملتين على الأقل)." }, { status: 400 });
  const { data: tool } = await createAdminClient().from("tools").select("credit_cost").eq("id", "free-motion").maybeSingle();
  const e = estimateSeconds(String(b.idea ?? ""));
  return NextResponse.json({ seconds: e.seconds, scenes: e.scenes, condensed: e.condensed, cost: (e.seconds / 15) * (tool?.credit_cost ?? 25) });
}
