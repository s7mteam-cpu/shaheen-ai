"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { GROUPS, learnFromCustomers, researchGroup } from "@/lib/server/trends";

async function guard() {
  if (!(await requireAdmin("trends"))) throw new Error("غير مصرّح");
}
const done = () => revalidatePath("/admin/trends");

export async function setTrend(form: FormData) {
  await guard();
  const id = String(form.get("id")), act = String(form.get("act"));
  const db = createAdminClient().from("trends");
  const now = new Date();
  if (act === "approve" || act === "renew") await db.update({ status: "approved", approved_at: now.toISOString(), expires_at: new Date(now.getTime() + 60 * 864e5).toISOString() }).eq("id", id);
  else if (act === "reject") await db.update({ status: "rejected" }).eq("id", id);
  else if (act === "delete") await db.delete().eq("id", id);
  else if (act === "edit") await db.update({ instruction: String(form.get("instruction") ?? "").slice(0, 500) }).eq("id", id);
  done();
}

/** Research one group now (instead of waiting for its day). */
export async function runResearch(form: FormData) {
  await guard();
  const g = String(form.get("group"));
  if (!GROUPS.includes(g)) return;
  await researchGroup(g);
  done();
}

export async function runCustomers() {
  await guard();
  await learnFromCustomers();
  done();
}
