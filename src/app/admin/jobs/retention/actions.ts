"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { cleanRetention } from "@/lib/retention";
import { runRetention } from "@/lib/server/retention";

export async function saveRetention(form: FormData) {
  if (!(await requireAdmin("jobs"))) throw new Error("غير مصرّح");
  const value = cleanRetention({ enabled: form.get("enabled") === "on", days: form.get("days"), warn: form.get("warn") });
  await createAdminClient().from("site_content").upsert({ key: "retention", value, updated_at: new Date().toISOString() });
  revalidatePath("/", "layout");
  redirect("/admin/jobs/retention?saved=1");
}

/** one run right now (the same as the daily job): sends the notices and deletes what is already past its notice */
export async function runRetentionNow() {
  if (!(await requireAdmin("jobs"))) throw new Error("غير مصرّح");
  const r = await runRetention();
  revalidatePath("/admin/jobs/retention");
  redirect(`/admin/jobs/retention?ran=${encodeURIComponent(JSON.stringify(r).slice(0, 300))}`);
}
