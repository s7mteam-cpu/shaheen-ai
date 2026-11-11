import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { toolSpecs, validate, type Values } from "@/lib/tools/specs";
import { runJob } from "@/lib/tools/run";
import { failJob, finishJob } from "@/lib/server/jobs";
import { buildEditInput, type EditRequest } from "@/lib/tools/edit";

export const maxDuration = 300; // image tools wait for the provider

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as ({ tool?: string; input?: Values; title?: string; edit_of?: string } & EditRequest) | null;
  const admin = createAdminClient();

  // «تعديل»: a new job built from one of the user's finished jobs
  let parent: { id: string; tool_id: string; title: string | null; input: Values; output: { files?: { path: string; type: string }[] } | null } | null = null;
  if (body?.edit_of) {
    const { data } = await admin.from("jobs").select("id,tool_id,title,input,output,status,user_id").eq("id", body.edit_of).single();
    if (!data || data.user_id !== user.id || data.status !== "done") return NextResponse.json({ error: "ما نقدر نعدّل على هذا العمل." }, { status: 400 });
    parent = data;
  }
  const toolId = parent?.tool_id ?? body?.tool ?? "";
  let input = body?.input ?? {};
  if (parent) {
    const built = buildEditInput(parent, body ?? {});
    if ("error" in built) return NextResponse.json({ error: built.error }, { status: 400 });
    input = built.input;
  }
  if (toolId === "lesson-video") return NextResponse.json({ error: "استخدم نموذج الفيديو التعليمي." }, { status: 400 });
  if (toolId === "motion-video") return NextResponse.json({ error: "استخدم استوديو الموشن جرافيك." }, { status: 400 });
  if (["post", "carousel", "ad-design"].includes(toolId) && !parent) return NextResponse.json({ error: "استخدم استوديو التصميم." }, { status: 400 });
  const spec = toolSpecs[toolId];
  if (!spec) return NextResponse.json({ error: "أداة غير معروفة." }, { status: 400 });

  const { data: tool } = await admin.from("tools").select("id,name,credit_cost,edit_cost,is_enabled").eq("id", toolId).single();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });

  const invalid = parent ? null : validate(spec, input);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  if (toolId === "voice" && input.clone && !(Array.isArray(input.sample) && input.sample.length)) {
    return NextResponse.json({ error: "ارفع عينة صوتك." }, { status: 400 });
  }
  // Uploaded files must belong to this user
  for (const k of ["images", "video", "sample", "broll"]) {
    const list = Array.isArray(input[k]) ? (input[k] as string[]) : [];
    if (list.some((p) => !p.startsWith(`${user.id}/`))) return NextResponse.json({ error: "ملف غير مسموح." }, { status: 400 });
  }

  // Simple abuse guard: max 10 requests per minute
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= 10) return NextResponse.json({ error: "طلبات كثيرة، انتظر دقيقة." }, { status: 429 });

  const cost = parent ? Math.max(0, tool.edit_cost ?? 2) : Math.max(1, spec.units(input)) * tool.credit_cost;
  const title = (parent ? `تعديل: ${parent.title ?? tool.name}` : body?.title || String(input.prompt ?? input.product ?? input.text ?? input.script ?? tool.name)).slice(0, 80);

  const { data: job, error } = await admin.from("jobs")
    .insert({ user_id: user.id, tool_id: toolId, input, title, status: "queued", parent_job_id: parent?.id ?? null }).select("id,user_id,tool_id,input").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });

  const { data: balance, error: spendErr } = cost > 0
    ? await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id })
    : { data: null, error: null };
  if (spendErr) {
    await admin.from("jobs").delete().eq("id", job.id);
    const msg = spendErr.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي لهذا الطلب." : "تعذّر خصم الرصيد.";
    return NextResponse.json({ error: msg }, { status: 402 });
  }

  try {
    const files = await runJob(job);
    if (files) await finishJob(job.id, files);
  } catch (e) {
    console.error("job failed", job.id, e);
    await failJob(job.id, e instanceof Error ? e.message : String(e));
    return NextResponse.json({ id: job.id, status: "failed", error: "ما نجح الطلب، ورجّعنا لك الريش.", balance: Number(balance) + cost }, { status: 200 });
  }
  return NextResponse.json({ id: job.id, balance });
}
