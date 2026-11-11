"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ToolsSheet, type NavTool } from "./ToolsSheet";
import { Icon } from "@/components/Icon";


/** Simple, fixed menu so customers never feel lost. Tool names/order come from /admin. */
export function SideNav({ isAdmin, support, tools }: { isAdmin: boolean; support?: string; tools: NavTool[] }) {
  const path = usePathname();
  const tab = useSearchParams().get("tab");
  const onTools = path.startsWith("/app/tools");
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const item = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] ${active ? "bg-navy-800 font-semibold text-white" : "text-ink hover:bg-tint"}`;
  const ic = (active: boolean) => (active ? "text-gold-500" : "text-navy-700");

  const home = path === "/app";
  const works = path.startsWith("/app/works");
  const brand = path.startsWith("/app/brand");
  const account = path.startsWith("/app/account") && tab !== "me" && tab !== "spend";
  const spend = path.startsWith("/app/account") && tab === "spend";
  const settings = path.startsWith("/app/account") && tab === "me";

  return (
    <nav aria-label="قائمة المنصة" className="card flex flex-col gap-1 self-start p-3 lg:sticky lg:top-24">
      <Link href="/app" aria-current={home ? "page" : undefined} className={item(home)}><Icon name="home" size={18} className={ic(home)} />الرئيسية</Link>

      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={`${item(onTools)} justify-between`}>
        <span className="flex items-center gap-3"><Icon name="grid" size={18} className={ic(onTools)} />الأدوات</span>
        <span aria-hidden className="text-lg">‹</span>
      </button>
      <ToolsSheet tools={tools} open={open} onClose={close} />

      <Link href="/app/works" aria-current={works ? "page" : undefined} className={item(works)}><Icon name="folder" size={18} className={ic(works)} />أعمالي</Link>
      <Link href="/app/brand" aria-current={brand ? "page" : undefined} className={item(brand)}><Icon name="palette" size={18} className={ic(brand)} />هويتي التجارية</Link>
      <Link href="/app/account" aria-current={account ? "page" : undefined} className={item(account)}><Icon name="card" size={18} className={ic(account)} />الحساب والاشتراك</Link>
      <Link href="/app/account?tab=spend" aria-current={spend ? "page" : undefined} className={item(spend)}><Icon name="feather" size={18} className={ic(spend)} />مصاريف الريش</Link>
      {support && (
        <a href={support} target="_blank" rel="noreferrer" className={item(false)}><Icon name="chat" size={18} className="text-navy-700" />التواصل مع الدعم</a>
      )}
      <Link href="/app/account?tab=me" aria-current={settings ? "page" : undefined} className={item(settings)}><Icon name="settings" size={18} className={ic(settings)} />الإعدادات</Link>

      {isAdmin && (
        <>
          <div className="mx-1 my-2 h-px bg-line" />
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-semibold text-gold-500 hover:bg-tint"><Icon name="settings" size={18} />لوحة الإدارة</Link>
        </>
      )}
    </nav>
  );
}
