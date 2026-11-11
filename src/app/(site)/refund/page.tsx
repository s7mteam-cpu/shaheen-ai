import { getContent } from "@/lib/data";
import { LegalDoc } from "@/components/site/LegalDoc";

export const metadata = { title: "سياسة الاسترجاع والإلغاء | Refund & Cancellation Policy" };
export const revalidate = 60;

/** The text lives in «نصوص وصور الموقع ← الصفحات القانونية» — edit it there and this page follows. */
export default async function Page() {
  const c = await getContent();
  return <LegalDoc c={c} ar={c.legal.refund} en={c.legal.refund_en} titleAr="سياسة الاسترجاع والإلغاء" titleEn="Refund & Cancellation Policy" />;
}
