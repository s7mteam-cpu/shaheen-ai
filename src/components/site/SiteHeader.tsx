import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangToggle";
import { tr, type Lang } from "@/lib/i18n";

export function SiteHeader({ signedIn, lang = "ar", chosen = lang }: { signedIn: boolean; lang?: Lang; chosen?: Lang }) {
  const T = (ar: string, en: string) => tr(lang, ar, en);
  return (
    <header className="sticky top-0 z-30 bg-navy-800 shadow-[0_1px_0_rgba(201,164,92,0.35)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-1 gap-y-2 px-2.5 py-2.5 sm:gap-3 sm:px-6 sm:py-3.5">
        <Logo size={36} />
        <nav aria-label={T("القائمة الرئيسية", "Main menu")} className="hidden items-center gap-7 md:flex">
          {[["#tools", T("الأدوات", "Tools")], ["#how", T("كيف تعمل", "How it works")], ["#pricing", T("الأسعار", "Pricing")], ["#faq", T("الأسئلة الشائعة", "FAQ")]].map(([h, t]) => (
            <a key={h} href={h} className="text-[15px] text-white/85 hover:text-white">{t}</a>
          ))}
        </nav>
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <span className="flex items-center rounded-full bg-white/[0.06] sm:bg-transparent"><LangToggle lang={chosen} /><ThemeToggle /></span>
          {signedIn ? (
            <Link href="/app" className="btn btn-gold whitespace-nowrap px-3 py-1.5 text-[13px] sm:px-5 sm:py-2.5 sm:text-[15px]">{T("لوحة التحكم", "Dashboard")}</Link>
          ) : (
            <>
              <Link href="/login" className="shrink-0 whitespace-nowrap rounded-xl border border-white/25 px-2 py-1.5 text-[12.5px] font-semibold text-white hover:bg-white/5 sm:px-4 sm:py-2.5 sm:text-[15px]">{T("تسجيل الدخول", "Sign in")}</Link>
              <Link href="/#pricing" className="btn btn-gold shrink-0 whitespace-nowrap px-3 py-1.5 text-[13px] sm:px-5 sm:py-2.5 sm:text-[15px]">{T("اشترك الآن", "Get started")}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
