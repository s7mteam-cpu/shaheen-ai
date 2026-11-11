"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCESS_HOURS, consentText, latestAccess } from "@/lib/server/supportAccess";

type Res = { ok?: string; error?: string } | undefined;

async function me() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  return user;
}

/** The customer approves (in writing) or refuses the support team's request. */
export async function answerAccess(_prev: Res, form: FormData): Promise<Res> {
  const user = await me();
  if (!user) return { error: "سجّل دخولك." };
  const req = await latestAccess(user.id);
  if (!req || req.status !== "pending") return { error: "ما فيه طلب بانتظار موافقتك." };
  const admin = createAdminClient();
  if (form.get("answer") === "deny") {
    await admin.from("support_access").update({ status: "denied", decided_at: new Date().toISOString() }).eq("id", req.id).eq("user_id", user.id);
    revalidatePath("/app", "layout");
    return { ok: "رفضت الطلب. محد يقدر يدخل على حسابك." };
  }
  const name = String(form.get("name") || "").trim().slice(0, 80);
  if (form.get("agree") !== "on" || name.length < 2) return { error: "علّم مربع الموافقة واكتب اسمك الكامل." };
  const now = new Date();
  await admin.from("support_access").update({
    status: "approved", signed_name: name, consent_text: consentText(name, req.reason),
    decided_at: now.toISOString(), expires_at: new Date(now.getTime() + ACCESS_HOURS * 3600e3).toISOString(),
  }).eq("id", req.id).eq("user_id", user.id);
  revalidatePath("/app", "layout");
  return { ok: `وافقت. فريق شاهين يقدر يدخل على حسابك خلال ${ACCESS_HOURS} ساعة، وتقدر تلغي الصلاحية بأي وقت.` };
}

/** The customer withdraws an approval at any time. */
export async function revokeAccess() {
  const user = await me();
  if (!user) return;
  await createAdminClient().from("support_access").update({ status: "revoked", decided_at: new Date().toISOString() })
    .eq("user_id", user.id).in("status", ["approved", "pending"]);
  revalidatePath("/app", "layout");
}
