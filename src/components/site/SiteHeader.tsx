import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeSwitch } from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangToggle";
import { tr, type Lang } from "@/lib/i18n";

export function SiteHeader({ signedIn, lang = "ar", chosen = lang }: { signedIn: boolean; lang?: Lang; chosen?: Lang }) {
  const T = (ar: string, en: string) => tr(lang, ar, en);
  return (
    <header className="sticky top-0 z-30 bg-navy-800 shadow-[0_1px_0_rgba(201,164,92,0.35)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-1 gap-y-2 px-2 py-2.5 sm:gap-3 sm:px-6 sm:py-3.5">
        <Logo size={36} />
        <nav aria-label={T("القائمة الرئيسية", "Main menu")} className="hidden items-center gap-7 lg:flex">
          {[["#tools", T("الأدوات", "Tools")], ["#how", T("كيف تعمل", "How it works")], ["#pricing", T("الأسعار", "Pricing")], ["#faq", T("الأسئلة الشائعة", "FAQ")]].map(([h, t]) => (
            <a key={h} href={h} className="whitespace-nowrap text-[15px] text-white/85 hover:text-white">{t}</a>
          ))}
        </nav>
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          {/* Clear labels on every size: «English/عربي» and both ☀️ 🌙 visible. */}
          <span className="flex items-center gap-1.5 sm:gap-2"><LangToggle lang={chosen} full /><ThemeSwitch /></span>
          {/* On phones & iPads these two live in the page itself (above «اشترك الآن»), so the bar stays light. */}
          <span className="hidden items-center gap-2 lg:flex">
            {signedIn ? (
              <Link href="/app" className="btn btn-gold whitespace-nowrap px-5 py-2.5 text-[15px]">{T("لوحة التحكم", "Dashboard")}</Link>
            ) : (
              <>
                <Link href="/login" className="whitespace-nowrap rounded-xl border border-white/25 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-white/5">{T("تسجيل الدخول", "Sign in")}</Link>
                <Link href="/#pricing" className="btn btn-gold whitespace-nowrap px-5 py-2.5 text-[15px]">{T("اشترك الآن", "Get started")}</Link>
              </>
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
