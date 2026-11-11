import { guardPage } from "@/lib/server/auth";
import Link from "next/link";
import { JsonEditor } from "@/components/admin/JsonEditor";
import { getContent } from "@/lib/data";
import { getL } from "@/lib/server/lang";
import { L } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";
const sections = [
  ["hero", "الواجهة الرئيسية"], ["steps", "خطوات الاستخدام"], ["tools_section", "عنوان قسم الأدوات"], ["gallery", "عنوان معرض الأعمال"],
  ["pricing", "عنوان قسم الأسعار"], ["faq", "الأسئلة الشائعة"], ["final_cta", "الدعوة الأخيرة"], ["footer", "الفوتر وبيانات التواصل"],
  ["managed_service", "باقة إدارة السوشال ميديا"], ["legal", "الصفحات القانونية"], ["voices", "أصوات التعليق الصوتي (معرّفات ElevenLabs)"],
] as const;

export default async function ContentAdmin({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const L = await getL();
  await guardPage("content");
  const { s = "hero" } = await searchParams;
  const content = await getContent();
  const current = sections.find(([k]) => k === s) ?? sections[0];
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[26px] font-bold text-navy-900">{L("نصوص وصور الموقع")}</h1>
      <div className="flex flex-wrap gap-2">{sections.map(([k, l]) => <Link key={k} href={`/admin/content?s=${k}`} aria-pressed={k === current[0]} className="chip">{L(l)}</Link>)}</div>
      {current[0] === "legal" && (
        <div className="max-w-3xl rounded-2xl bg-tint p-4 text-sm leading-7 text-navy-900">
          <p className="mb-1 font-bold">{L("هذي نفس النصوص اللي تطلع بصفحات الشروط والخصوصية والاسترجاع. أي تعديل هنا يطلع بالموقع خلال دقيقة.")}</p>
          <p>{L("طريقة الكتابة:")} <code>{L("## عنوان")}</code> {L("لعنوان بند ·")} <code>{L("- نقطة")}</code> {L("لنقطة ·")} <code>{L("&gt; سطر")}</code> {L("لمربع «باختصار» ·")} <code>{L("**كلمة**")}</code> {L("للخط العريض ·")} <code>{L("[نص](/رابط)")}</code> {L("لرابط.")}</p>
          <p>{L("كلمات تتعبّى لحالها:")} <code>{"{email}"}</code> {L("و")}<code>{"{whatsapp}"}</code> {L("من «الفوتر وبيانات التواصل»، و")}<code>{"{managed_price}"}</code> {L("من «باقة إدارة السوشال ميديا»، و")}<code>{"{refund_days}"}</code> {L("من خانة مدة الاسترداد تحت. غيّر الرقم مرة وحدة، ويتغيّر بكل مكان.")}</p>
        </div>
      )}
      <div className="max-w-3xl"><JsonEditor key={current[0]} contentKey={current[0]} title={L(current[1])} initial={content[current[0]] as never} /></div>
    </div>
  );
}
