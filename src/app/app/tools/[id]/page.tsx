import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ToolRunner } from "@/components/app/ToolRunner";
import { MotionStart } from "@/components/app/MotionStart";
import { LessonStart } from "@/components/app/LessonStart";
import { MotionStudio } from "@/components/app/MotionStudio";
import { MontageStudio } from "@/components/app/MontageStudio";
import { DesignStart } from "@/components/app/DesignStart";
import { DesignStudio } from "@/components/app/DesignStudio";
import { ReopenCard } from "@/components/app/ReopenCard";
import { DESIGN_TOOLS, designImages, withUrls, type DesignSpec } from "@/design/spec";
import { signedResultUrls } from "@/lib/providers/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MontageSpec } from "@/remotion/montage";
import { createClient } from "@/lib/supabase/server";
import type { MotionSpec } from "@/remotion/spec";
import { getContent, getSessionProfile, getTools, getToolsL } from "@/lib/data";
import { toolSpecs } from "@/lib/tools/specs";
import { listWorks } from "@/lib/works";
import { getL } from "@/lib/server/lang";
import { DemoVideo } from "@/components/DemoVideo";

type P = { params: Promise<{ id: string }>; searchParams: Promise<{ job?: string }> };

export async function generateMetadata({ params }: P) {
  const L = await getL();
  const { id } = await params;
  const t = (await getToolsL()).find((x) => x.id === id);
  return { title: t?.name ?? L("أداة") };
}

export default async function ToolPage({ params, searchParams }: P) {
  const L = await getL();
  const { id } = await params;
  const { job } = await searchParams;
  const [tools, profile, content, recent] = await Promise.all([getToolsL(), getSessionProfile(), getContent(), listWorks({ tool: id, limit: 8 })]);
  const tool = tools.find((t) => t.id === id);
  if (!tool || !toolSpecs[id]) notFound();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <nav aria-label={L("مسار الصفحة")} className="text-sm text-subtle"><Link href="/app" className="text-navy-700">{L("الرئيسية")}</Link> › <Link href="/app/tools" className="text-navy-700">{L("الأدوات")}</Link> › {tool.name}</nav>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[28px] font-bold text-navy-900">{tool.name}</h1>
          {tool.demo_url && <DemoVideo url={tool.demo_url} title={tool.name} variant="button" />}
        </div>
        <p className="mt-1 text-muted">{tool.description}</p>
      </div>
      {DESIGN_TOOLS[id] ? await design(job, tool, profile?.credits ?? 0) : id === "motion-video" ? await motion(job, tool, profile?.credits ?? 0, content) : id === "lesson-video" ? ((job && (await montage(job, tool, content, "lesson-video"))) || <LessonStart costPer30={tool.credit_cost} balance={profile?.credits ?? 0} voices={content.voices.items} />) : (id === "video-editing" && job && (await montage(job, tool, content))) || <Suspense>
        <ToolRunner tool={tool} balance={profile?.credits ?? 0} voices={content.voices.items} recent={recent} />
      </Suspense>}
    </div>
  );
}

type ToolRow = Awaited<ReturnType<typeof getTools>>[number];
type Content = Awaited<ReturnType<typeof getContent>>;

