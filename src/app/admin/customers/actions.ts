"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireFullAdmin } from "@/lib/server/auth";
import { OWNER_EMAILS } from "@/lib/admin/sections";
import { deleteUserCompletely, emptyFolder } from "@/lib/server/deleteUser";
import { audit } from "@/lib/server/audit";
import { REMEMBER_COOKIE } from "@/lib/supabase/remember";
import { latestAccess } from "@/lib/server/supportAccess";
import { stripe } from "@/lib/stripe";

type Res = { ok?: string; error?: string } | undefined;
const done = () => revalidatePath("/admin/customers");

async function guard() {
  const u = await requireAdmin("customers");
  if (!u) throw new Error("غير مصرّح");
  return u;
}
async function target(id: string) {
  const { data } = await createAdminClient().from("profiles").select("id,email,role,credits,is_suspended,stripe_customer_id").eq("id", id).single();
  return data;
}

/** Add or deduct ريش. A deduction never takes the balance below zero. */
export async function adjustCredits(_prev: Res, form: FormData): Promise<Res> {
  const me = await guard();
  const p = await target(String(form.get("user_id")));
  if (!p) return { error: "العميل غير موجود." };
  const op = form.get("op") === "sub" ? "sub" : "add";
  const raw = Math.abs(Math.trunc(Number(form.get("amount"))));
  const note = String(form.get("note") || "").slice(0, 120);
  if (!raw) return { error: "اكتب عدد الريش." };
  const amount = op === "sub" ? -Math.min(raw, p.credits ?? 0) : raw;
  if (!amount) return { error: "رصيد العميل صفر، ما فيه شي ينخصم." };
  const { error } = await createAdminClient().rpc("grant_credits", { p_user: p.id, p_amount: amount, p_reason: "admin", p_ref: `admin:${me.id}:${Date.now()}:${note}` });
  if (error) return { error: "صار خطأ، حاول مرة ثانية." };
  await audit(me, op === "sub" ? "credits_sub" : "credits_add", p, `${Math.abs(amount)}${note ? ` — ${note}` : ""}`);
  done();
  const now = (p.credits ?? 0) + amount;
  return { ok: op === "sub" ? `انخصم ${-amount} ريشة. الرصيد الآن ${now}.` : `انضاف ${amount} ريشة. الرصيد الآن ${now}.` };
}

export async function setUserFlags(form: FormData) {
  const me = await guard();
  const p = await target(String(form.get("user_id")));
  if (!p) return;
  const patch: Record<string, unknown> = {};
  if (form.has("is_suspended")) patch.is_suspended = form.get("is_suspended") === "true";
  if (form.has("role")) {
    if (!(await requireFullAdmin())) return;
    if (OWNER_EMAILS.includes(String(p.email ?? "").toLowerCase())) return;
    patch.role = form.get("role") === "admin" ? "admin" : "user";
    patch.admin_perms = null;
  }
  await createAdminClient().from("profiles").update(patch).eq("id", p.id);
  if ("is_suspended" in patch) await audit(me, patch.is_suspended ? "suspend" : "unsuspend", p);
  if ("role" in patch) await audit(me, patch.role === "admin" ? "make_admin" : "remove_admin", p);
  done();
}

/** Deletes all of a customer's work and files. The account and balance stay. */
export async function deleteCustomerWork(_prev: Res, form: FormData): Promise<Res> {
  const me = await guard();
  const p = await target(String(form.get("user_id")));
  if (!p) return { error: "العميل غير موجود." };
  const admin = createAdminClient();
  const { count } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", p.id);
  await admin.from("credit_ledger").update({ job_id: null }).eq("user_id", p.id).not("job_id", "is", null);
  const { error } = await admin.from("jobs").delete().eq("user_id", p.id);
  if (error) return { error: "صار خطأ، حاول مرة ثانية." };
  await Promise.all([emptyFolder("uploads", p.id), emptyFolder("results", p.id)]).catch(() => {});
  await audit(me, "delete_work", p, `${count ?? 0} عمل`);
  done();
  return { ok: `انحذف ${count ?? 0} عمل مع ملفاته. الحساب والرصيد مثل ما هم.` };
}

