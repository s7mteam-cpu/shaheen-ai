"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { NavTool } from "./ToolsSheet";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/LangProvider";


/** Simple, fixed menu so customers never feel lost. Tool names/order come from /admin. */
export function SideNav({ isAdmin, support }: { isAdmin: boolean; support?: string; tools: NavTool[] }) {
  const path = usePathname();
  const T = useT();
  const tab = useSearchParams().get("tab");
  const onTools = path.startsWith("/app/tools");

  const item = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] ${active ? "bg-navy-800 font-semibold text-white" : "text-ink hover:bg-tint"}`;
  const ic = (active: boolean) => (active ? "text-gold-500" : "text-navy-700");

  const home = path === "/app";
  const works = path.startsWith("/app/works");
  const show = path.startsWith("/app/showcase");
  const brand = path.startsWith("/app/brand");
  const account = path.startsWith("/app/account") && tab !== "me" && tab !== "spend";
  const spend = path.startsWith("/app/account") && tab === "spend";
  const settings = path.startsWith("/app/account") && tab === "me";

  return (
    <nav aria-label={T("قائمة المنصة", "App menu")} className="card flex flex-col gap-1 self-start p-3 lg:sticky lg:top-24">
      <Link href="/app" aria-current={home ? "page" : undefined} className={item(home)}><Icon name="home" size={18} className={ic(home)} />{T("الرئيسية", "Home")}</Link>

      <Link href="/app/tools#tools-top" aria-current={onTools ? "page" : undefined} className={item(onTools)}><Icon name="grid" size={18} className={ic(onTools)} />{T("الأدوات", "Tools")}</Link>

      <Link href="/app/works" aria-current={works ? "page" : undefined} className={item(works)}><Icon name="folder" size={18} className={ic(works)} />{T("أعمالي", "My works")}</Link>
      <Link href="/app/brand" aria-current={brand ? "page" : undefined} className={item(brand)}><Icon name="palette" size={18} className={ic(brand)} />{T("هويتي التجارية", "Brand kit")}</Link>
      <Link href="/app/showcase" aria-current={show ? "page" : undefined} className={item(show)}><Icon name="sparkles" size={18} className={ic(show)} />{T("أعمال صُنعت بشاهين", "Made with Shaheen")}</Link>
      <Link href="/app/account" aria-current={account ? "page" : undefined} className={item(account)}><Icon name="card" size={18} className={ic(account)} />{T("الحساب والاشتراك", "Account & plan")}</Link>
      <Link href="/app/account?tab=spend" aria-current={spend ? "page" : undefined} className={item(spend)}><Icon name="feather" size={18} className={ic(spend)} />{T("مصاريف الريش", "Credit usage")}</Link>
      {support && (
        <a href={support} target="_blank" rel="noreferrer" className={item(false)}><Icon name="chat" size={18} className="text-navy-700" />{T("التواصل مع الدعم", "Contact support")}</a>
      )}
      <Link href="/app/account?tab=me" aria-current={settings ? "page" : undefined} className={item(settings)}><Icon name="settings" size={18} className={ic(settings)} />{T("الإعدادات", "Settings")}</Link>

      {isAdmin && (
        <>
          <div className="mx-1 my-2 h-px bg-line" />
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold text-gold-500 hover:bg-tint"><Icon name="settings" size={18} />{T("لوحة الإدارة", "Admin panel")}</Link>
        </>
      )}
    </nav>
  );
}
