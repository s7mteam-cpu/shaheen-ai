import { getContent } from "@/lib/data";
import { LegalDoc } from "@/components/site/LegalDoc";
import { getLang } from "@/lib/server/lang";

export const metadata = { title: "سياسة الخصوصية | Privacy Policy" };
export const revalidate = 60;

/** The text lives in «نصوص وصور الموقع ← الصفحات القانونية» — edit it there and this page follows. */
export default async function Page() {
  const [c, lang] = await Promise.all([getContent(), getLang()]);
  return <LegalDoc c={c} ar={c.legal.privacy} en={c.legal.privacy_en} titleAr="سياسة الخصوصية" titleEn="Privacy Policy" lang={lang} />;
}