/** Deletes the account and everything in it. They can sign up again unless the email is blocked. */
export async function deleteCustomer(_prev: Res, form: FormData): Promise<Res> {
  const me = await guard();
  const p = await target(String(form.get("user_id")));
  if (!p) return { error: "العميل غير موجود." };
  if (p.id === me.id) return { error: "ما تقدر تحذف حسابك أنت من هنا." };
  if (p.role !== "user") return { error: "هذا حساب من فريق الإدارة. أزله من الفريق أولاً." };
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== String(p.email ?? "").toLowerCase()) return { error: "اكتب بريد العميل بالضبط للتأكيد." };
  const res = await deleteUserCompletely(p);
  if (res.error) return res;
  await audit(me, "delete_account", p);
  done();
  redirect("/admin/customers?deleted=1");
}

/** Blocks the email: the account can't sign in any more, and the email can't sign up again (email or Google). */
export async function blockCustomer(_prev: Res, form: FormData): Promise<Res> {
  const me = await guard();
  const p = await target(String(form.get("user_id")));
  if (!p?.email) return { error: "العميل غير موجود." };
  if (p.role !== "user") return { error: "ما ينفع تحظر حساب من فريق الإدارة." };
  const admin = createAdminClient();
  const reason = String(form.get("reason") || "").slice(0, 200) || null;
  const { error } = await admin.from("blocked_emails").upsert({ email: p.email.toLowerCase(), reason, blocked_by: me.id });
  if (error) return { error: "ما قدرت أحظر. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v24." };
  await admin.auth.admin.updateUserById(p.id, { ban_duration: "876000h" }); // signed out and can't sign in
  await admin.from("profiles").update({ is_suspended: true }).eq("id", p.id);
  await audit(me, "block", p, reason ?? undefined);
  done();
  return { ok: "انحظر البريد: ما يقدر يدخل، ولا يسجّل من جديد بنفس البريد." };
}

export async function unblockEmail(form: FormData) {
  const me = await guard();
  const email = String(form.get("email") || "").toLowerCase();
  if (!email) return;
  const admin = createAdminClient();
  await admin.from("blocked_emails").delete().eq("email", email);
  const { data: p } = await admin.from("profiles").select("id,email").ilike("email", email).maybeSingle();
  if (p) {
    await admin.auth.admin.updateUserById(p.id, { ban_duration: "none" });
    await admin.from("profiles").update({ is_suspended: false }).eq("id", p.id);
  }
  await audit(me, "unblock", { id: p?.id, email });
  done();
}

/** Step 1: ask the customer for permission. They see the request in their account and must approve it in writing. */
export async function requestAccess(_prev: Res, form: FormData): Promise<Res> {
  const me = await guard();
  const p = await target(String(form.get("user_id")));
  if (!p) return { error: "العميل غير موجود." };
  if (p.role !== "user") return { error: "ما ينفع على حساب من فريق الإدارة." };
  const reason = String(form.get("reason") || "").trim().slice(0, 200);
  if (reason.length < 3) return { error: "اكتب سبب الطلب (مثلاً: مشكلة بتصدير المونتاج)." };
  const admin = createAdminClient();
  await admin.from("support_access").update({ status: "revoked", decided_at: new Date().toISOString() }).eq("user_id", p.id).in("status", ["pending", "approved"]);
  const { error } = await admin.from("support_access").insert({ user_id: p.id, requested_by: me.id, reason });
  if (error) return { error: "ما قدرت أرسل الطلب. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v24." };
  await audit(me, "access_request", p, reason);
  done();
  return { ok: "انرسل الطلب. يطلع للعميل بحسابه، ولما يوافق يصير زر الدخول فعّال." };
}

