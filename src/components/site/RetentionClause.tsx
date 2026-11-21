import type { SiteContent } from "@/lib/defaults";
import type { Lang } from "@/lib/i18n";
import { cleanRetention } from "@/lib/retention";

/** «مدة حفظ الملفات»: appended to the Terms and Privacy pages from the same setting that runs the deletion,
 *  so what the customer reads is always what the platform does. Shown only while the auto-delete is on. */
export function RetentionClause({ c, lang }: { c: SiteContent; lang: Lang }) {
  const r = cleanRetention((c as unknown as { retention?: unknown }).retention);
  if (!r.enabled) return null;
  const en = lang === "en";
  return (
    <section className="mx-auto max-w-3xl px-6 pb-16" dir={en ? "ltr" : "rtl"}>
      <div className="rounded-2xl border border-line bg-white p-6 text-[15px] leading-8 text-ink">
        <h2 className="mb-2 text-[18px] font-bold text-navy-900">{en ? "How long we keep your files" : "مدة حفظ الملفات"}</h2>
        <p>{en
          ? `Files created through the platform (videos, images, designs and other results) are kept for ${r.days} days from the day they are made, then deleted permanently and automatically. We notify you in your account and by email ${r.warn} days before deletion, so you can download what you need. This does not include your account, your brand identity or the files you uploaded yourself.`
          : `نحتفظ بالملفات التي تُنشأ عبر المنصة (فيديوهات وصور وتصاميم وغيرها) مدة ${r.days} يوماً من تاريخ إنشائها، ثم تُحذف تلقائياً بشكل نهائي. نرسل لك تنبيهاً داخل حسابك وعلى بريدك قبل الحذف بـ ${r.warn} أيام لتتمكن من تنزيل ما تحتاجه. لا يشمل ذلك حسابك أو هويتك البصرية أو الملفات التي رفعتَها بنفسك.`}</p>
      </div>
    </section>
  );
}
