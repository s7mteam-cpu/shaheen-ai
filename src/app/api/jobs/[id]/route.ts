import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveFromUrl, signedResultUrls } from "@/lib/providers/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { veoCheck } from "@/lib/providers/google";
import { failJob, finishJob } from "@/lib/server/jobs";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  let { data: job } = await supabase.from("jobs").select("id,user_id,tool_id,title,status,error,output,credits_charged,refunded,created_at,provider_request_id").eq("id", id).single();
  if (!job) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // Google Veo has no webhook: check the operation while the user waits.
  if (job.status === "running" && job.provider_request_id?.startsWith("google:")) {
    try {
      const done = await veoCheck(job.provider_request_id.slice(7));
      if (done) {
        const saved = await saveFromUrl(job.user_id, job.id, done.url);
        await finishJob(job.id, [{ path: saved.path, type: saved.type.startsWith("video") ? saved.type : "video/mp4" }]);
      }
    } catch (e) {
      await failJob(job.id, e instanceof Error ? e.message : String(e));
    }
    job = (await createAdminClient().from("jobs").select("id,user_id,tool_id,title,status,error,output,credits_charged,refunded,created_at,provider_request_id").eq("id", id).single()).data!;
  }
  const files = ((job.output as { files?: { path: string; type: string; caption?: string }[] })?.files) ?? [];
  const urls = await signedResultUrls(files.map((f) => f.path));
  return NextResponse.json({ ...job, files: files.map((f, i) => ({ ...f, url: urls[i] })) });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  return NextResponse.json({ ok: !error });
}
