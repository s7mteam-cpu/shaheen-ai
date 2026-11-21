import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { cleanColors, FREE_FONTS } from "@/lib/server/freeMotion";

export const maxDuration = 30;
const ASPECTS = ["4:5", "1:1", "9:16", "16:9"];
const DAILY = 40; // designs + edits per customer in 24 hours
const clean = (x: unknown, n: number) => String(x ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const TOOLS = ["free-post", "free-carousel"];
const uuid = (x: unknown) => (typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x) ? x : "");

/**
 * «بوست / كاروسيل مبتكر». POST starts a new design, or an edit «by words» of a finished one (a new job; the original stays).
 * Everything the worker reads (mode, paths, sizes) is written here by the server; the request only brings the idea and simple choices.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const admin = createAdminClient();
  const from = uuid(b.from);
  // an edit stays in the tool of the design it edits; a new design names its tool (post or carousel)
  let src: { id: string; title: string | null; tool_id: string; input: unknown } | null = null;
  if (from) {
    const r = await admin.from("jobs").select("id,title,tool_id,input").eq("id", from).eq("user_id", user.id).in("tool_id", TOOLS).eq("status", "done").maybeSingle();
    src = r.data;
    if (!src) return NextResponse.json({ error: "التصميم غير موجود." }, { status: 404 });
  }
  const toolId = src ? src.tool_id : b.tool === "free-carousel" ? "free-carousel" : "free-post";
  const { data: tool } = await admin.from("tools").select("credit_cost,edit_cost,is_enabled").eq("id", toolId).maybeSingle();
  if (!tool) return NextResponse.json({ error: "الأداة مو مضافة بعد (ملف SQL الخاص بالتحديث v235)." }, { status: 400 });
  if (!tool.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("tool_id", TOOLS).gte("created_at", since);
  if ((count ?? 0) >= DAILY) return NextResponse.json({ error: "وصلت الحد اليومي لهذي الأداة. جرّب بكرة." }, { status: 429 });
  const { count: busy } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("tool_id", TOOLS).in("status", ["queued", "running"]);
  if ((busy ?? 0) >= 2) return NextResponse.json({ error: "عندك تصميمين قيد التنفيذ. انتظر لين يخلصون." }, { status: 429 });

  let input: Record<string, unknown>, cost: number, title: string;
  if (src) {
    // edit by words: only the instruction comes from the request; the design, size and identity come from the customer's own finished job
    const hp = String((src.input as { post?: { htmlPath?: string } } | null)?.post?.htmlPath ?? "");
    if (!hp.startsWith(`${user.id}/`) || hp.includes("..")) return NextResponse.json({ error: "التصميم غير موجود." }, { status: 404 });
    const instruction = clean(b.instruction, 600);
    if (instruction.length < 3) return NextResponse.json({ error: "اكتب التعديل المطلوب." }, { status: 400 });
    { const bad = await guardContent(user.id, { instruction }, "free-post-edit"); if (bad) return bad; }
    input = { kind: "post", mode: "edit", fromJob: src.id, instruction };
    cost = Math.max(0, tool.edit_cost ?? 3);
    title = `تعديل: ${String(src.title ?? "تصميم مبتكر")}`.slice(0, 80);
  } else {
    const idea = clean(b.idea, 1500);
    if (idea.length < 10) return NextResponse.json({ error: "اكتب فكرتك بتفصيل أكثر (جملتين على الأقل)." }, { status: 400 });
    { const bad = await guardContent(user.id, { idea }, "free-post"); if (bad) return bad; }
    const aspect = ASPECTS.includes(String(b.aspect)) ? String(b.aspect) : "4:5";
    const slides = toolId === "free-carousel" ? Math.min(8, Math.max(3, Math.round(Number(b.slides)) || 5)) : 1;
    // the customer's own identity (colours, font, logo, name) is read by the server from his brand kit, never from the request
    const { data: kit } = b.useBrand === false ? { data: null } : await admin.from("brand_kits").select("business_name,colors,font,logo_url").eq("user_id", user.id).maybeSingle();
    const cols = ((kit?.colors ?? []) as unknown[]).map((c) => String(c ?? "")).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
    const logo = String(kit?.logo_url ?? "");
    input = {
      kind: "post", mode: "new", idea, aspect, slides,
      brand: { name: clean(kit?.business_name, 60) },
      colors: cols.length >= 2 ? cleanColors({ bg: cols[0], accent: cols[1], text: cols[2] ?? "#FFFFFF" }) : null,
      font: FREE_FONTS.includes(String(kit?.font)) ? String(kit?.font) : "Cairo",
      logoPath: b.useLogo !== false && logo.startsWith(`${user.id}/`) && !logo.includes("..") ? logo : null,
    };
    cost = Math.max(0, tool.credit_cost) * slides;
    title = idea.slice(0, 80);
  }

  const { data: job, error } = await admin.from("jobs").insert({ user_id: user.id, tool_id: toolId, title, status: "queued", progress: 0, input }).select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
  if (cost > 0) {
    const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
    if (payErr) {
      await admin.from("jobs").delete().eq("id", job.id);
      return NextResponse.json({ error: payErr.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 });
    }
  }
  return NextResponse.json({ jobId: job.id, cost });
}

/** Progress of one of the customer's own designs, and the pictures when it is ready. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const id = uuid(new URL(req.url).searchParams.get("job"));
  if (!id) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("id,tool_id,status,progress,input,output,title").eq("id", id).eq("user_id", user.id).in("tool_id", TOOLS).maybeSingle();
  if (!job) return NextResponse.json({ error: "ما لقينا الطلب." }, { status: 404 });
  if (job.status === "failed") return NextResponse.json({ status: "failed", error: "ما قدرنا نكمل هذا التصميم، ورجّعنا لك الريش. جرّب تكتب الفكرة بشكل أبسط." });
  if (job.status !== "done") return NextResponse.json({ status: job.status, progress: job.progress ?? 0 });
  const out = (job.output ?? {}) as { files?: { path: string }[]; expired?: boolean };
  if (out.expired) return NextResponse.json({ status: "expired" });
  const paths = (out.files ?? []).map((f) => String(f.path)).filter((p) => p.startsWith(`${user.id}/`) && !p.includes(".."));
  const [view, down] = await Promise.all([
    paths.length ? admin.storage.from("results").createSignedUrls(paths, 60 * 60 * 3) : Promise.resolve({ data: [] }),
    paths.length ? admin.storage.from("results").createSignedUrls(paths, 60 * 60 * 3, { download: true }) : Promise.resolve({ data: [] }),
  ]);
  const { data: tool } = await admin.from("tools").select("edit_cost").eq("id", job.tool_id).maybeSingle();
  const inp = (job.input ?? {}) as { aspect?: string; idea?: string };
  return NextResponse.json({
    status: "done", title: job.title, aspect: inp.aspect ?? "4:5", editCost: tool?.edit_cost ?? 3,
    images: paths.map((_, i) => ({ url: view.data?.[i]?.signedUrl ?? "", download: down.data?.[i]?.signedUrl ?? "" })).filter((x) => x.url),
  });
}
