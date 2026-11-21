import Image from "next/image";
import Link from "next/link";
import type { SiteContent } from "@/lib/defaults";
import { tr, type Lang } from "@/lib/i18n";
import { BRANDS, type BrandId } from "@/remotion/brandIcons";

/** a link or just a username → the profile link of that app */
const PROFILE: Record<Exclude<BrandId, "whatsapp">, string> = {
  instagram: "https://instagram.com/", tiktok: "https://www.tiktok.com/@", snapchat: "https://www.snapchat.com/add/", x: "https://x.com/",
  youtube: "https://www.youtube.com/@", facebook: "https://facebook.com/", telegram: "https://t.me/", threads: "https://www.threads.net/@", pinterest: "https://pinterest.com/",
};
/** each app in its own colours: coloured circle + white logo (white circle for the black ones, black logo on the yellow of Snapchat) */
const badge = (id: BrandId) => {
  const hex = BRANDS[id].hex;
  if (hex === "000000") return { bg: "#FFFFFF", fg: "#000000" };
  if (id === "snapchat") return { bg: "#FFFC00", fg: "#000000" };
  return { bg: `#${hex}`, fg: "#FFFFFF" };
};
const iconCls = "flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-110 hover:shadow-lg";
const linkOf = (id: keyof typeof PROFILE, v: string) => (/^https?:\/\//i.test(v.trim()) ? v.trim() : `${PROFILE[id]}${v.trim().replace(/^@/, "")}`);

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
            <div className="flex flex-wrap gap-2.5">
              {footer.whatsapp && <a href={`https://wa.me/${footer.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label={T("واتساب", "WhatsApp")} title={T("واتساب", "WhatsApp")} className={iconCls} style={{ background: badge("whatsapp").bg, color: badge("whatsapp").fg }}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden><path d={BRANDS.whatsapp.path} /></svg></a>}
              {(Object.keys(PROFILE) as (keyof typeof PROFILE)[]).map((id) => {
                const v = (footer as Record<string, string | undefined>)[id];
                return v?.trim() ? <a key={id} href={linkOf(id, v)} target="_blank" rel="noopener noreferrer" aria-label={BRANDS[id].name} title={BRANDS[id].name} className={iconCls} style={{ background: badge(id).bg, color: badge(id).fg }}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden><path d={BRANDS[id].path} /></svg></a> : null;
              })}
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
