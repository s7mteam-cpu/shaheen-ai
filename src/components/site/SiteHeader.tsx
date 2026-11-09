import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 bg-navy-800 shadow-[0_1px_0_rgba(201,164,92,0.35)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3.5">
        <Logo />
        <nav aria-label="القائمة الرئيسية" className="hidden items-center gap-7 md:flex">
          {[["#tools", "الأدوات"], ["#how", "كيف تعمل"], ["#pricing", "الأسعار"], ["#faq", "الأسئلة الشائعة"]].map(([h, t]) => (
            <a key={h} href={h} className="text-[15px] text-white/85 hover:text-white">{t}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          {signedIn ? (
            <Link href="/app" className="btn btn-gold px-5 py-2.5 text-[15px]">لوحة التحكم</Link>
          ) : (
            <>
              <Link href="/login" className="rounded-xl border border-white/25 px-4 py-2.5 text-[15px] text-white hover:bg-white/5">تسجيل الدخول</Link>
              <Link href="/#pricing" className="btn btn-gold px-5 py-2.5 text-[15px]">اشترك الآن</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
