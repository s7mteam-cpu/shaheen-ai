import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getTools } from "@/lib/data";

export const metadata = { title: "الأدوات" };
const groups = [["image", "صور"], ["video", "فيديو"], ["audio", "صوت"]] as const;

export default async function ToolsPage() {
  const tools = await getTools();
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[28px] font-bold text-navy-900">الأدوات</h1>
      {groups.map(([g, label]) => {
        const list = tools.filter((t) => t.category === g);
        if (!list.length) return null;
        return (
          <section key={g} className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-navy-700">{label}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((t) => (
                <Link key={t.id} href={`/app/tools/${t.id}`} className="card flex gap-4 p-5 transition hover:border-gold-500">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy-800 text-gold-500"><Icon name={t.icon} size={22} /></span>
                  <span className="flex flex-col gap-1"><span className="font-bold text-navy-900">{t.name}</span><span className="text-sm leading-6 text-muted">{t.description}</span><span className="text-[13px] font-semibold text-navy-700">{t.credit_cost} ريشة / {t.cost_unit}</span></span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
