import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShowcaseGrid } from "@/components/Showcase";
import { getAllWorks, getContent, getSections, getSessionProfile } from "@/lib/data";
import { getLang } from "@/lib/server/lang";
import { localize } from "@/lib/server/translate";
import { tr } from "@/lib/i18n";
import { SHOWCASE_CATS } from "@/lib/showcase";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ cat: string }> }): Promise<Metadata> {
  const { cat } = await params;
  const c = SHOWCASE_CATS.find((x) => x[0] === cat);
  return { title: c ? `${c[1]} | أعمال صُنعت بشاهين` : "أعمال صُنعت بشاهين" };
}

/** One tool's page: what it does, how it works, its features, and every work made with it. */
export default async function ToolShowcase({ params }: { params: Promise<{ cat: string }> }) {
  const { cat } = await params;
  const name = SHOWCASE_CATS.find((x) => x[0] === cat);
  if (!name) notFound();
  const lang = await getLang();
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const [all, sections, profile, content] = await Promise.all([getAllWorks(), getSections(), getSessionProfile(), getContent()]);
  const sec = sections.find((x) => x.cat === cat);
  if (!sec || sec.hidden) notFound();
  const works = all.filter((g) => g.category === cat);
  const text = await localize({ intro: sec.intro, steps: sec.steps, features: sec.features }, lang);
  const others = sections.filter((x) => !x.hidden && x.cat !== cat && all.some((g) => g.category === x.cat));
  const cta = profile ? "/app" : "/signup";

  return (
    <main className="bg-canvas">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 md:py-16">
        <div className="flex flex-col gap-4">
          <Link href="/#showcase" className="w-fit text-sm font-semibold text-navy-700">{T("→ كل الأدوات", "← All tools")}</Link>
          <h1 className="text-3xl font-bold text-navy-900 md:text-4xl">{T(name[1], name[2])}</h1>
          {text.intro && <p className="max-w-2xl text-[17px] leading-8 text-muted">{text.intro}</p>}
          <Link href={cta} className="btn btn-primary w-fit px-8 py-3.5 text-base font-bold">{T("جرّب هالأداة", "Try this tool")}</Link>
        </div>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="card flex flex-col gap-3 p-6">
            <h2 className="text-xl font-bold text-navy-900">{T("طريقة العمل", "How it works")}</h2>
            <ol className="flex flex-col gap-3">
              {text.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-[16px] leading-7 text-ink">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-white">{i + 1}</span>{s}
                </li>
              ))}
            </ol>
          </div>
          {text.features.length > 0 && (
            <div className="card flex flex-col gap-3 p-6">
              <h2 className="text-xl font-bold text-navy-900">{T("المميزات", "Features")}</h2>
              <ul className="flex flex-col gap-2.5">
                {text.features.map((f, i) => <li key={i} className="flex items-start gap-2.5 text-[16px] leading-7 text-ink"><span className="mt-1 text-gold-500">✦</span>{f}</li>)}
              </ul>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-bold text-navy-900">{T("مكتبة الأعمال", "Works library")} <span className="text-base font-semibold text-muted">({works.length})</span></h2>
          <ShowcaseGrid items={works} signedIn={Boolean(profile)} like={content.gallery.like_enabled !== false} />
        </section>

        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <b className="text-xl text-navy-900">{T("تبي نتيجة مثل هذي؟", "Want results like these?")}</b>
          <Link href={cta} className="btn btn-primary px-8 py-3.5 text-base font-bold">{T("ابدأ الحين", "Start now")}</Link>
        </div>

        {others.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-navy-900">{T("أدوات ثانية", "More tools")}</h2>
            <div className="flex flex-wrap gap-2">
              {others.map((x) => { const n = SHOWCASE_CATS.find((k) => k[0] === x.cat)!; return <Link key={x.cat} href={`/showcase/${x.cat}`} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-navy-700">{T(n[1], n[2])}</Link>; })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
