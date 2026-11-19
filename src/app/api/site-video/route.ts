import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { checkSiteUrl, siteFromOutput } from "@/lib/server/siteCapture";
import { signedResultUrls } from "@/lib/providers/storage";

export const maxDuration = 30;

/** Step 1 of «فيديو من موقعك» (free): asks the video worker to open the website and take its pictures. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as { url?: unknown };
  const u = await checkSiteUrl(String(b.url ?? ""));
  if (!u) return NextResponse.json({ error: "الرابط غير صالح. اكتب رابط موقع عام مثل example.com" }, { status: 400 });
  const admin = createAdminClient();
  const { data: tool } = await admin.from("tools").select("is_enabled").eq("id", "site-video").maybeSingle();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  // a free step: a few a quarter of an hour, and only one waiting at a time
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", "site-video").gte("created_at", since);
  if ((count ?? 0) >= 8) return NextResponse.json({ error: "قرأنا مواقع كثيرة بوقت قصير. جرّب بعد شوي." }, { status: 429 });
  const { count: waiting } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", "site-video").in("status", ["queued", "running"]);
  if ((waiting ?? 0) >= 2) return NextResponse.json({ error: "عندك موقع قيد القراءة، انتظر لين يخلص." }, { status: 429 });
  const { data: job, error } = await admin.from("jobs").insert({ user_id: user.id, tool_id: "site-video", title: u.hostname.slice(0, 80), status: "queued", progress: 0, input: { kind: "capture", url: u.toString() } }).select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر بدء القراءة." }, { status: 500 });
  return NextResponse.json({ jobId: job.id });
}

/** Polled by the page: the state of the reading, and the result (text, sections, pictures) once done. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("job") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("id,status,progress,error,output,created_at").eq("id", id).eq("user_id", user.id).eq("tool_id", "site-video").maybeSingle();
  if (!job) return NextResponse.json({ error: "ما لقينا الطلب." }, { status: 404 });
  if (job.status === "failed") return NextResponse.json({ status: "failed", error: /blocked|empty/.test(job.error ?? "") ? "الموقع يمنع القراءة الآلية أو صفحته فاضية. جرّب رابط صفحة ثانية من الموقع." : /private|bad url|unknown host/.test(job.error ?? "") ? "ما قدرنا نوصل لهالرابط. تأكد إنه موقع عام يفتح عند الجميع." : "ما قدرنا نقرأ الموقع. جرّب مرة ثانية." });
  if (job.status !== "done") {
    if (Date.now() - new Date(job.created_at).getTime() > 4 * 60_000) return NextResponse.json({ status: "failed", error: "القراءة تأخرت. جرّب مرة ثانية." });
    return NextResponse.json({ status: job.status, progress: job.progress ?? 0 });
  }
  const site = siteFromOutput(job.output, user.id, job.id);
  if (!site) return NextResponse.json({ status: "failed", error: "ما قدرنا نقرأ الموقع. جرّب مرة ثانية." });
  const [mobile, desktop] = await signedResultUrls([site.mobile.path, site.desktop.path], 60 * 60 * 3);
  return NextResponse.json({ status: "done", site: { host: site.host, title: site.siteName || site.title, desc: site.desc, text: site.text.slice(0, 1200), sections: site.mobile.sections.map((s) => s.title).filter(Boolean), mobileUrl: mobile, desktopUrl: desktop, mobileW: site.mobile.w, mobileH: site.mobile.h } });
}
