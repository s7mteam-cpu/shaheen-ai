import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { adminAccess, canOpen } from "@/lib/server/auth";
import { SECTIONS, TEAM, sectionOf } from "@/lib/admin/sections";



export const metadata = { title: "لوحة الإدارة" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await adminAccess();
  if (!access) redirect("/app");
  const nav = [...SECTIONS, ...(access.full ? [TEAM] : [])].filter((x) => canOpen(access, x.key)).map((x) => [x.path, x.label] as const);
  if (!nav.length) redirect("/app");
  const here = sectionOf((await headers()).get("x-path") ?? "/admin");
  if (!canOpen(access, here)) redirect(nav[0][0]);
  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <nav aria-label="قائمة الإدارة" className="flex flex-col gap-1 bg-navy-950 p-4 lg:sticky lg:top-0 lg:h-screen lg:w-[250px] lg:shrink-0">
        <div className="flex items-center gap-2.5 px-2 pb-5"><Image src="/brand/eagle.png" alt="" width={34} height={34} /><span className="flex flex-col leading-tight"><span className="text-lg font-bold text-gold-500">شاهين</span><span className="text-xs text-white/60">لوحة الإدارة</span></span></div>
        {nav.map(([h, l]) => <Link key={h} href={h} className="rounded-xl px-3.5 py-2.5 text-[15px] text-white/85 hover:bg-white/10">{l}</Link>)}
        <Link href="/app" className="mt-auto rounded-xl px-3.5 py-2.5 text-sm text-gold-500 hover:bg-white/10">← العودة للمنصة</Link>
      </nav>
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