/** Step 2: sign this browser in as the customer — only while their written approval is valid. Every entry is logged. */
export async function impersonate(_prev: Res, form: FormData): Promise<Res> {
  const me = await guard();
  const p = await target(String(form.get("user_id")));
  if (!p?.email) return { error: "العميل غير موجود." };
  if (p.role !== "user") return { error: "ما ينفع تدخل على حساب من فريق الإدارة." };
  const access = await latestAccess(p.id);
  if (access?.status !== "approved") return { error: "العميل ما وافق، أو انتهت مدة الموافقة. أرسل له طلب صلاحية جديد." };
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: p.email });
  const hash = data?.properties?.hashed_token;
  if (error || !hash) return { error: "ما قدرت أفتح حسابه. إذا كان محظور، ألغِ الحظر أولاً." };
  await audit(me, "impersonate", p, access.reason);

  const jar = await cookies();
  jar.set(REMEMBER_COOKIE, "0", { path: "/", sameSite: "lax", secure: true }); // ends when the browser closes
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const { error: e2 } = await supabase.auth.verifyOtp({ token_hash: hash, type: "magiclink" });
  if (e2) return { error: "ما قدرت أفتح حسابه. سجّل دخولك من جديد وجرّب." };
  jar.set("shaheen_imp", encodeURIComponent(me.email ?? "admin"), { path: "/", sameSite: "lax", secure: true, httpOnly: true });
  redirect("/app");
}

/** Leaves the customer's account: signs out and goes back to the login page. */
export async function stopImpersonating() {
  const jar = await cookies();
  jar.delete("shaheen_imp");
  await (await createClient()).auth.signOut({ scope: "local" });
  redirect("/login?next=/admin/customers");
}

/** Cancel a customer's subscription: at the end of the paid month (no more charges), or right now (plan and ريش stop today). */
export async function cancelCustomerSub(_prev: Res, form: FormData): Promise<Res> {
  const me = await guard();
  const p = await target(String(form.get("user_id")));
  if (!p) return { error: "العميل غير موجود." };
  const now = form.get("mode") === "now";
  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("*").eq("user_id", p.id).in("status", ["active", "trialing", "past_due"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!sub) return { error: "ما عنده اشتراك شغّال." };
  try {
    if (sub.provider !== "tap" && process.env.STRIPE_SECRET_KEY) {
      if (now) await stripe().subscriptions.cancel(sub.id); else await stripe().subscriptions.update(sub.id, { cancel_at_period_end: true });
    }
  } catch { return { error: "ما قدرنا نوصل لبوابة الدفع، حاول مرة ثانية." }; }
  const stamp = new Date().toISOString();
  if (now) {
    await admin.from("subscriptions").update({ status: "canceled", cancel_at_period_end: true, updated_at: stamp }).eq("id", sub.id);
    await admin.from("profiles").update({ plan_id: null }).eq("id", p.id);
    if (p.credits) await admin.rpc("grant_credits", { p_user: p.id, p_amount: -p.credits, p_reason: "admin", p_ref: `admin-cancel:${sub.id}:${Date.now()}` });
  } else {
    await admin.from("subscriptions").update({ cancel_at_period_end: true, updated_at: stamp }).eq("id", sub.id);
  }
  await admin.from("notifications").insert({
    user_id: p.id, kind: "info", title: now ? "انلغى اشتراكك" : "انوقف تجديد اشتراكك",
    body: now ? "فريق شاهين ألغى اشتراكك. حسابك وأعمالك محفوظة، وتقدر ترجع تشترك بأي وقت." : "اشتراكك يكمل لين نهاية الشهر المدفوع، وما ينخصم منك شي بعدها.",
    link: "/app/account",
  }).then(() => null, () => null);
  await audit(me, "cancel_sub", p, now ? "إلغاء فوري" : "إيقاف التجديد");
  done();
  return { ok: now ? "انلغى الاشتراك الحين، وانشال من الإيراد الشهري." : "انوقف التجديد. يكمل لين نهاية شهره، وبعدها ينشال من الإيراد الشهري." };
}

/** Undo «إيقاف التجديد» for a customer. */
export async function resumeCustomerSub(form: FormData) {
  const me = await guard();
  const p = await target(String(form.get("user_id")));
  if (!p) return;
  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("id,provider").eq("user_id", p.id).in("status", ["active", "trialing", "past_due"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!sub) return;
  if (sub.provider !== "tap" && process.env.STRIPE_SECRET_KEY) await stripe().subscriptions.update(sub.id, { cancel_at_period_end: false }).catch(() => null);
  await admin.from("subscriptions").update({ cancel_at_period_end: false, updated_at: new Date().toISOString() }).eq("id", sub.id);
  await audit(me, "resume_sub", p, "");
  done();
}