/** Motion graphics: idea form, or the live studio for one of the user's drafts. */
async function motion(jobId: string | undefined, tool: ToolRow, balance: number, content: Content) {
  const L = await getL();
  const supabase = await createClient();
  if (jobId) {
    const { data } = await supabase.from("jobs").select("id,status,input").eq("id", jobId).maybeSingle();
    const spec = (data?.input as { spec?: MotionSpec } | null)?.spec;
    // new motion videos are built on the montage engine (industry packs, 48 scene kinds)
    if (spec && "segments" in (spec as object)) return (await montage(jobId, tool, content, "motion-video")) ?? <p className="card p-6 text-center">{L("هذا الفيديو انرسل للتصدير، تلقاه في")} <Link href="/app/works" className="font-semibold text-navy-700 underline">{L("أعمالي")}</Link>.</p>;
    if (data && data.status === "draft" && spec) {
      const tracks = content.motion_music?.items ?? [];
      const admin = createAdminClient();
      const { data: kitRow } = await supabase.from("brand_kits").select("logo_url").maybeSingle();
      const kitLogo = kitRow?.logo_url ? { path: kitRow.logo_url as string, url: (await admin.storage.from("uploads").createSignedUrl(kitRow.logo_url, 60 * 60 * 6)).data?.signedUrl ?? "" } : null;
      const logo = spec.logo?.path ? { ...spec.logo, url: (await admin.storage.from("uploads").createSignedUrl(spec.logo.path, 60 * 60 * 6)).data?.signedUrl ?? "" } : spec.logo ?? null;
      return <MotionStudio jobId={data.id} initial={{ ...spec, logo }} editCost={tool.edit_cost ?? 3} tracks={tracks} voices={content.voices.items} kitLogo={kitLogo} />;
    }
    if (data && data.status === "done" && spec) return await reopen(data.id, "motion-video", tool);
    if (data && data.status !== "draft") {
      return <p className="card p-6 text-center">{L("هذا الفيديو انرسل للتصدير، تلقاه في")} <Link href="/app/works" className="font-semibold text-navy-700 underline">{L("أعمالي")}</Link>.</p>;
    }
  }
  const { data: kit } = await supabase.from("brand_kits").select("business_name").maybeSingle();
  return <MotionStart costPer15={tool.credit_cost} balance={balance} brand={kit?.business_name ?? undefined} voices={content.voices.items} />;
}

/** Smart montage: once the worker planned the edit, the customer edits it live here. */
async function montage(jobId: string, tool: ToolRow, content: Content, toolId = "video-editing") {
  const L = await getL();
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("id,status,input").eq("id", jobId).maybeSingle();
  const spec = (data?.input as { spec?: MontageSpec } | null)?.spec;
  if (data?.status === "done" && spec?.segments) return await reopen(data.id, toolId, tool);
  if (data && data.status !== "draft" && toolId === "lesson-video") return <p className="card p-6 text-center">{L("هذا الفيديو انرسل للتصدير، تلقاه في")} <Link href="/app/works" className="font-semibold text-navy-700 underline">{L("أعمالي")}</Link>.</p>;
  if (!data || data.status !== "draft" || !spec) return null;
  // animated lessons have no source footage
  const { data: signed } = spec.srcPath ? await createAdminClient().storage.from("uploads").createSignedUrl(spec.srcPath, 60 * 60 * 6) : { data: { signedUrl: "" } };
  if (spec.srcPath && !signed?.signedUrl) return <p className="card p-6 text-center">{L("ما لقينا الفيديو الأصلي. ارفعه مرة ثانية.")}</p>;
  const logoUrl = spec.logo?.path ? (await createAdminClient().storage.from("uploads").createSignedUrl(spec.logo.path, 60 * 60 * 6)).data?.signedUrl ?? "" : "";
  // photos: the customer's uploads, or our own copies (background removed / stock) in results
  const signAll = async (bucket: "uploads" | "results", paths: string[]) => (paths.length ? (await createAdminClient().storage.from(bucket).createSignedUrls(paths, 60 * 60 * 6)).data ?? [] : []);
  const upPaths = (spec.broll ?? []).filter((b) => b.bucket !== "results").map((b) => b.path);
  const resPaths = (spec.broll ?? []).filter((b) => b.bucket === "results").map((b) => b.path);
  const [upUrls, resUrls] = await Promise.all([signAll("uploads", upPaths), signAll("results", resPaths)]);
  const broll = (spec.broll ?? []).map((b) => ({ ...b, url: (b.bucket === "results" ? resUrls[resPaths.indexOf(b.path)] : upUrls[upPaths.indexOf(b.path)])?.signedUrl ?? "" }));
  const sign = async (p?: string) => (p ? (await createAdminClient().storage.from("results").createSignedUrl(p, 60 * 60 * 6)).data?.signedUrl ?? "" : "");
  const music = spec.music?.path
    ? { ...spec.music, url: spec.music.bucket === "uploads" ? (await createAdminClient().storage.from("uploads").createSignedUrl(spec.music.path, 60 * 60 * 6)).data?.signedUrl ?? "" : await sign(spec.music.path) }
    : spec.music ?? null;
  const vo = spec.vo ? { ...spec.vo, url: await sign(spec.vo.path) } : null;
  const pics = (spec.graphics ?? []).filter((g) => g.img).map((g) => g.img!);
  const picUrls = pics.length ? (await createAdminClient().storage.from("results").createSignedUrls(pics, 60 * 60 * 6)).data ?? [] : [];
  const graphics = (spec.graphics ?? []).map((g) => (g.img ? { ...g, url: picUrls[pics.indexOf(g.img)]?.signedUrl ?? "" } : g));
  const { data: kitRow } = await supabase.from("brand_kits").select("colors,font,handle,business_name").maybeSingle();
  const kit = kitRow ? { colors: (kitRow.colors ?? []) as string[], font: kitRow.font as string | null, handle: kitRow.handle as string | null, name: kitRow.business_name as string | null } : null;
  return <MontageStudio voices={content.voices.items} kit={kit} jobId={data.id} initial={{ ...spec, src: signed?.signedUrl ?? "", logo: spec.logo ? { ...spec.logo, url: logoUrl } : null, broll, music, vo, graphics }} editCost={tool.edit_cost ?? 3} tracks={content.motion_music?.items ?? []} />;
}

