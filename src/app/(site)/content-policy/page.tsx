import { getContent } from "@/lib/data";
import { LegalDoc } from "@/components/site/LegalDoc";
import { getLang } from "@/lib/server/lang";

export const metadata = { title: "سياسة المحتوى | Content Policy" };
export const revalidate = 60;

/** The text lives in «نصوص وصور الموقع ← الصفحات القانونية» — edit it there and this page follows. */
export default async function Page() {
  const [c, lang] = await Promise.all([getContent(), getLang()]);
  return <LegalDoc c={c} ar={c.legal.content} en={c.legal.content_en} titleAr="سياسة المحتوى" titleEn="Content Policy" lang={lang} />;
}
