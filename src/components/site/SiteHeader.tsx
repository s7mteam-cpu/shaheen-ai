import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 bg-navy-800 shadow-[0_1px_0_rgba(201,164,92,0.35)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
        <Logo size={36} />
        <nav aria-label="القائمة الرئيسية" className="hidden items-center gap-7 md:flex">
          {[["#tools", "الأدوات"], ["#how", "كيف تعمل"], ["#pricing", "الأسعار"], ["#faq", "الأسئلة الشائعة"]].map(([h, t]) => (
            <a key={h} href={h} className="text-[15px] text-white/85 hover:text-white">{t}</a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/app" className="btn btn-gold whitespace-nowrap px-4 py-2 text-[14px] sm:px-5 sm:py-2.5 sm:text-[15px]">لوحة التحكم</Link>
          ) : (
            <>
              <Link href="/login" className="whitespace-nowrap rounded-xl border border-white/25 px-3 py-2 text-[13px] font-semibold text-white hover:bg-white/5 sm:px-4 sm:py-2.5 sm:text-[15px]">تسجيل الدخول</Link>
              <Link href="/#pricing" className="btn btn-gold whitespace-nowrap px-3.5 py-2 text-[13px] sm:px-5 sm:py-2.5 sm:text-[15px]">اشترك الآن</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
