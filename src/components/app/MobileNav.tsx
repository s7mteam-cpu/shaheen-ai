"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/LangProvider";

/** Phone-only bottom bar (hidden from `lg` up, where the side menu is). The 5th tab opens the full menu in a sheet,
 *  so every page stays reachable. `children` is the same <SideNav/> the desktop uses. */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const T = useT();
  const [open, setOpen] = useState(false);

  // close the sheet after every navigation, and lock page scroll while it is open
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const home = path === "/app";
  const tools = path.startsWith("/app/tools");
  const works = path.startsWith("/app/works");
  const plan = path.startsWith("/app/brand/plan");
  const more = !home && !tools && !works && !plan;

  const tab = (active: boolean) =>
    `flex min-w-0 flex-1 flex-col items-center gap-0.5 pt-1.5 text-[11px] ${active ? "font-bold text-navy-900" : "font-semibold text-subtle"}`;
  const pill = (active: boolean) =>
    `flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-gold-100 text-navy-800" : ""}`;

  return (
    <>
      <nav aria-label={T("التنقل السريع", "Quick navigation")} data-mobile-nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_-12px_rgba(10,30,54,0.25)] backdrop-blur lg:hidden">
        <Link href="/app" aria-current={home ? "page" : undefined} className={tab(home)}><span className={pill(home)}><Icon name="home" size={20} /></span>{T("الرئيسية", "Home")}</Link>
        <Link href="/app/tools#tools-top" aria-current={tools ? "page" : undefined} className={tab(tools)}><span className={pill(tools)}><Icon name="grid" size={20} /></span>{T("الأدوات", "Tools")}</Link>
        <Link href="/app/works" aria-current={works ? "page" : undefined} className={tab(works)}><span className={pill(works)}><Icon name="folder" size={20} /></span>{T("أعمالي", "My works")}</Link>
        <Link href="/app/brand/plan" aria-current={plan ? "page" : undefined} className={tab(plan)}><span className={pill(plan)}><Icon name="calendar" size={20} /></span>{T("خطة المحتوى", "Content plan")}</Link>
        <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog" className={tab(more)}><span className={pill(more)}><Icon name="menu" size={20} /></span>{T("المزيد", "More")}</button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={T("قائمة المنصة", "App menu")}>
          <button type="button" aria-label={T("إغلاق", "Close")} onClick={() => setOpen(false)} className="absolute inset-0 bg-navy-950/60" />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-3xl border-t-2 border-gold-500 bg-canvas p-3 pb-[max(1rem,env(safe-area-inset-bottom))] [animation:sheetUp_.22s_ease-out_both]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-field" aria-hidden />
            {children}
          </div>
        </div>
      )}
    </>
  );
}
