import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX = 50 * 1024 * 1024; // Supabase's per-file limit on the free plan

/** Admin → «معرض شاهين»: a signed link so the browser uploads images / reels straight to storage (no 4 MB limit). */
export async function POST(req: Request) {
  if (!(await requireAdmin("gallery"))) return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  const { type, size, name } = (await req.json().catch(() => ({}))) as { type?: string; size?: number; name?: string };
  if (!type || !/^(image|video)\//.test(type)) return NextResponse.json({ error: "الملف لازم يكون صورة أو فيديو." }, { status: 400 });
  if (!size || size > MAX) return NextResponse.json({ error: "الملف أكبر من 50 ميجا. صغّره وحاول مرة ثانية." }, { status: 413 });
  const ext = (name?.split(".").pop() || (type.startsWith("video") ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `gallery/${crypto.randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("site").createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: "تعذّر تجهيز الرفع." }, { status: 500 });
  return NextResponse.json({ path, token: data.token, url: admin.storage.from("site").getPublicUrl(path).data.publicUrl, video: type.startsWith("video") });
}
