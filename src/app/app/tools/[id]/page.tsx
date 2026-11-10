import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ToolRunner } from "@/components/app/ToolRunner";
import { MotionStart } from "@/components/app/MotionStart";
import { MotionStudio } from "@/components/app/MotionStudio";
import { createClient } from "@/lib/supabase/server";
import type { MotionSpec } from "@/remotion/spec";
import { getContent, getSessionProfile, getTools } from "@/lib/data";
import { toolSpecs } from "@/lib/tools/specs";
import { listWorks } from "@/lib/works";

type P = { params: Promise<{ id: string }>; searchParams: Promise<{ job?: string }> };

export async function generateMetadata({ params }: P) {
  const { id } = await params;
  const t = (await getTools()).find((x) => x.id === id);
  return { title: t?.name ?? "أداة" };
}

export default async function ToolPage({ params, searchParams }: P) {
  const { id } = await params;
  const { job } = await searchParams;
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
      {id === "motion-video" ? await motion(job, tool, profile?.credits ?? 0, content) : <Suspense>
        <ToolRunner tool={tool} balance={profile?.credits ?? 0} voices={content.voices.items} recent={recent} />
      </Suspense>}
    </div>
  );
}

type ToolRow = Awaited<ReturnType<typeof getTools>>[number];
type Content = Awaited<ReturnType<typeof getContent>>;

/** Motion graphics: idea form, or the live studio for one of the user's drafts. */
async function motion(jobId: string | undefined, tool: ToolRow, balance: number, content: Content) {
  const supabase = await createClient();
  if (jobId) {
    const { data } = await supabase.from("jobs").select("id,status,input").eq("id", jobId).maybeSingle();
    const spec = (data?.input as { spec?: MotionSpec } | null)?.spec;
    if (data && data.status === "draft" && spec) {
      const tracks = content.motion_music?.items ?? [];
      return <MotionStudio jobId={data.id} initial={spec} editCost={tool.edit_cost ?? 3} tracks={tracks} voices={content.voices.items} />;
    }
    if (data && data.status !== "draft") {
      return <p className="card p-6 text-center">هذا الفيديو انرسل للتصدير، تلقاه في <Link href="/app/works" className="font-semibold text-navy-700 underline">أعمالي</Link>.</p>;
    }
  }
  const { data: kit } = await supabase.from("brand_kits").select("business_name").maybeSingle();
  return <MotionStart costPer15={tool.credit_cost} balance={balance} brand={kit?.business_name ?? undefined} />;
}
