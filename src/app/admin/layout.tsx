import { createAdminClient } from "@/lib/supabase/admin";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangToggle";
import { getChosenLang } from "@/lib/server/lang";
import { AdminNav } from "@/components/admin/AdminNav";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { adminAccess, canOpen } from "@/lib/server/auth";
import { SECTIONS, TEAM, PASSWORDS, sectionOf } from "@/lib/admin/sections";
import { getL } from "@/lib/server/lang";



export async function generateMetadata() { return { title: (await getL())("لوحة الإدارة") }; }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const L = await getL();
  const chosen = await getChosenLang();
  const access = await adminAccess();
  if (!access) redirect("/app");
  const nav = [...SECTIONS, ...(access.full ? [PASSWORDS, TEAM] : [])].filter((x) => canOpen(access, x.key)).map((x) => [x.path, L(x.label)] as const);
  if (!nav.length) redirect("/app");
  const here = sectionOf((await headers()).get("x-path") ?? "/admin");
  if (!canOpen(access, here)) redirect(nav[0][0]);
  // red badge: new requests nobody has handled yet
  const newLeads = canOpen(access, "leads") ? (await createAdminClient().from("leads").select("id", { count: "exact", head: true }).eq("status", "new")).count ?? 0 : 0;
  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <AdminNav
        items={nav.map(([href, label]) => ({ href, label }))}
        labels={{ title: L("لوحة الإدارة"), sub: L("شاهين"), back: L("العودة للمنصة"), menu: L("القائمة"), newLeads: L("طلب جديد") }}
        leads={newLeads}
        toggles={<><LangToggle lang={chosen} /><ThemeToggle /></>}
      />
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
