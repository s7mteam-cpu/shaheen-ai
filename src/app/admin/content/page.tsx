import Link from "next/link";
import { JsonEditor } from "@/components/admin/JsonEditor";
import { getContent } from "@/lib/data";

export const dynamic = "force-dynamic";
const sections = [
  ["hero", "الواجهة الرئيسية"], ["steps", "خطوات الاستخدام"], ["tools_section", "عنوان قسم الأدوات"], ["gallery", "عنوان معرض الأعمال"],
  ["pricing", "عنوان قسم الأسعار"], ["faq", "الأسئلة الشائعة"], ["final_cta", "الدعوة الأخيرة"], ["footer", "الفوتر وبيانات التواصل"],
  ["managed_service", "باقة إدارة السوشال ميديا"], ["legal", "الصفحات القانونية"], ["voices", "أصوات التعليق الصوتي (معرّفات ElevenLabs)"],
] as const;

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s = "hero" } = await searchParams;
  const content = await getContent();
  const current = sections.find(([k]) => k === s) ?? sections[0];
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-bold text-navy-900">نصوص وصور الموقع</h1>
      <div className="flex flex-wrap gap-2">{sections.map(([k, l]) => <Link key={k} href={`/admin/content?s=${k}`} aria-pressed={k === current[0]} className="chip">{l}</Link>)}</div>
      <div className="max-w-3xl"><JsonEditor key={current[0]} contentKey={current[0]} title={current[1]} initial={content[current[0]] as never} /></div>
    </div>
  );
}
