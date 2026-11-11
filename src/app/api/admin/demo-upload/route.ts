import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX = 50 * 1024 * 1024; // Supabase's per-file limit on the free plan

/** Admin → «فيديو المثال»: a signed link so the browser uploads the clip straight to storage (no 4 MB limit). */
export async function POST(req: Request) {
  if (!(await requireAdmin("tools"))) return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const { tool, type, size, name } = (await req.json().catch(() => ({}))) as { tool?: string; type?: string; size?: number; name?: string };
  if (!tool || !/^[\w-]+$/.test(tool)) return NextResponse.json({ error: "أداة غير معروفة." }, { status: 400 });
  if (!type?.startsWith("video/")) return NextResponse.json({ error: "نوع الملف غير مدعوم." }, { status: 400 });
  if (!size || size > MAX) return NextResponse.json({ error: "الفيديو أكبر من 50 ميجا. صغّره وحاول مرة ثانية." }, { status: 413 });
  const ext = (name?.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const path = `demos/${tool}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("site").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "تعذّر تجهيز الرفع." }, { status: 500 });
  return NextResponse.json({ path, token: data.token, url: admin.storage.from("site").getPublicUrl(path).data.publicUrl });
}
