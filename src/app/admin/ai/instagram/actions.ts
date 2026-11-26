"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { cleanInstaSession } from "@/lib/instaRead";

type Res = { ok?: string; error?: string } | undefined;
const KEY = "insta_session";

/** saves the platform's Instagram session: the session value is optional (empty = keep the one saved), and the switch turns the feature on or off */
export async function saveInsta(_p: Res, form: FormData): Promise<Res> {
  const me = await requireAdmin("ai");
  if (!me) return { error: "غير مصرّح" };
  const admin = createAdminClient();
  const { data } = await admin.from("admin_secrets").select("value").eq("key", KEY).maybeSingle();
  const old = cleanInstaSession(data?.value);
  const typed = String(form.get("sessionid") ?? "").trim();
  let sessionid = old.sessionid, bad = old.bad, badAt = old.badAt;
  if (typed) {
    if (!/^[A-Za-z0-9%._:-]{20,300}$/.test(typed)) return { error: "قيمة الجلسة مو صحيحة. انسخها كاملة من المتصفح." };
    sessionid = typed; bad = undefined; badAt = undefined;
  }
  const on = form.get("on") === "on";
  if (on && !sessionid) return { error: "حط قيمة الجلسة أول عشان تشغّلها." };
  const value = { on, sessionid, ...(bad ? { bad: true, badAt } : {}), at: new Date().toISOString() };
  const { error } = await admin.from("admin_secrets").upsert({ key: KEY, value, updated_at: new Date().toISOString() });
  if (error) return { error: "ما انحفظت." };
  await audit(me, "insta_cfg", undefined, `${on ? "مشغّلة" : "موقوفة"}${typed ? " + جلسة جديدة" : ""}`);
  revalidatePath("/admin/ai/instagram");
  return { ok: on ? "انحفظت ✓ زيارة الحسابات مشغّلة." : "انحفظت ✓ زيارة الحسابات موقوفة، والعملاء يرفعون بأنفسهم." };
}

export async function clearInsta(): Promise<void> {
  const me = await requireAdmin("ai");
  if (!me) return;
  await createAdminClient().from("admin_secrets").delete().eq("key", KEY);
  await audit(me, "insta_cfg", undefined, "انمسحت الجلسة");
  revalidatePath("/admin/ai/instagram");
}
