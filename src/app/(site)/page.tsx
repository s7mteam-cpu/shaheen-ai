import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Circuit } from "@/components/Circuit";
import { ManagedService } from "@/components/site/ManagedService";
import { getContent, getGallery, getPlans, getTools } from "@/lib/data";
import { getLang } from "@/lib/server/lang";
import { localize } from "@/lib/server/translate";
import { tr } from "@/lib/i18n";

export const revalidate = 60;

const catLabel = { ar: { image: "صور", video: "فيديو", audio: "صوت" }, en: { image: "Images", video: "Video", audio: "Audio" } } as const;

export default async function Home() {
  const lang = await getLang();
  const [content, tools0, plans0, gallery0] = await Promise.all([getContent(), getTools(), getPlans(), getGallery()]);
  // Everything the admin writes in Arabic is shown translated when the visitor picks English.
  const { hero, steps, tools_section, gallery: galleryText, pricing, faq, final_cta, managed_service } = content;
  const [c, tools, plans, gallery] = await localize(
    [{ hero, steps, tools_section, gallery: galleryText, pricing, faq, final_cta, managed_service }, tools0, plans0, gallery0] as const, lang);
  const T = (ar: string, en: string) => tr(lang, ar, en);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Circuit className="pointer-events-none absolute -left-10 top-5 hidden w-[520px] opacity-35 md:block" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-14 px-6 pb-10 pt-12 md:pb-16 md:pt-20">
          <div className="flex min-h-[calc(100svh-62px-4.25rem)] min-w-0 flex-[1_1_460px] flex-col items-center gap-6 text-center md:min-h-0 md:items-start md:gap-6 md:text-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D3DDEA] bg-tint px-3.5 py-2 text-sm font-semibold text-navy-700">
              <span className="h-2 w-2 rounded-full bg-gold-500" />{c.hero.badge}
            </span>
            <h1 className="relative isolate text-[42px] font-extrabold leading-[1.3] text-navy-900 md:text-[60px]">
              {c.hero.title}{" "}
              <span className="relative whitespace-nowrap text-navy-700">
                {c.hero.highlight}
                <span aria-hidden className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-md bg-gold-500/35" />
              </span>
            </h1>
            <p className="max-w-xl text-[19px] font-medium leading-8 text-ink/80 md:text-xl md:leading-9">{c.hero.subtitle}</p>
            <div className="mt-5 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center md:mt-0 md:justify-start">
              <a href="#pricing" className="btn btn-primary px-7 py-4 text-[17px]">{c.hero.cta_primary}<Icon name="arrow" size={18} /></a>
              <a href="#tools" className="btn btn-outline px-6 py-4 text-[17px] font-semibold">{c.hero.cta_secondary}</a>
            </div>
            <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted md:mt-0 md:justify-start md:pb-0">
              {c.hero.points.map((p) => (
                <li key={p} className="inline-flex items-center gap-1.5"><Icon name="check" size={16} className="text-navy-700" strokeWidth={2.2} />{p}</li>
              ))}
            </ul>
          </div>

          <div className="hidden min-w-0 flex-[1_1_420px] justify-center md:flex">
            {c.hero.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.hero.image} alt="" className="w-full max-w-[520px] rounded-3xl shadow-[0_30px_60px_-30px_rgba(11,42,74,0.4)]" />
            ) : (
            <div className="relative flex aspect-square w-full max-w-[460px] items-center justify-center overflow-hidden rounded-[32px] bg-navy-800 shadow-[0_30px_60px_-30px_rgba(11,42,74,0.5)]">
              <Circuit className="absolute inset-0 h-full w-full text-gold-500/15" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/eagle.png" alt={T("شعار شاهين", "Shaheen logo")} className="relative w-[62%] drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)]" />
            </div>
            )}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section id="how" className="border-y border-[#E6EBF2] bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20">
          <div className="text-center"><h2 className="text-3xl font-bold text-navy-900 md:text-4xl">{c.steps.title}</h2><p className="mt-2.5 text-[17px] text-muted">{c.steps.subtitle}</p></div>
          <div className="grid gap-5 md:grid-cols-3">
            {c.steps.items.map((s, i) => (
              <div key={i} className="card flex flex-col gap-3 p-7">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 font-latin text-[15px] font-bold text-navy-900">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-xl font-bold">{s.title}</h3>
                <p className="text-[15px] leading-7 text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section id="tools">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><span className="text-sm font-semibold text-navy-700">{c.tools_section.eyebrow}</span><h2 className="mt-2.5 text-3xl font-bold text-navy-900 md:text-4xl">{c.tools_section.title}</h2></div>
            <a href="#pricing" className="text-[15px] font-semibold text-navy-700">{T("كل الأدوات متاحة في كل الباقات ←", "All tools are included in every plan →")}</a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <a key={t.id} href="#pricing" className="card flex flex-col gap-3 p-6 transition hover:-translate-y-0.5 hover:border-gold-500">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-800 text-gold-500"><Icon name={t.icon} size={24} /></span>
                <span className="text-xs font-semibold text-subtle">{catLabel[lang][t.category]}</span>
                <span className="text-[19px] font-bold text-navy-900">{t.name}</span>
                <span className="text-[15px] leading-7 text-muted">{t.description}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery (shown only when the admin adds items) */}
      {gallery.length > 0 && (
        <section className="border-y border-[#E6EBF2] bg-canvas">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-20">
            <div className="text-center"><h2 className="text-3xl font-bold text-navy-900 md:text-4xl">{c.gallery.title}</h2><p className="mt-2.5 text-[17px] text-muted">{c.gallery.subtitle}</p></div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {gallery.map((g) => (
                <figure key={g.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                  {g.media_type === "video"
                    ? <video src={g.media_url} className="aspect-[4/5] w-full object-cover" muted loop playsInline autoPlay />
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={g.media_url} alt={g.title} className="aspect-[4/5] w-full object-cover" />}
                  <figcaption className="p-3 text-sm font-semibold">{g.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <section id="pricing">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-24">
          <div className="text-center"><h2 className="text-3xl font-bold text-navy-900 md:text-4xl">{c.pricing.title}</h2><p className="mt-2.5 text-[17px] text-muted">{c.pricing.subtitle}</p></div>
          <div className="grid items-stretch gap-5 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className={p.is_featured
                ? "relative flex flex-col gap-5 rounded-3xl border-2 border-gold-500 bg-navy-800 p-8 text-white"
                : "card flex flex-col gap-5 rounded-3xl p-8"}>
                {p.is_featured && <span className="absolute -top-3.5 end-8 rounded-full bg-gold-500 px-3 py-1 text-[13px] font-bold text-navy-900">{T("الأكثر اختياراً", "Most popular")}</span>}
                <div><div className={`text-lg font-bold ${p.is_featured ? "text-gold-500" : ""}`}>{p.name}</div><div className={`mt-1 text-sm ${p.is_featured ? "text-white/75" : "text-subtle"}`}>{p.subtitle}</div></div>
                <div className="flex items-baseline gap-2"><span className="font-latin text-5xl font-bold">{Number(p.price_kwd)}</span><span className="font-semibold">{T("د.ك", "KWD")}</span><span className={p.is_featured ? "text-white/75" : "text-subtle"}>{T("/ شهرياً", "/ month")}</span></div>
                <ul className="flex flex-col gap-2.5 text-[15px]">
                  <li className="flex items-center gap-2"><Icon name="feather" size={16} className="text-gold-500" />{p.credits.toLocaleString("en")} {T("ريشة كل شهر", "credits every month")}</li>
                  {(p.bonus_credits ?? 0) > 0 && <li className={`flex items-center gap-2 font-bold ${p.is_featured ? "text-gold-500" : "text-[#9A7A35]"}`}><span aria-hidden="true" className="w-4 text-center text-[15px]">🎁</span>+ {p.bonus_credits!.toLocaleString("en")} {T("ريشة هدية كل شهر", "bonus credits every month")}</li>}
                  {p.features.map((f) => <li key={f} className="flex items-center gap-2"><Icon name="check" size={16} className={p.is_featured ? "text-gold-500" : "text-navy-700"} strokeWidth={2.2} />{f}</li>)}
                </ul>
                <Link href={`/signup?plan=${p.id}`} className={`btn mt-auto py-3.5 ${p.is_featured ? "btn-gold" : "btn-outline"}`}>{T(`اشترك في ${p.name}`, `Get ${p.name}`)}</Link>
              </div>
            ))}
          </div>
          <ManagedService s={c.managed_service} lang={lang} />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-[#E6EBF2] bg-canvas">
        <div className="mx-auto flex max-w-3xl flex-col gap-7 px-6 py-20">
          <h2 className="text-center text-3xl font-bold text-navy-900 md:text-4xl">{T("أسئلة شائعة", "Frequently asked questions")}</h2>
          <div className="flex flex-col gap-3">
            {c.faq.items.map((f) => (
              <details key={f.q} className="group card rounded-2xl px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}<span aria-hidden className="text-2xl text-navy-700 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-7 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-navy-800">
        <Circuit flip className="pointer-events-none absolute -bottom-10 -right-16 w-[600px] opacity-25" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8 px-6 py-20">
          <div className="flex flex-[1_1_420px] flex-col gap-3"><h2 className="text-3xl font-bold text-white md:text-[38px]">{c.final_cta.title}</h2><p className="text-lg text-white/80">{c.final_cta.subtitle}</p></div>
          <a href="#pricing" className="btn btn-gold px-8 py-4 text-lg">{c.final_cta.cta}</a>
        </div>
      </section>
    </main>
  );
}
