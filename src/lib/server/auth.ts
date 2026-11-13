import "server-only";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sectionOf, type SectionKey } from "@/lib/admin/sections";

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export type AdminAccess = { user: NonNullable<Awaited<ReturnType<typeof requireUser>>>; full: boolean; perms: SectionKey[] };

/** Full admins (role admin) see everything; staff see only their ticked sections. */
export async function adminAccess(): Promise<AdminAccess | null> {
  const user = await requireUser();
  if (!user) return null;
  const admin = createAdminClient();
  const res = await admin.from("profiles").select("role,admin_perms").eq("id", user.id).single();
  let data = res.data;
  if (res.error) data = (await admin.from("profiles").select("role").eq("id", user.id).single()).data as typeof data; // before the v27 SQL runs
  if (data?.role === "admin") return { user, full: true, perms: [] };
  if (data?.role === "staff") return { user, full: false, perms: ((data.admin_perms as SectionKey[] | null) ?? []).filter((k) => k !== "team" && k !== "passwords" && k !== "sheets") };
  return null;
}

export const canOpen = (a: AdminAccess, section: SectionKey | null) => a.full || (!!section && section !== "team" && section !== "passwords" && section !== "sheets" && a.perms.includes(section));

/** Guard for admin pages and server actions: checks the section of the page the request came from. */
export async function requireAdmin(section?: SectionKey) {
  const a = await adminAccess();
  if (!a) return null;
  const s = section ?? sectionOf((await headers()).get("x-path") ?? "") ?? "overview";
  if (!canOpen(a, s)) return null;
  // «كلمات السر»: a locked section also needs the admin password (typed within the last 15 minutes)
  const { needsUnlock } = await import("@/lib/server/adminLock");
  return (await needsUnlock(a.user.id, s)) ? null : a.user;
}

/** Only full admins (owner level). */
export async function requireFullAdmin() {
  const a = await adminAccess();
  return a?.full ? a.user : null;
}

/** Top of every admin page: layouts don't re-run on client navigation, so each page checks its own section. */
export async function guardPage(section: SectionKey) {
  const { redirect } = await import("next/navigation");
  const { SECTIONS } = await import("@/lib/admin/sections");
  const a = await adminAccess();
  if (!a) return redirect("/app");
  if (canOpen(a, section)) {
    const { needsUnlock } = await import("@/lib/server/adminLock");
    if (await needsUnlock(a.user.id, section)) {
      const here = (await headers()).get("x-path") ?? "/admin";
      redirect(`/admin/unlock?next=${encodeURIComponent(here)}`);
    }
    return;
  }
  const first = SECTIONS.find((x) => canOpen(a, x.key));
  redirect(first ? first.path : "/app");
}
