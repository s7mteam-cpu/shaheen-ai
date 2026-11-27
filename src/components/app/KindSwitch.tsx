import Link from "next/link";

type T = { id: string; credit_cost: number; cost_unit: string | null };
/** the two ways to make this thing: ready templates, or a brand-new design. Two big choices on top of the tool's page. */
export function KindSwitch({ current, templates, fresh, L, paused }: { current: string; templates: T; fresh: T; L: (s: string) => string; paused?: Record<string, string | undefined> }) {
  const opts = [
    { t: templates, icon: "🎨", title: "قوالب جاهزة", desc: ["cv", "site-video"].includes(templates.id) ? "اختر من 50 ستايل مجرّب. نتيجة مضمونة وسريعة." : "اختر من مئات الستايلات المجرّبة. نتيجة مضمونة وسريعة." },
    { t: fresh, icon: "✨", title: "مبتكر", desc: "تصميم جديد من الصفر حسب وصفك. كل مرة مختلف. (تجريبي)" },
  ];
  return (
    <nav aria-label={L("طريقة التصميم")}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {opts.map(({ t, icon, title, desc }) => {
          const on = t.id === current;
          const off = paused?.[t.id];
          if (off) return (
            <li key={t.id} className="flex">
              <Link href={`/app/tools/${t.id}`} scroll={false} aria-current={on ? "page" : undefined}
                className={`flex w-full flex-col gap-1 rounded-2xl border-2 p-4 opacity-80 ${on ? "border-gold-500 bg-gold-500/10" : "border-line bg-white"}`}>
                <span className="text-[17px] font-bold text-navy-900">{icon} {L(title)}</span>
                <span className="text-[13.5px] leading-6 text-muted">⏳ {L(off)}</span>
              </Link>
            </li>
          );
          return (
            <li key={t.id} className="flex">
              <Link href={`/app/tools/${t.id}`} scroll={false} aria-current={on ? "page" : undefined}
                className={`flex w-full flex-col gap-1 rounded-2xl border-2 p-4 transition ${on ? "border-gold-500 bg-gold-500/10 shadow-sm" : "border-line bg-white hover:border-gold-400"}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[17px] font-bold text-navy-900">{icon} {L(title)}</span>
                  <span className="shrink-0 rounded-full bg-navy-900/5 px-2.5 py-0.5 text-[12px] font-semibold text-navy-700">{t.credit_cost} {L("ريشة /")} {t.cost_unit}</span>
                </span>
                <span className="text-[13.5px] leading-6 text-muted">{L(desc)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
