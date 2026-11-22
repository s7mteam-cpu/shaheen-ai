import { pairOf } from "@/lib/toolPairs";
import { KindSwitch } from "@/components/app/KindSwitch";
import { getFreeEngine } from "@/lib/server/freeEngine";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ToolRunner } from "@/components/app/ToolRunner";
import { MotionStart } from "@/components/app/MotionStart";
import { PresentationStart } from "@/components/app/PresentationStart";
import { BCardStart } from "@/components/app/BCardStart";
import { InviteStart } from "@/components/app/InviteStart";
import { DocResult } from "@/components/app/DocResult";
import { CVStart } from "@/components/app/CVStart";
import { CVStudio } from "@/components/app/CVStudio";
import { normaliseCV } from "@/cv/spec";
import { extraPricing } from "@/lib/server/pricing";
import { RealScenesStart } from "@/components/app/RealScenesStart";
import { SiteVideoStart } from "@/components/app/SiteVideoStart";
import { FreeMotionStart } from "@/components/app/FreeMotionStart";
import { brandKitInfo, brandKitLogo } from "@/lib/server/freeMotion";
import { QuranStudio } from "@/components/app/QuranStudio";
import { MotionStudio } from "@/components/app/MotionStudio";
import { MontageStudio } from "@/components/app/MontageStudio";
import { CaptionBox } from "@/components/app/CaptionBox";
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
import { FreePostStart } from "@/components/app/FreePostStart";
import { toolSpecs } from "@/lib/tools/specs";
import { listWorks } from "@/lib/works";
import { getL } from "@/lib/server/lang";
import { LikeNote } from "@/components/app/LikeNote";
import { loadTemplate } from "@/lib/server/templates";
import { loadLike } from "@/lib/server/like";
import { DemoVideo } from "@/components/DemoVideo";

type P = { params: Promise<{ id: string }>; searchParams: Promise<{ job?: string; like?: string; idea?: string; tpl?: string }> };

export async function generateMetadata({ params }: P) {
  const L = await getL();
  const { id } = await params;
  const t = (await getToolsL()).find((x) => x.id === id);
  return { title: t?.name ?? L("أداة") };
}

export default async function ToolPage({ params, searchParams }: P) {
  const L = await getL();
  const { id } = await params;
  const { job, like: likeId, idea: ideaRaw, tpl: tplId } = await searchParams;
  const idea = String(ideaRaw ?? "").slice(0, 1200);
  const likeWork = await loadLike(likeId);
  const tplFull = await loadTemplate(tplId);
  const template = tplFull ? { id: tplFull.id, title: tplFull.title, thumb: tplFull.thumb_url, style: tplFull.style, seconds: tplFull.seconds } : undefined;
  const like = likeWork ? { id: likeWork.id, title: likeWork.title, thumb: likeWork.image, idea } : undefined;
  const [tools, profile, content, recent] = await Promise.all([getToolsL(), getSessionProfile(), getContent(), listWorks({ tool: id, limit: 8 })]);
  if (id === "lesson-video") redirect(job ? `/app/tools/motion-video?job=${job}` : "/app/tools/motion-video"); // the educational video is now part of motion graphics
  const tool = tools.find((t) => t.id === id);
  if (!tool || !toolSpecs[id]) notFound();
  const pair = pairOf(id, tools);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <nav aria-label={L("مسار الصفحة")} className="text-sm text-subtle"><Link href="/app" className="text-navy-700">{L("الرئيسية")}</Link> › <Link href="/app/tools" className="text-navy-700">{L("الأدوات")}</Link> › {tool.name}</nav>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
          <h1 className={job ? "text-[22px] font-bold text-navy-900" : "text-[28px] font-bold text-navy-900"}>{tool.name}</h1>
          <div className="flex flex-wrap gap-2">
            {tool.tutorial_url && (/youtu/.test(tool.tutorial_url)
              ? <a href={tool.tutorial_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline gap-2 px-4 py-2 text-[14px]">▶ {L("علّمني الطريقة")}</a>
              : <DemoVideo url={tool.tutorial_url} title={tool.name} variant="button" label={L("علّمني الطريقة")} />)}
            {tool.demo_url && <DemoVideo url={tool.demo_url} title={tool.name} variant="button" />}
          </div>
        </div>
        {!job && <p className="mt-1 text-muted">{tool.description}</p>}
        {!job && <p className="mt-1 text-[12px] text-subtle">{L("باستخدامك الأداة توافق على")} <Link href="/content-policy" target="_blank" className="underline">{L("سياسة المحتوى")}</Link>{L(": أي محتوى غير أخلاقي ممنوع ويوقف الحساب.")}</p>}
      </div>
      {!job && pair && <KindSwitch current={id} templates={pair.templates} fresh={pair.fresh} L={L} />}
      {like && !DESIGN_TOOLS[id] && <LikeNote like={like} />}
      {id === "presentations" ? await presentations(job, tool, profile?.credits ?? 0) : id === "cv" ? await cv(job, tool, profile?.credits ?? 0) : DESIGN_TOOLS[id] ? await design(job, tool, profile?.credits ?? 0, like, idea) : id === "free-motion" ? <Suspense><FreeMotionStart voices={content.voices.items} costPer15={tool.credit_cost} editCost={tool.edit_cost ?? 8} balance={profile?.credits ?? 0} kitLogo={job ? await brandKitLogo() : null} kit={await brandKitInfo()} /></Suspense> : id === "free-post" || id === "free-carousel" || id === "free-ad" || id === "free-invite" || id === "free-card" || id === "free-deck" || id === "free-cv" ? <Suspense><FreePostStart tool={id} costPerSlide={tool.credit_cost} balance={profile?.credits ?? 0} hasKit={!!(await brandKitInfo())} hasLogo={!!(await brandKitLogo())} /></Suspense> : id === "site-video" ? <SiteVideoStart costPer15={tool.credit_cost} balance={profile?.credits ?? 0} voices={content.voices.items} /> : id === "site-free" ? <SiteVideoStart fresh ready={await siteInnovative()} costPer15={tool.credit_cost} balance={profile?.credits ?? 0} voices={content.voices.items} /> : id === "motion-video" || id === "real-scenes" ? await motion(job, tool, profile?.credits ?? 0, content, idea, likeWork?.id, template, id) : id === "quran-video" ? <QuranStudio costPer30={tool.credit_cost} balance={profile?.credits ?? 0} /> : (id === "video-editing" && job && (await montage(job, tool, content))) || <Suspense>
        <ToolRunner tool={tool} balance={profile?.credits ?? 0} voices={content.voices.items} recent={recent} />
      </Suspense>}
    </div>
  );
}

