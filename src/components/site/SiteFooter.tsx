import Image from "next/image";
import Link from "next/link";
import type { SiteContent } from "@/lib/defaults";

export function SiteFooter({ footer }: { footer: SiteContent["footer"] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-navy-950 text-white/75">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-8 pt-12">
        <div className="flex flex-wrap justify-between gap-8">
          <div className="flex max-w-xs flex-col gap-3">
            <div className="flex items-center gap-2.5"><Image src="/brand/eagle.png" alt="" width={36} height={36} /><span className="text-xl font-bold text-gold-500">شاهين</span></div>
            <p className="text-sm leading-7">{footer.tagline}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {footer.whatsapp && <a href={`https://wa.me/${footer.whatsapp.replace(/\D/g, "")}`} className="hover:text-white">واتساب</a>}
              {footer.instagram && <a href={`https://instagram.com/${footer.instagram.replace("@", "")}`} className="hover:text-white">إنستغرام</a>}
              {footer.email && <a href={`mailto:${footer.email}`} className="hover:text-white">البريد</a>}
            </div>
          </div>
          <nav aria-label="روابط الفوتر" className="flex flex-wrap gap-12 text-sm">
            <div className="flex flex-col gap-2.5"><span className="font-semibold text-white">المنصة</span><Link href="/#tools">الأدوات</Link><Link href="/#pricing">الأسعار</Link><Link href="/#faq">الأسئلة الشائعة</Link></div>
            <div className="flex flex-col gap-2.5"><span className="font-semibold text-white">الحساب</span><Link href="/login">تسجيل الدخول</Link><Link href="/signup">إنشاء حساب</Link></div>
            <div className="flex flex-col gap-2.5"><span className="font-semibold text-white">قانوني</span><Link href="/terms">شروط الاستخدام</Link><Link href="/privacy">سياسة الخصوصية</Link><Link href="/refund">سياسة الاسترجاع</Link></div>
          </nav>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5 text-[13px]">
          <span>© {year} شاهين (S7M). جميع الحقوق محفوظة.</span>
          <span>{footer.company}</span>
        </div>
      </div>
    </footer>
  );
}
