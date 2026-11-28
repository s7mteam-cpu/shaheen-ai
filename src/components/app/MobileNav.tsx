"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/LangProvider";

/** Phone-only bottom bar (hidden from `lg` up, where the side menu is). The 4 main tabs are on the bar;
 *  the 5th («المزيد») opens a sheet with everything else: my pages, account, support, settings, info/legal links, sign out. */
export function MobileNav({ isAdmin, ready, libHidden, support }: { isAdmin: boolean; ready?: boolean; libHidden?: boolean; support?: string }) {
  const path = usePathname();
  const router = useRouter();
  const T = useT();
  const [open, setOpen] = useState(false);
  async function logout() {
    await createClient().auth.signOut();
    router.replace("/"); router.refresh();
  }

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

  const row = "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] text-ink hover:bg-tint";
  const mine: [string, string, string][] = [
    ["palette", "/app/brand", T("هويتي التجارية", "Brand kit")],
    ["feather", "/app/brand/mine", T("تعليماتي", "My instructions")],
    ...(ready ? [["check", "/app/ready", T("منشوراتك جاهزة للنشر", "Ready to post")] as [string, string, string]] : []),
    ...(libHidden ? [] : [["film", "/app/templates", T("مكتبة القوالب", "Template library")] as [string, string, string]]),
    ["sparkles", "/app/showcase", T("أعمال صُنعت بشاهين", "Made with Shaheen")],
    ["card", "/app/account", T("الحساب والاشتراك", "Account & plan")],
    ["feather", "/app/account?tab=spend", T("مصاريف الريش", "Credit usage")],
    ["settings", "/app/account?tab=me", T("الإعدادات", "Settings")],
  ];
  const info: [string, string][] = [
    ["/?home=1#pricing", T("الأسعار", "Pricing")],
    ["/?home=1#faq", T("الأسئلة الشائعة", "FAQ")],
    ["/terms", T("شروط الاستخدام", "Terms of Service")],
    ["/privacy", T("سياسة الخصوصية", "Privacy Policy")],
    ["/refund", T("سياسة الاسترجاع", "Refund Policy")],
    ["/content-policy", T("سياسة المحتوى", "Content Policy")],
  ];

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
            <div className="flex flex-col gap-3">
              <div className="card flex flex-col gap-1 p-2">
                {mine.map(([icon, href, label]) => (
                  <Link key={href} href={href} onClick={() => setOpen(false)} className={row}><Icon name={icon} size={18} className="text-navy-700" />{label}</Link>
                ))}
                {support && <a href={support} target="_blank" rel="noreferrer" className={row}><Icon name="chat" size={18} className="text-navy-700" />{T("التواصل مع الدعم", "Contact support")}</a>}
                {isAdmin && <Link href="/admin" className={`${row} font-semibold text-gold-500`}><Icon name="settings" size={18} />{T("لوحة الإدارة", "Admin panel")}</Link>}
              </div>
              <div className="card flex flex-col p-2">
                {info.map(([href, label]) => (
                  <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3.5 py-2.5 text-[14px] text-muted hover:bg-tint">{label}</Link>
                ))}
              </div>
              <button type="button" onClick={logout} className="card flex items-center gap-3 rounded-2xl px-3.5 py-3.5 text-start text-[15px] font-semibold text-red-700"><Icon name="logout" size={18} />{T("تسجيل الخروج", "Sign out")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