type ToolRow = Awaited<ReturnType<typeof getTools>>[number];
type Content = Awaited<ReturnType<typeof getContent>>;

/** «عروض PowerPoint»: the request form, or the finished deck of one job. */
async function presentations(jobId: string | undefined, tool: ToolRow, balance: number) {
  const L = await getL();
  const supabase = await createClient();
  if (jobId) {
    const { data } = await supabase.from("jobs").select("status,title,input,output,error").eq("id", jobId).maybeSingle();
    if (data?.status === "done") {
      const path = (data.output as { files?: { path: string }[] } | null)?.files?.[0]?.path;
      const [url] = path ? await signedResultUrls([path]) : [];
      const outline = ((data.input as { outline?: string[] } | null)?.outline ?? []).filter(Boolean);
      return <DocResult title={data.title ?? tool.name} url={url} items={outline} again="/app/tools/presentations" />;
    }
    if (data?.status === "failed") return <p className="card p-6 text-center">{L("ما اكتمل العرض ورجعنا لك الريش. جرّب مرة ثانية.")}</p>;
  }
  const { data: kit } = await supabase.from("brand_kits").select("business_name,colors,logo_url").maybeSingle();
  const hasKit = !!(kit && ((kit.colors ?? []).filter(Boolean).length || kit.logo_url));
  return <PresentationStart cost={tool.credit_cost} balance={balance} hasKit={hasKit} autoUnits={(await extraPricing()).pres_auto_units} imgCost={(await extraPricing()).pres_image_cost} />;
}

