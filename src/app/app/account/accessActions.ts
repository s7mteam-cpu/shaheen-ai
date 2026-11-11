"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACCESS_HOURS, consentText, latestAccess } from "@/lib/server/supportAccess";
import { serverT } from "@/lib/server/lang";

type Res = { ok?: string; error?: string } | undefined;

async function me() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  return user;
}

/** The customer approves (in writing) or refuses the support team's request. */
export async function answerAccess(_prev: Res, form: FormData): Promise<Res> {
  const T = await serverT();
  const user = await me();
  if (!user) return { error: T("سجّل دخولك.", "Please sign in.") };
  const req = await latestAccess(user.id);
  if (!req || req.status !== "pending") return { error: T("ما فيه طلب بانتظار موافقتك.", "There is no request waiting for your approval.") };
  const admin = createAdminClient();
  if (form.get("answer") === "deny") {
    await admin.from("support_access").update({ status: "denied", decided_at: new Date().toISOString() }).eq("id", req.id).eq("user_id", user.id);
    revalidatePath("/app", "layout");
    return { ok: T("رفضت الطلب. محد يقدر يدخل على حسابك.", "Request declined. No one can access your account.") };
  }
  const name = String(form.get("name") || "").trim().slice(0, 80);
  if (form.get("agree") !== "on" || name.length < 2) return { error: T("علّم مربع الموافقة واكتب اسمك الكامل.", "Tick the approval box and type your full name.") };
  const now = new Date();
  await admin.from("support_access").update({
    status: "approved", signed_name: name, consent_text: consentText(name, req.reason),
    decided_at: now.toISOString(), expires_at: new Date(now.getTime() + ACCESS_HOURS * 3600e3).toISOString(),
  }).eq("id", req.id).eq("user_id", user.id);
  revalidatePath("/app", "layout");
  return { ok: T(`وافقت. فريق شاهين يقدر يدخل على حسابك خلال ${ACCESS_HOURS} ساعة، وتقدر تلغي الصلاحية بأي وقت.`, `Approved. The Shaheen team can access your account for ${ACCESS_HOURS} hours, and you can revoke access anytime.`) };
}

/** The customer withdraws an approval at any time. */
export async function revokeAccess() {
  const user = await me();
  if (!user) return;
  await createAdminClient().from("support_access").update({ status: "revoked", decided_at: new Date().toISOString() })
    .eq("user_id", user.id).in("status", ["approved", "pending"]);
  revalidatePath("/app", "layout");
}