/** Posts, carousels and ads: the info form, or the live design studio for one of the user's designs. */
async function design(jobId: string | undefined, tool: ToolRow, balance: number) {
  const L = await getL();
  const supabase = await createClient();
  if (jobId) {
    const { data } = await supabase.from("jobs").select("id,status,input,output").eq("id", jobId).maybeSingle();
    const spec = (data?.input as { spec?: DesignSpec } | null)?.spec;
    if (data && spec) {
      if (data.status === "queued" || data.status === "running") {
        return <p className="card p-6 text-center">{L("التصميم قيد التصدير، تلقاه بعد لحظات في")} <Link href="/app/works" className="font-semibold text-navy-700 underline">{L("أعمالي")}</Link>.</p>;
      }
      const admin = createAdminClient();
      const urls: Record<string, string> = {};
      const imgs = designImages(spec);
      for (const bucket of ["uploads", "results"] as const) {
        const paths = imgs.filter((i) => i.bucket === bucket).map((i) => i.path);
        if (!paths.length) continue;
        const { data: signed } = await admin.storage.from(bucket).createSignedUrls(paths, 60 * 60 * 6);
        (signed ?? []).forEach((x, i) => { if (x.signedUrl) urls[`${bucket}:${paths[i]}`] = x.signedUrl; });
      }
      const { data: kitRow } = await supabase.from("brand_kits").select("colors,font,handle,business_name,logo_url").maybeSingle();
      const logoUrl = kitRow?.logo_url ? (await admin.storage.from("uploads").createSignedUrl(kitRow.logo_url, 60 * 60 * 6)).data?.signedUrl ?? "" : "";
      const kit = kitRow ? { colors: (kitRow.colors ?? []) as string[], font: kitRow.font as string | null, handle: kitRow.handle as string | null, name: kitRow.business_name as string | null, logo: kitRow.logo_url ? { path: kitRow.logo_url as string, bucket: "uploads" as const, url: logoUrl } : null } : null;
      const files = data.status === "done" ? ((data.output as { files?: { path: string }[] } | null)?.files ?? []) : [];
      const done = files.length ? (await signedResultUrls(files.map((f) => f.path))).map((url) => ({ url })) : undefined;
      return <DesignStudio key={data.id} jobId={data.id} toolId={tool.id} initial={withUrls(spec, urls)} editCost={tool.edit_cost ?? 2} kit={kit} done={done} />;
    }
  }
  const { data: kitInd } = await supabase.from("brand_kits").select("industry").maybeSingle();
  return <DesignStart toolId={tool.id} cost={tool.credit_cost} balance={balance} industry={(kitInd?.industry as string | null) ?? null} />;
}

/** A finished studio video: watch / download, or reopen it for more edits (costs one edit). */
async function reopen(jobId: string, toolId: string, tool: ToolRow) {
  const { data } = await (await createClient()).from("jobs").select("output").eq("id", jobId).single();
  const path = (data?.output as { files?: { path: string }[] } | null)?.files?.[0]?.path;
  const [url] = path ? await signedResultUrls([path]) : [];
  return <ReopenCard jobId={jobId} url={url} cost={tool.edit_cost ?? 3} toolId={toolId} />;
}