/** Motion graphics: idea form, or the live studio for one of the user's drafts. */
async function motion(jobId: string | undefined, tool: ToolRow, balance: number, content: Content, idea = "", likeId?: string, template?: { id: string; title: string; thumb: string | null; style: string; seconds: number }, toolId = "motion-video") {
  const L = await getL();
  const supabase = await createClient();
  if (jobId) {
    const { data } = await supabase.from("jobs").select("id,user_id,status,input").eq("id", jobId).maybeSingle();
    const spec = (data?.input as { spec?: MotionSpec } | null)?.spec;
    // new motion videos are built on the montage engine (industry packs, 48 scene kinds)
    if (spec && "segments" in (spec as object)) return (await montage(jobId, tool, content, toolId)) ?? <p className="card p-6 text-center">{L("هذا الفيديو انرسل للتصدير، تلقاه في")} <Link href="/app/works" className="font-semibold text-navy-700 underline">{L("أعمالي")}</Link>.</p>;
    if (data && data.status === "draft" && spec) {
      const tracks = content.motion_music?.items ?? [];
      const admin = createAdminClient();
      const { data: kitRow } = await supabase.from("brand_kits").select("logo_url").maybeSingle();
      const kitLogo = kitRow?.logo_url ? { path: kitRow.logo_url as string, url: (await admin.storage.from("uploads").createSignedUrl(kitRow.logo_url, 60 * 60 * 6)).data?.signedUrl ?? "" } : null;
      const logo = spec.logo?.path && String(spec.logo.path).startsWith(`${data.user_id}/`) && !String(spec.logo.path).includes("..") ? { ...spec.logo, url: (await admin.storage.from("uploads").createSignedUrl(spec.logo.path, 60 * 60 * 6)).data?.signedUrl ?? "" } : spec.logo ?? null;
      const cap = (data.input as { caption?: string } | null)?.caption;
      return <><MotionStudio jobId={data.id} initial={{ ...spec, logo }} editCost={tool.edit_cost ?? 3} tracks={tracks} voices={content.voices.items} kitLogo={kitLogo} />{cap ? <CaptionBox text={cap} /> : null}</>;
    }
    if (data && data.status === "done" && spec) return await reopen(data.id, toolId, tool);
    if (data && data.status !== "draft") {
      return <p className="card p-6 text-center">{L("هذا الفيديو انرسل للتصدير، تلقاه في")} <Link href="/app/works" className="font-semibold text-navy-700 underline">{L("أعمالي")}</Link>.</p>;
    }
  }
  const { data: kit } = await supabase.from("brand_kits").select("business_name").maybeSingle();
  if (toolId === "real-scenes") return <RealScenesStart costPer15={tool.credit_cost} aiX={(await extraPricing()).ai_clip_x} balance={balance} brand={kit?.business_name ?? undefined} voices={content.voices.items} />;
  return <MotionStart template={template} likeId={likeId} idea={idea} costPer15={tool.credit_cost} balance={balance} brand={kit?.business_name ?? undefined} voices={content.voices.items} />;
}

/** Smart montage: once the worker planned the edit, the customer edits it live here. */
async function montage(jobId: string, tool: ToolRow, content: Content, toolId = "video-editing") {
  const L = await getL();
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("id,user_id,status,input").eq("id", jobId).maybeSingle();
  const spec = (data?.input as { spec?: MontageSpec } | null)?.spec;
  // SECURITY (second lock after the API checks): nothing outside the owner's own folder is ever signed here
  const inOwn = (p?: string | null) => typeof p === "string" && !!data && p.startsWith(`${data.user_id}/`) && !p.includes("..");
  if (spec) {
    if (spec.srcPath && !inOwn(spec.srcPath)) spec.srcPath = "";
    if (spec.logo?.path && !inOwn(spec.logo.path)) spec.logo = null;
    spec.broll = (spec.broll ?? []).filter((b) => inOwn(b.path));
    if (spec.music?.path && !inOwn(spec.music.path)) spec.music = null;
    if (spec.vo?.path && !inOwn(spec.vo.path)) spec.vo = null;
    spec.graphics = (spec.graphics ?? []).map((g) => ({ ...g, img: inOwn(g.img) ? g.img : undefined, img2: inOwn(g.img2) ? g.img2 : undefined }));
  }
  if (data?.status === "done" && spec?.segments) return await reopen(data.id, toolId, tool);
  if (data && data.status !== "draft" && toolId !== "video-editing") return <p className="card p-6 text-center">{L("هذا الفيديو انرسل للتصدير، تلقاه في")} <Link href="/app/works" className="font-semibold text-navy-700 underline">{L("أعمالي")}</Link>.</p>;
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
  const pics = [...new Set((spec.graphics ?? []).flatMap((g) => [g.img, g.img2]).filter((x): x is string => !!x))];
  const picUrls = pics.length ? (await createAdminClient().storage.from("results").createSignedUrls(pics, 60 * 60 * 6)).data ?? [] : [];
  const graphics = (spec.graphics ?? []).map((g) => (g.img ? { ...g, url: picUrls[pics.indexOf(g.img)]?.signedUrl ?? "", ...(g.img2 ? { url2: picUrls[pics.indexOf(g.img2)]?.signedUrl ?? "" } : {}) } : g));
  const { data: kitRow } = await supabase.from("brand_kits").select("colors,font,handle,business_name").maybeSingle();
  const kit = kitRow ? { colors: (kitRow.colors ?? []) as string[], font: kitRow.font as string | null, handle: kitRow.handle as string | null, name: kitRow.business_name as string | null } : null;
  const caption = (data.input as { caption?: string } | null)?.caption;
  return <><MontageStudio voices={content.voices.items} kit={kit} jobId={data.id} initial={{ ...spec, src: signed?.signedUrl ?? "", logo: spec.logo ? { ...spec.logo, url: logoUrl } : null, broll, music, vo, graphics }} editCost={tool.edit_cost ?? 3} tracks={content.motion_music?.items ?? []} />
    {caption ? <CaptionBox text={caption} /> : null}</>;
}

