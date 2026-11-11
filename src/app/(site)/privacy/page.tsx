import { getContent } from "@/lib/data";
import { LegalDoc } from "@/components/site/LegalDoc";

export const metadata = { title: "سياسة الخصوصية | Privacy Policy" };
export const revalidate = 60;

/** The text lives in «نصوص وصور الموقع ← الصفحات القانونية» — edit it there and this page follows. */
export default async function Page() {
  const c = await getContent();
  return <LegalDoc c={c} ar={c.legal.privacy} en={c.legal.privacy_en} titleAr="سياسة الخصوصية" titleEn="Privacy Policy" />;
}
