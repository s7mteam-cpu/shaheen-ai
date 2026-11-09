import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OutFile } from "@/lib/tools/run";

export async function finishJob(jobId: string, files: OutFile[]) {
  await createAdminClient().from("jobs")
    .update({ status: "done", output: { files }, updated_at: new Date().toISOString() }).eq("id", jobId);
}

export async function failJob(jobId: string, error: string) {
  const admin = createAdminClient();
  await admin.from("jobs").update({ status: "failed", error: error.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", jobId);
  await admin.rpc("refund_job", { p_job: jobId });
}
