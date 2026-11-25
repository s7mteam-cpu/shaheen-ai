import Link from "next/link";
import type { Metadata } from "next";
import { TemplateLibrary } from "@/components/TemplateLibrary";
import { notFound } from "next/navigation";
import { getSessionProfile, getTemplates, templatesHidden } from "@/lib/data";
import { getLang } from "@/lib/server/lang";
import { tr } from "@/lib/i18n";

export const revalidate = 60;
export const metadata: Metadata = { title: "مكتبة القوالب | شاهين" };

/** The public template library: every ready-made template, filterable by style. Right now it holds the motion-graphics templates; other tools join as they get theirs. */
export default async function TemplatesPage() {
  if (await templatesHidden()) notFound();
  const lang = await getLang();
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const [templates, profile] = await Promise.all([getTemplates(), getSessionProfile()]);
  return (
    <main className="bg-canvas">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 md:py-16">
        <div className="flex flex-col gap-3">
          <Link href="/" className="w-fit text-sm font-semibold text-navy-700">{T("→ الرئيسية", "← Home")}</Link>
          <h1 className="text-3xl font-bold text-navy-900 md:text-4xl">{T("مكتبة القوالب", "Template library")}</h1>
          <p className="max-w-2xl text-[16px] leading-8 text-muted">{T("قوالب جاهزة بستايلات مختلفة. افتح القالب الي يعجبك، اكتب معلومات نشاطك، وشاهين يسوي لك فيديو بنفس شكله.", "Ready-made templates in different styles. Open one, write your business info, and Shaheen builds a video in the same look.")}</p>
        </div>
        {templates.length ? <TemplateLibrary templates={templates} signedIn={Boolean(profile)} /> : <p className="rounded-2xl border border-line bg-white p-8 text-center text-muted">{T("القوالب قريباً.", "Templates are coming soon.")}</p>}
      </div>
    </main>
  );
}
