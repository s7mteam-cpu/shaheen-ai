import Link from "next/link";
import { WorksGrid } from "@/components/app/WorksGrid";
import { listWorks } from "@/lib/works";
import { getL } from "@/lib/server/lang";

export async function generateMetadata() { return { title: (await getL())("أعمالي") }; }
const filters = [["", "الكل"], ["image", "صور"], ["video", "فيديو"], ["audio", "صوت"]] as const;

export default async function Works({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const L = await getL();
  const { c = "" } = await searchParams;
  const works = await listWorks({ category: c || undefined, limit: 120 });
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-bold text-navy-900">{L("أعمالي")}</h1>
      <div className="flex flex-wrap gap-2" role="group" aria-label={L("تصفية حسب النوع")}>
        {filters.map(([v, l]) => <Link key={v} href={v ? `/app/works?c=${v}` : "/app/works"} aria-pressed={c === v} className="chip">{L(l)}</Link>)}
      </div>
      <WorksGrid key={c} works={works} />
    </div>
  );
}
