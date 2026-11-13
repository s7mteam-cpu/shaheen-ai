import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** The frozen closing report of a cycle (or an older one, by its index in the re-open log). */
export async function GET(req: Request) {
  if (!(await requireAdmin("finance"))) return new Response("غير مصرّح", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const admin = createAdminClient();
  const { data: p } = await admin.from("finance_periods").select("name,report_path,reopen_log,starts_on,ends_on").eq("id", sp.get("id") ?? "").maybeSingle();
  if (!p) return new Response("not found", { status: 404 });
  const old = sp.get("v");
  const path = old != null ? ((p.reopen_log as { report_path?: string }[])?.[Number(old)]?.report_path ?? null) : p.report_path;
  if (!path) return new Response("no report", { status: 404 });
  const file = `شاهين-تقرير-إقفال-${p.name}-${p.starts_on}-${p.ends_on}.xlsx`;
  const { data } = await admin.storage.from("results").createSignedUrl(path, 300, { download: file });
  if (!data?.signedUrl) return new Response("no report", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
