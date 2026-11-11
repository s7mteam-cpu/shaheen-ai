import { NextResponse } from "next/server";
import { processTapCharge } from "@/lib/server/tapBilling";
import { verifyTapHash, type TapCharge } from "@/lib/tap";

/** Tap → Shaheen, after every payment. The signature is checked, then the charge is re-read from Tap before anything is applied. */
export async function POST(req: Request) {
  let body: TapCharge;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad body" }, { status: 400 }); }
  if (!body?.id?.startsWith("chg_")) return NextResponse.json({ ok: true, ignored: true });
  if (!verifyTapHash(body, req.headers.get("hashstring"))) return NextResponse.json({ error: "bad signature" }, { status: 400 });
  try {
    const r = await processTapCharge(body.id);
    return NextResponse.json({ ok: true, status: r.status });
  } catch (e) {
    console.error("tap webhook", e);
    return NextResponse.json({ error: "retry" }, { status: 500 });
  }
}
