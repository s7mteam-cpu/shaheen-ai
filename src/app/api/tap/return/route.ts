import { NextResponse } from "next/server";
import { processTapCharge } from "@/lib/server/tapBilling";

const site = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** The customer comes back here from Tap's payment page (?tap_id=chg_…). */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("tap_id");
  if (!id?.startsWith("chg_")) return NextResponse.redirect(`${site()}/app/account?error=payment`);
  try {
    const r = await processTapCharge(id);
    if (r.status === "CAPTURED") return NextResponse.redirect(`${site()}${r.kind === "managed" ? "/app?paid=managed" : r.kind === "renew" ? "/app/account?paid=renew" : "/app?welcome=1"}`);
    return NextResponse.redirect(`${site()}/app/account?error=payment`);
  } catch (e) {
    console.error("tap return", e);
    return NextResponse.redirect(`${site()}/app/account?error=payment`);
  }
}
