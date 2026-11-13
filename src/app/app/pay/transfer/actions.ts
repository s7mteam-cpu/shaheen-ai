"use server";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/data";
import { isImpersonating } from "@/lib/server/impersonation";
import { allowedMonths, methodsFor, priceOf } from "@/lib/server/transfers";
import { serverT } from "@/lib/server/lang";

type Res = { ok?: string; error?: string } | undefined;
const MAX = 3.8 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf" };

/** The customer sends a transfer with its receipt; it waits for an admin's approval («الدفع بالتحويل»). */
export async function submitTransfer(_p: Res, form: FormData): Promise<Res> {
  const T = await serverT();
  const profile = await getSessionProfile();
  if (!profile) return { error: T("سجّل دخولك أول.", "Please sign in first.") };
  if (await isImpersonating()) return { error: T("ما ينفع ترسل تحويل وأنت داخل كعميل.", "Not available while viewing as a customer.") };

  const kind = String(form.get("kind") ?? "");
  if (!["subscribe", "renew", "managed"].includes(kind)) return { error: T("طلب غير صحيح.", "Invalid request.") };
  const methods = await methodsFor(profile.country);
  const method = methods.find((m) => m.id === String(form.get("method") ?? ""));
  if (!method) return { error: T("اختر طريقة التحويل.", "Choose a transfer method.") };
  const months = kind === "managed" ? 1 : Number(form.get("months") ?? 1);
  if (!(await allowedMonths()).includes(months)) return { error: T("اختر المدة.", "Choose the period.") };

  const file = form.get("receipt");
  if (!(file instanceof File) || !file.size) return { error: T("ارفع صورة إيصال التحويل.", "Upload the transfer receipt.") };
  if (file.size > MAX) return { error: T("الإيصال أكبر من 4 ميغا. صوّره من جديد أو صغّره.", "The receipt is over 4 MB. Take a smaller photo.") };
  const ext = TYPES[file.type];
  if (!ext) return { error: T("الإيصال لازم يكون صورة (JPG / PNG) أو ملف PDF.", "The receipt must be an image (JPG / PNG) or a PDF.") };

  const admin = createAdminClient();
  const { count } = await admin.from("transfers").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "pending");
  if (count) return { error: T("عندك تحويل ينتظر المراجعة. ننبهك أول ما نراجعه.", "You already have a transfer waiting for review.") };

  let price;
  try { price = await priceOf(profile.id, kind as "subscribe" | "renew" | "managed", String(form.get("plan") ?? "") || null, months); }
  catch { return { error: T("الباقة مو متاحة حالياً.", "This plan isn't available.") }; }

  // inside the customer's own folder: it goes with the account if the account is ever deleted
  const path = `${profile.id}/_receipts/${randomUUID()}.${ext}`;
  const up = await admin.storage.from("results").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (up.error) return { error: T("ما قدرنا نرفع الإيصال. جرّب مرة ثانية.", "The receipt couldn't be uploaded. Try again.") };

  const clip = (k: string, n: number) => String(form.get(k) ?? "").trim().slice(0, n) || null;
  const { error } = await admin.from("transfers").insert({
    user_id: profile.id, method_id: method.id, method_name: method.name, kind, plan_id: price.planId, months: price.months,
    amount: price.amount, paid_text: clip("paid", 120), note: clip("note", 500), receipt_path: path,
  });
  if (error) { await admin.storage.from("results").remove([path]); return { error: T("صار خطأ. جرّب مرة ثانية.", "Something went wrong. Try again.") }; }
  revalidatePath("/app/account");
  return { ok: T("وصلنا تحويلك ✓ بنراجع الإيصال ونفعّل اشتراكك، وبيوصلك إشعار أول ما يتفعّل (عادةً خلال يوم عمل).", "Transfer received ✓ We'll check the receipt and activate your plan; you'll be notified (usually within one business day).") };
}
