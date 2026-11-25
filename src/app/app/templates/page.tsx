import { TemplateLibrary } from "@/components/TemplateLibrary";
import { redirect } from "next/navigation";
import { getTemplates, templatesHidden } from "@/lib/data";
import { getL } from "@/lib/server/lang";

export async function generateMetadata() { return { title: (await getL())("مكتبة القوالب") }; }

export default async function Templates() {
  if (await templatesHidden()) redirect("/app/showcase");
  const L = await getL();
  const templates = await getTemplates();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold text-navy-900">{L("مكتبة القوالب")}</h1>
        <p className="text-[15px] leading-7 text-muted">{L("قوالب جاهزة بستايلات مختلفة. افتح القالب، اكتب معلومات نشاطك، وشاهين يسوي لك فيديو بنفس شكله.")}</p>
      </div>
      {templates.length ? <TemplateLibrary templates={templates} signedIn /> : <p className="card p-10 text-center text-muted">{L("القوالب قريباً.")}</p>}
    </div>
  );
}
