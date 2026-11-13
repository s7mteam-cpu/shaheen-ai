import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { backupLink, makeBackup } from "@/lib/server/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** «تنزيل البيانات»: builds the backup zip (lib/server/backup.ts) and hands back a 10-minute link (Vercel's 4.5 MB limit). */
export async function POST() {
  const me = await requireAdmin("reset"); // includes the «كلمات السر» lock when the owner locked this section
  if (!me) return NextResponse.json({ error: "locked" }, { status: 403 });
  const r = await makeBackup();
  if (r.error || !r.name) return NextResponse.json({ error: r.error ?? "فشل" }, { status: 500 });
  await audit(me, "backup_download", undefined, `${((r.size ?? 0) / 1048576).toFixed(1)} MB`);
  return NextResponse.json({ url: await backupLink(r.name), size: r.size, summary: r.summary });
}
