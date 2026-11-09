import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { falVideo } from "@/lib/providers/fal";
import { saveFromUrl } from "@/lib/providers/storage";
import { failJob, finishJob } from "@/lib/server/jobs";

export const maxDuration = 300;

/** fal calls this when a queued video finishes. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== process.env.WORKER_SECRET) return NextResponse.json({ ok: false }, { status: 401 });
  const jobId = url.searchParams.get("job");
  const body = (await req.json()) as { request_id: string; status: "OK" | "ERROR"; payload?: unknown; error?: string };

  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("id,user_id,status,provider_request_id").eq("id", jobId).single();
  if (!job || job.status === "done" || job.status === "failed") return NextResponse.json({ ok: true });
  if (job.provider_request_id && job.provider_request_id !== body.request_id) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    if (body.status !== "OK") throw new Error(body.error || "provider error");
    const video = falVideo(body.payload);
    if (!video) throw new Error("no video in result");
    const saved = await saveFromUrl(job.user_id, job.id, video);
    await finishJob(job.id, [{ path: saved.path, type: saved.type }]);
  } catch (e) {
    await failJob(job.id, e instanceof Error ? e.message : String(e));
  }
  return NextResponse.json({ ok: true });
}
