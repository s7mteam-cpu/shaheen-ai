"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useT } from "@/components/LangProvider";

/** Greeting shown at the very top of the home page (above the menu on phones).
 *  On phones it becomes a navy card with the balance and four shortcuts; from `lg` up it stays the plain greeting. */
export function HomeGreeting({ name, credits, libHidden }: { name?: string; credits?: number; libHidden?: boolean }) {
  const T = useT();
  if (usePathname() !== "/app") return null;
  const shortcuts: [string, string, string][] = [
    ["palette", "/app/brand", T("هويتي التجارية", "Brand kit")],
    ["calendar", "/app/brand/plan", T("خطة المحتوى", "Content plan")],
    ...(libHidden ? [] : [["film", "/app/templates", T("مكتبة القوالب", "Template library")] as [string, string, string]]),
    ["feather", "/app/brand/mine", T("تعليماتي", "My instructions")],
  ];
  return (
    <header className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="relative flex flex-col gap-1.5 overflow-hidden max-lg:rounded-3xl max-lg:border max-lg:border-gold-500/40 max-lg:bg-gradient-to-br max-lg:from-navy-900 max-lg:to-navy-700 max-lg:p-5 max-lg:shadow-[0_14px_30px_-18px_rgba(10,30,54,0.7)]">
        <h1 className="text-[22px] font-bold text-navy-900 max-lg:text-white sm:text-[26px]">{name ? T(`هلا ${name} 👋`, `Hi ${name} 👋`) : T("هلا فيك 👋", "Welcome 👋")}</h1>
        <p className="text-[15px] text-subtle max-lg:text-white/75 sm:text-[16px]">{T("شنو تبي تسوّي اليوم؟ اختر أداة وابدأ.", "What would you like to create today? Pick a tool to get started.")}</p>
        {credits !== undefined && (
          <Link href="/app/account?tab=spend" className="mt-3 flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3 lg:hidden">
            <span className="flex items-center gap-2.5 text-gold-500"><Icon name="feather" size={22} /><b className="text-[26px] leading-none">{credits.toLocaleString("en")}</b><span className="text-[14px] font-semibold text-white/80">{T("ريشة", "credits")}</span></span>
            <span className="flex items-center gap-1 text-[13px] font-semibold text-gold-500">{T("مصاريف الريش", "Credit usage")}<Icon name="arrow" size={14} className="rtl:rotate-0 ltr:rotate-180" /></span>
          </Link>
        )}
      </div>
      <nav aria-label={T("أقسام المنصة", "Platform sections")} className={`grid gap-2 lg:hidden ${shortcuts.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {shortcuts.map(([icon, href, label]) => (
          <Link key={href} href={href} className="card flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center text-[12px] font-bold leading-tight text-navy-900 active:scale-95">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-navy-800"><Icon name={icon} size={20} /></span>{label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
