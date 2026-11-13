"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminAccess, requireAdmin, requireFullAdmin } from "@/lib/server/auth";
import { createPassword, MIN_LEN, relock, removeLock, unlock, updateLock, UNLOCK_MIN } from "@/lib/server/adminLock";
import { SECTIONS, ALWAYS_LOCKED, type SectionKey } from "@/lib/admin/sections";
import { audit } from "@/lib/server/audit";
import { serverT } from "@/lib/server/lang";

type Res = { ok?: string; error?: string } | undefined;
const pickSections = (form: FormData) => [...SECTIONS.map((s) => s.key as SectionKey), "sheets" as SectionKey].filter((k) => form.get(`s_${k}`) === "on" && !ALWAYS_LOCKED.includes(k));

async function msgs() {
  const T = await serverT();
  return {
    T,
    short: T(`كلمة السر لازم ${MIN_LEN} حروف على الأقل.`, `The password needs at least ${MIN_LEN} characters.`),
    blocked: T(`انقفل الدخول ${UNLOCK_MIN} دقيقة بسبب محاولات خاطئة كثيرة.`, `Blocked for ${UNLOCK_MIN} minutes after too many wrong tries.`),
    mismatch: T("كلمتين السر مو متطابقات.", "The two passwords don't match."),
  };
}

/** First time: the owner sets the admin password and picks the sections it covers. */
export async function createLockAction(_p: Res, form: FormData): Promise<Res> {
  const { T, short, mismatch } = await msgs();
  const me = await requireFullAdmin();
  if (!me) return { error: T("هالخيار للمالك بس.", "Owner only.") };
  const pw = String(form.get("password") ?? "");
  if (pw !== String(form.get("password2") ?? "")) return { error: mismatch };
  const r = await createPassword(me.id, pw, pickSections(form));
  if (r === "short") return { error: short };
  if (r !== "ok") return { error: T("ما قدرنا نحفظها. تأكد إنك شغّلت ملف SQL حق v65.", "Couldn't save it. Make sure the v65 SQL file was run.") };
  await audit(me, "admin_lock_set");
  revalidatePath("/admin", "layout");
  return { ok: T("انحفظت ✓", "Saved ✓") };
}

/** Any admin or staff member: type the password to open the locked sections for 15 minutes. */
export async function unlockAction(_p: Res, form: FormData): Promise<Res> {
  const { T, blocked } = await msgs();
  const a = await adminAccess();
  if (!a) return { error: T("غير مصرّح", "Not allowed") };
  const r = await unlock(a.user.id, String(form.get("password") ?? ""));
  if (r === "blocked") return { error: blocked };
  if (r !== "ok") return { error: T("كلمة السر غلط.", "Wrong password.") };
  const next = String(form.get("next") ?? "/admin");
  redirect(/^\/admin(\/[\w\-/]*)?$/.test(next) ? next : "/admin");
}

export async function saveSectionsAction(_p: Res, form: FormData): Promise<Res> {
  const { T } = await msgs();
  const me = await requireAdmin("passwords");
  if (!me) return { error: T("افتح الصفحة بكلمة السر أول.", "Unlock the page first.") };
  const sections = pickSections(form);
  if ((await updateLock({ sections })) !== "ok") return { error: T("صار خطأ، جرّب مرة ثانية.", "Something went wrong, try again.") };
  await audit(me, "admin_lock_sections", undefined, sections.join(", ") || "—");
  revalidatePath("/admin", "layout");
  return { ok: T("انحفظت الأقسام ✓", "Sections saved ✓") };
}

export async function changePasswordAction(_p: Res, form: FormData): Promise<Res> {
  const { T, short, mismatch, blocked } = await msgs();
  const me = await requireAdmin("passwords");
  if (!me) return { error: T("افتح الصفحة بكلمة السر أول.", "Unlock the page first.") };
  const next = String(form.get("next") ?? "");
  if (next !== String(form.get("next2") ?? "")) return { error: mismatch };
  if (next.length < MIN_LEN) return { error: short };
  const r = await unlock(me.id, String(form.get("password") ?? "")); // the current password again
  if (r === "blocked") return { error: blocked };
  if (r !== "ok") return { error: T("كلمة السر الحالية غلط.", "The current password is wrong.") };
  await updateLock({ password: next });
  await audit(me, "admin_lock_changed");
  return { ok: T("تغيّرت كلمة السر ✓", "Password changed ✓") };
}

export async function removeLockAction(_p: Res, form: FormData): Promise<Res> {
  const { T, blocked } = await msgs();
  const me = await requireAdmin("passwords");
  if (!me) return { error: T("افتح الصفحة بكلمة السر أول.", "Unlock the page first.") };
  const r = await unlock(me.id, String(form.get("password") ?? ""));
  if (r === "blocked") return { error: blocked };
  if (r !== "ok") return { error: T("كلمة السر غلط.", "Wrong password.") };
  await removeLock();
  await relock();
  await audit(me, "admin_lock_removed");
  revalidatePath("/admin", "layout");
  return { ok: T("انشالت كلمة السر.", "Password removed.") };
}

export async function relockAction() {
  await relock();
  redirect("/admin");
}
