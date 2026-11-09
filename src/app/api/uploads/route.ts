import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";

const limits: Record<string, { types: RegExp; mb: number }> = {
  image: { types: /^image\/(png|jpe?g|webp)$/, mb: 10 },
  video: { types: /^video\/(mp4|quicktime|webm)$/, mb: 500 },
  audio: { types: /^audio\//, mb: 25 },
};

/** Returns a one-time signed URL; the browser uploads the file straight to storage. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const { kind, type, size, name } = (await req.json()) as { kind: string; type: string; size: number; name: string };
  const rule = limits[kind];
  if (!rule || !rule.types.test(type)) return NextResponse.json({ error: "نوع الملف غير مدعوم." }, { status: 400 });
  if (size > rule.mb * 1024 * 1024) return NextResponse.json({ error: `الحد الأقصى ${rule.mb} ميجا.` }, { status: 400 });
  const ext = (name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from("uploads").createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: "تعذّر تجهيز الرفع." }, { status: 500 });
  return NextResponse.json({ path, token: data.token });
}
