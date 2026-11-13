"use server";
import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSessionProfile } from "@/lib/data";
import { isImpersonating } from "@/lib/server/impersonation";
import { claimTrial, DEVICE_COOKIE, isHuman } from "@/lib/server/trial";
import { getL, serverT } from "@/lib/server/lang";
import { createAdminClient } from "@/lib/supabase/admin";

type Res = { ok?: string; error?: string } | undefined;

/** «جرّب مجاناً»: one trial per person (account, e-mail, WhatsApp number, device), a few per network a day. */
export async function startTrial(_p: Res, form: FormData): Promise<Res> {
  const T = await serverT();
  const profile = await getSessionProfile();
  if (!profile) return { error: T("سجّل دخولك أول.", "Please sign in first.") };
  if (await isImpersonating()) return { error: T("ما ينفع وأنت داخل كعميل.", "Not available while viewing as a customer.") };
  const jar = await cookies();
  // the device, remembered twice: a long-lived cookie and the browser's own storage (clearing one isn't enough)
  const clean = (v: string | undefined | null) => (v ?? "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
  const fromCookie = clean(jar.get(DEVICE_COOKIE)?.value), fromStorage = clean(String(form.get("device") ?? ""));
  const device = fromCookie || fromStorage || randomUUID();
  jar.set(DEVICE_COOKIE, device, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 730 });
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const human = await isHuman(String(form.get("cf-turnstile-response") ?? ""), ip);
  const r = await claimTrial(profile.id, ip, [...new Set([device, fromStorage].filter(Boolean))], human);
  if (r.error || !r.ok) return { error: (await getL())(r.error ?? "?") };
  revalidatePath("/app", "layout");
  return { ok: T(`🎉 بدأت تجربتك: ${r.ok.credits} ريشة لمدة ${r.ok.hours} ساعة. جرّب أي أداة الحين!`, `🎉 Your trial has started: ${r.ok.credits} credits for ${r.ok.hours} hours. Try any tool now!`) };
}

/** «تخطي التجربة المجانية واستكشف الأدوات بدون اشتراك»: the customer gives up the trial for good. */
export async function skipTrial(): Promise<void> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== "user" || (await isImpersonating())) return;
  await createAdminClient().from("profiles").update({ trial_declined_at: new Date().toISOString() }).eq("id", profile.id).is("trial_declined_at", null);
  revalidatePath("/app", "layout");
}
