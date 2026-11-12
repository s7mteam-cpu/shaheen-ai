import Image from "next/image";
import Link from "next/link";
import type { SiteContent } from "@/lib/defaults";
import { tr, type Lang } from "@/lib/i18n";

export function SiteFooter({ footer, lang = "ar" }: { footer: SiteContent["footer"]; lang?: Lang }) {
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const year = new Date().getFullYear();
  const email = footer.email || "s7m.team@gmail.com";
  // company name + commercial registration number: shown once filled in from the admin
  const company = footer.company && !footer.company.trim().startsWith("[") ? footer.company : "";
  return (
    <footer className="bg-navy-950 text-white/75">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-8 pt-12">
        <div className="flex flex-wrap justify-between gap-8">
          <div className="flex max-w-xs flex-col gap-3">
            <div className="flex items-center gap-2.5"><Image src="/brand/eagle.png" alt="" width={36} height={36} /><span className="text-xl font-bold text-gold-500">{T("شاهين", "Shaheen")}</span></div>
            <p className="text-sm leading-7">{footer.tagline}</p>
            <div className="flex flex-col gap-1 text-sm">
              {footer.whatsapp && <a href={`tel:${footer.whatsapp.replace(/[^\d+]/g, "")}`} dir="ltr" className="self-start font-latin hover:text-white">{footer.whatsapp}</a>}
              <a href={`mailto:${email}`} dir="ltr" className="self-start font-latin hover:text-white">{email}</a>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {footer.whatsapp && <a href={`https://wa.me/${footer.whatsapp.replace(/\D/g, "")}`} className="hover:text-white">{T("واتساب", "WhatsApp")}</a>}
              {footer.instagram && <a href={`https://instagram.com/${footer.instagram.replace("@", "")}`} className="hover:text-white">{T("إنستغرام", "Instagram")}</a>}
            </div>
          </div>
          <nav aria-label={T("روابط الفوتر", "Footer links")} className="flex flex-wrap gap-12 text-sm">
            <div className="flex flex-col gap-2.5"><span className="font-semibold text-white">{T("المنصة", "Platform")}</span><Link href="/#tools">{T("الأدوات", "Tools")}</Link><Link href="/#pricing">{T("الأسعار", "Pricing")}</Link><Link href="/#faq">{T("الأسئلة الشائعة", "FAQ")}</Link></div>
            <div className="flex flex-col gap-2.5"><span className="font-semibold text-white">{T("الحساب", "Account")}</span><Link href="/login">{T("تسجيل الدخول", "Sign in")}</Link><Link href="/signup">{T("إنشاء حساب", "Create account")}</Link></div>
            <div className="flex flex-col gap-2.5"><span className="font-semibold text-white">{T("قانوني", "Legal")}</span><Link href="/terms">{T("شروط الاستخدام", "Terms of Service")}</Link><Link href="/privacy">{T("سياسة الخصوصية", "Privacy Policy")}</Link><Link href="/refund">{T("سياسة الاسترجاع", "Refund Policy")}</Link><Link href="/content-policy">{T("سياسة المحتوى", "Content Policy")}</Link><a href={`mailto:${email}?subject=${encodeURIComponent(T("شكوى / ملاحظة", "Complaint / feedback"))}`}>{T("الشكاوى والملاحظات", "Complaints & feedback")}</a></div>
          </nav>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5 text-[13px]">
          <span>{T(`© ${year} شاهين (S7M). جميع الحقوق محفوظة.`, `© ${year} Shaheen (S7M). All rights reserved.`)}</span>
          {company && <span>{company}</span>}
        </div>
      </div>
    </footer>
  );
}
