import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";

/** A finished motion video or montage goes back to the studio for more edits (free: only the AI edits inside it are charged). */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("id,user_id,tool_id,status,input").eq("id", id).single();
  if (!job || job.user_id !== user.id) return NextResponse.json({ error: "العمل غير موجود." }, { status: 404 });
  if (!["motion-video", "real-scenes", "video-editing"].includes(job.tool_id) || job.status !== "done" || !job.input?.spec) {
    return NextResponse.json({ error: "ما نقدر نرجّع هذا العمل للتعديل." }, { status: 400 });
  }
  // v295: opening the studio again costs nothing (no AI call). Only the AI edits inside it are charged, one by one.
  // the last export stays in «أعمالي» until the next export replaces it
  await admin.from("jobs").update({ status: "draft", progress: 100, error: null, input: { ...job.input, render: false, attempts: 0 }, updated_at: new Date().toISOString() }).eq("id", job.id);
  return NextResponse.json({ ok: true });
}