/** Posts, carousels and ads: the info form, or the live design studio for one of the user's designs. */
async function cv(jobId: string | undefined, tool: ToolRow, balance: number) {
  const L = await getL();
  const supabase = await createClient();
  if (jobId) {
    const { data } = await supabase.from("jobs").select("id,user_id,status,input,output").eq("id", jobId).maybeSingle();
    const raw = (data?.input as { spec?: unknown } | null)?.spec;
    if (data && raw) {
      if (data.status === "queued" || data.status === "running") return <p className="card p-6 text-center">{L("السيرة قيد التصدير، تلقاها بعد لحظات في")} <Link href="/app/works" className="font-semibold text-navy-700 underline">{L("أعمالي")}</Link>.</p>;
      const spec = normaliseCV(raw);
      if (spec.photo?.path && !(spec.photo.path.startsWith(`${data.user_id}/`) && !spec.photo.path.includes(".."))) spec.photo = null;
      if (spec.photo?.path) {
        const { data: sg } = await createAdminClient().storage.from("uploads").createSignedUrl(spec.photo.path, 60 * 60 * 6);
        spec.photo = sg?.signedUrl ? { ...spec.photo, url: sg.signedUrl } : null;
      }
      const files = data.status === "done" ? ((data.output as { files?: { path: string }[] } | null)?.files ?? []) : [];
      const done = files.length ? (await signedResultUrls(files.map((f) => f.path))).map((url) => ({ url })) : undefined;
      return <CVStudio key={data.id} jobId={data.id} initial={spec} editCost={tool.edit_cost ?? 2} done={done} />;
    }
  }
  return <CVStart cost={tool.credit_cost} balance={balance} />;
}

async function design(jobId: string | undefined, tool: ToolRow, balance: number, like?: { id: string; title: string; thumb: string | null; idea: string }, idea = "") {
  const L = await getL();
  const supabase = await createClient();
  if (jobId) {
    const { data } = await supabase.from("jobs").select("id,user_id,status,input,output").eq("id", jobId).maybeSingle();
    const spec = (data?.input as { spec?: DesignSpec } | null)?.spec;
    if (data && spec) {
      if (data.status === "queued" || data.status === "running") {
        return <p className="card p-6 text-center">{L("التصميم قيد التصدير، تلقاه بعد لحظات في")} <Link href="/app/works" className="font-semibold text-navy-700 underline">{L("أعمالي")}</Link>.</p>;
      }
      const admin = createAdminClient();
      const urls: Record<string, string> = {};
      // SECURITY: only files inside the folder of the design's owner are ever signed
      const imgs = designImages(spec).filter((i) => typeof i.path === "string" && i.path.startsWith(`${data.user_id}/`) && !i.path.includes(".."));
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
  if (tool.id === "invitations") { const { data: k } = await supabase.from("brand_kits").select("colors").maybeSingle(); return <InviteStart cost={tool.credit_cost} balance={balance} hasKit={!!(k && (k.colors ?? []).filter(Boolean).length)} />; }
  if (tool.id === "business-cards") { const { data: k } = await supabase.from("brand_kits").select("colors,logo_url").maybeSingle(); return <BCardStart cost={tool.credit_cost} balance={balance} hasKit={!!(k && ((k.colors ?? []).filter(Boolean).length || k.logo_url))} />; }
  return <DesignStart idea={idea} like={like} toolId={tool.id} cost={tool.credit_cost} balance={balance} industry={(kitInd?.industry as string | null) ?? null} />;
}

/** A finished studio video: watch / download, or reopen it for more edits (costs one edit). */
async function reopen(jobId: string, toolId: string, tool: ToolRow) {
  const { data } = await (await createClient()).from("jobs").select("output,input").eq("id", jobId).single();
  const path = (data?.output as { files?: { path: string }[] } | null)?.files?.[0]?.path;
  const [url] = path ? await signedResultUrls([path]) : [];
  const caption = (data?.input as { caption?: string } | null)?.caption;
  return <><ReopenCard jobId={jobId} url={url} cost={tool.edit_cost ?? 3} toolId={toolId} />{caption ? <CaptionBox text={caption} /> : null}</>;
}

/** «فيديو مبتكر من موقعك»: is the innovative video engine open */
async function siteInnovative(): Promise<boolean> {
  const eng = await getFreeEngine().catch(() => null);
  if (eng?.engine !== "gemini") return false;
  const { data } = await createAdminClient().from("tools").select("is_enabled").eq("id", "free-motion").maybeSingle();
  return !!data?.is_enabled;
}
