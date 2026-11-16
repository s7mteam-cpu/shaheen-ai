import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { getSections } from "@/lib/data";
import { DEFAULT_INTRO, DEFAULT_STEPS, SHOWCASE_CATS } from "@/lib/showcase";
import { SectionForm } from "./Form";

export const dynamic = "force-dynamic";

/** Order of the tools on the home page + the text of each tool's page. */
export default async function SectionsAdmin() {
  await guardPage("gallery");
  const sections = await getSections();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/gallery" className="text-sm font-semibold text-navy-700">← رجوع للمعرض</Link>
        <h1 className="mt-2 text-[26px] font-bold text-navy-900">ترتيب الأقسام وشرحها</h1>
        <p className="mt-1 text-sm leading-7 text-subtle">هذي البطاقات اللي تطلع للزائر بالصفحة الرئيسية تحت «أعمال صُنعت بشاهين». <b>الترتيب</b>: الرقم الأصغر يطلع أول (10، 20، 30…). وإذا فتح الزائر البطاقة يشوف وصف الأداة وطريقة العمل والمميزات وأعمالها. اللي تتركه فاضي يطلع فيه نص جاهز (تشوفه رمادي). القسم اللي ما فيه أعمال ما يطلع.</p>
      </div>
      {sections.map((s) => (
        <SectionForm key={s.cat} s={s} name={SHOWCASE_CATS.find((c) => c[0] === s.cat)![1]} defIntro={DEFAULT_INTRO[s.cat] ?? ""} defSteps={DEFAULT_STEPS} />
      ))}
    </div>
  );
}
