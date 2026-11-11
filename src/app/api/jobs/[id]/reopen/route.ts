import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";

/** A finished motion video or montage goes back to the studio for more edits (charged like one edit). */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("id,user_id,tool_id,status,input").eq("id", id).single();
  if (!job || job.user_id !== user.id) return NextResponse.json({ error: "العمل غير موجود." }, { status: 404 });
  if (!["motion-video", "video-editing", "lesson-video"].includes(job.tool_id) || job.status !== "done" || !job.input?.spec) {
    return NextResponse.json({ error: "ما نقدر نرجّع هذا العمل للتعديل." }, { status: 400 });
  }
  const { data: tool } = await admin.from("tools").select("edit_cost").eq("id", job.tool_id).single();
  const cost = tool?.edit_cost ?? 3;
  const { error } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (error) return NextResponse.json({ error: error.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 });
  // the last export stays in «أعمالي» until the next export replaces it
  await admin.from("jobs").update({ status: "draft", progress: 100, error: null, input: { ...job.input, render: false, attempts: 0 }, updated_at: new Date().toISOString() }).eq("id", job.id);
  return NextResponse.json({ ok: true });
}
