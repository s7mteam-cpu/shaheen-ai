import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ToolRunner } from "@/components/app/ToolRunner";
import { getContent, getSessionProfile, getTools } from "@/lib/data";
import { toolSpecs } from "@/lib/tools/specs";
import { listWorks } from "@/lib/works";

type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P) {
  const { id } = await params;
  const t = (await getTools()).find((x) => x.id === id);
  return { title: t?.name ?? "أداة" };
}

export default async function ToolPage({ params }: P) {
  const { id } = await params;
  const [tools, profile, content, recent] = await Promise.all([getTools(), getSessionProfile(), getContent(), listWorks({ tool: id, limit: 8 })]);
  const tool = tools.find((t) => t.id === id);
  if (!tool || !toolSpecs[id]) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <nav aria-label="مسار الصفحة" className="text-sm text-subtle"><Link href="/app" className="text-navy-700">الرئيسية</Link> › <Link href="/app/tools" className="text-navy-700">الأدوات</Link> › {tool.name}</nav>
        <h1 className="mt-1.5 text-[28px] font-bold text-navy-900">{tool.name}</h1>
        <p className="mt-1 text-muted">{tool.description}</p>
      </div>
      <Suspense>
        <ToolRunner tool={tool} balance={profile?.credits ?? 0} voices={content.voices.items} recent={recent} />
      </Suspense>
    </div>
  );
}
