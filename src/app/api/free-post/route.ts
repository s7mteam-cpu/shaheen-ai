import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { cleanColors, FREE_FONTS } from "@/lib/server/freeMotion";
import { cleanEls } from "@/lib/htmlKit";

export const maxDuration = 30;
const ASPECTS = ["4:5", "1:1", "9:16", "16:9"];
const DAILY = 40; // designs + edits per customer in 24 hours
const clean = (x: unknown, n: number) => String(x ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const TOOLS = ["free-post", "free-carousel", "free-ad", "free-invite", "free-card", "free-deck", "free-cv"];
const MAX_SAVES = 40; // free studio saves per design
const num = (v: unknown, d: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Number(v) : d));
type Edits = { texts: Record<string, string>; hex: Record<string, string>; font?: string; els: ReturnType<typeof cleanEls>; logo: { on: boolean; path?: string; box: { x: number; y: number; w: number } } | null };

/** What the studio may change: text pieces by their key, #rrggbb colours, a font of the library, strict element moves, and the customer's own logo. Never code, never a path outside his folder. */
function cleanEdits(raw: unknown, userId: string): Edits {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const texts: Record<string, string> = {};
  for (const [k, v] of Object.entries((o.texts && typeof o.texts === "object" ? o.texts : {}) as Record<string, unknown>).slice(0, 220)) if (/^t\d{1,3}$/.test(k) && typeof v === "string") texts[k] = v.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 300);
  const hex: Record<string, string> = {};
  for (const [k, v] of Object.entries((o.hex && typeof o.hex === "object" ? o.hex : {}) as Record<string, unknown>).slice(0, 16)) if (/^#[0-9a-f]{6}$/i.test(k) && typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) hex[k.toLowerCase()] = v.toLowerCase();
  const lg = (o.logo && typeof o.logo === "object" ? o.logo : null) as Record<string, unknown> | null;
  const bx = (lg?.box && typeof lg.box === "object" ? lg.box : {}) as Record<string, unknown>;
  const path = typeof lg?.path === "string" && lg.path.startsWith(`${userId}/`) && !lg.path.includes("..") && lg.path.length < 300 ? lg.path : undefined;
  return {
    texts, hex, els: cleanEls(o.els),
    ...(FREE_FONTS.includes(String(o.font)) ? { font: String(o.font) } : {}),
    logo: lg ? { on: lg.on !== false && !!path, ...(path ? { path } : {}), box: { x: num(bx.x, 0.14, 0.03, 0.97), y: num(bx.y, 0.09, 0.03, 0.97), w: num(bx.w, 0.18, 0.06, 0.7) } } : null,
  };
}
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
  // ---- studio save (free): the same design drawn again with the customer's own edits. No AI, nothing charged. ----
  if (src && b.apply !== undefined) {
    const inp = (src.input ?? {}) as Record<string, unknown> & { post?: { htmlPath?: string }; saves?: number; edits?: unknown };
    const hp = String(inp.post?.htmlPath ?? "");
    if (!hp.startsWith(`${user.id}/`) || hp.includes("..")) return NextResponse.json({ error: "التصميم غير موجود." }, { status: 404 });
    if ((Number(inp.saves) || 0) >= MAX_SAVES) return NextResponse.json({ error: "وصلت حد الحفظ لهذا التصميم. سوِّ تصميم جديد أو عدّل بالكلام." }, { status: 429 });
    const edits = cleanEdits(b.apply, user.id);
    { const bad = await guardContent(user.id, { text: Object.values(edits.texts).join(" ") }, "free-post-studio"); if (bad) return bad; }
    // claimed only while it is «done», so two saves at the same moment cannot both start
    const { data: won } = await admin.from("jobs").update({ status: "queued", progress: 0, error: null, input: { ...inp, mode: "restyle", edits, prevEdits: inp.edits ?? null, saves: (Number(inp.saves) || 0) + 1 }, updated_at: new Date().toISOString() }).eq("id", src.id).eq("user_id", user.id).eq("status", "done").select("id");
    if (!won?.length) return NextResponse.json({ error: "التصميم قيد الرسم، لحظات." }, { status: 409 });
    return NextResponse.json({ jobId: src.id, cost: 0 });
  }
  const toolId = src ? src.tool_id : TOOLS.includes(String(b.tool)) ? String(b.tool) : "free-post";
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
    const idea = clean(b.idea, toolId === "free-cv" || toolId === "free-deck" ? 4000 : 1500);
    if (idea.length < 10) return NextResponse.json({ error: "اكتب فكرتك بتفصيل أكثر (جملتين على الأقل)." }, { status: 400 });
    { const bad = await guardContent(user.id, { idea }, "free-post"); if (bad) return bad; }
    const card = toolId === "free-card"; // a business card: fixed print size, two sides (front + back), one price
    const deck = toolId === "free-deck", cvTool = toolId === "free-cv"; // a presentation: wide slides, 4 to 8. A CV: one A4 page.
    const aspect = card ? "card" : deck ? "16:9" : cvTool ? "a4" : ASPECTS.includes(String(b.aspect)) ? String(b.aspect) : "4:5";
    const slides = card ? 2 : deck ? Math.min(8, Math.max(4, Math.round(Number(b.slides)) || 6)) : cvTool ? 1 : toolId === "free-carousel" ? Math.min(8, Math.max(3, Math.round(Number(b.slides)) || 5)) : 1;
    // the customer's own identity (colours, font, logo, name) is read by the server from his brand kit, never from the request
    const { data: kit } = b.useBrand === false || toolId === "free-invite" || toolId === "free-cv" ? { data: null } // an invitation is personal: the business identity stays out of it
      : await admin.from("brand_kits").select("business_name,colors,font,logo_url").eq("user_id", user.id).maybeSingle();
    const cols = ((kit?.colors ?? []) as unknown[]).map((c) => String(c ?? "")).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
    const logo = String(kit?.logo_url ?? "");
    input = {
      kind: "post", mode: "new", idea, aspect, slides,
      brand: { name: clean(kit?.business_name, 60) },
      colors: cols.length >= 2 ? cleanColors({ bg: cols[0], accent: cols[1], text: cols[2] ?? "#FFFFFF" }) : null,
      font: FREE_FONTS.includes(String(kit?.font)) ? String(kit?.font) : "Cairo",
      logoPath: b.useLogo !== false && logo.startsWith(`${user.id}/`) && !logo.includes("..") ? logo : null,
    };
    cost = Math.max(0, tool.credit_cost) * (card ? 1 : slides);
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
  const out = (job.output ?? {}) as { files?: { path: string; type?: string }[]; expired?: boolean };
  if (out.expired) return NextResponse.json({ status: "expired" });
  const okPath = (p: string) => p.startsWith(`${user.id}/`) && !p.includes("..");
  const paths = (out.files ?? []).filter((f) => f.type !== "application/pdf").map((f) => String(f.path)).filter(okPath);
  const pdfPath = (out.files ?? []).filter((f) => f.type === "application/pdf").map((f) => String(f.path)).filter(okPath)[0];
  const pdfUrl = pdfPath ? (await admin.storage.from("results").createSignedUrl(pdfPath, 60 * 60 * 3, { download: true })).data?.signedUrl ?? "" : "";
  const [view, down] = await Promise.all([
    paths.length ? admin.storage.from("results").createSignedUrls(paths, 60 * 60 * 3) : Promise.resolve({ data: [] }),
    paths.length ? admin.storage.from("results").createSignedUrls(paths, 60 * 60 * 3, { download: true }) : Promise.resolve({ data: [] }),
  ]);
  const { data: tool } = await admin.from("tools").select("edit_cost").eq("id", job.tool_id).maybeSingle();
  const inp = (job.input ?? {}) as { aspect?: string; idea?: string; slides?: number; logoPath?: string | null; saves?: number; post?: { htmlPath?: string }; edits?: Edits | null };
  const mine = (p?: string | null) => !!p && p.startsWith(`${user.id}/`) && !p.includes("..");
  const htmlUrl = mine(inp.post?.htmlPath) ? (await admin.storage.from("results").createSignedUrl(inp.post!.htmlPath!, 60 * 60 * 3)).data?.signedUrl ?? "" : "";
  // the logo the design shows now: the studio's choice if there is one, otherwise the brand-kit logo it was made with
  const ed = inp.edits ?? null;
  const lp = ed?.logo ? (ed.logo.on && mine(ed.logo.path) ? ed.logo.path! : "") : mine(inp.logoPath) ? inp.logoPath! : "";
  const logoUrl = lp ? (await admin.storage.from("uploads").createSignedUrl(lp, 60 * 60 * 3)).data?.signedUrl ?? "" : "";
  return NextResponse.json({
    status: "done", title: job.title, aspect: inp.aspect ?? "4:5", editCost: tool?.edit_cost ?? 3,
    slides: Math.min(8, Math.max(1, Math.round(Number(inp.slides) || 1))), htmlUrl, pdfUrl, savesLeft: Math.max(0, MAX_SAVES - (Number(inp.saves) || 0)),
    edits: ed ? { texts: ed.texts ?? {}, hex: ed.hex ?? {}, font: ed.font ?? null, els: ed.els ?? [] } : null,
    logo: lp && logoUrl ? { path: lp, url: logoUrl, box: ed?.logo?.box ?? { x: 0.14, y: 0.09, w: 0.18 } } : null,
    images: paths.map((_, i) => ({ url: view.data?.[i]?.signedUrl ?? "", download: down.data?.[i]?.signedUrl ?? "" })).filter((x) => x.url),
  });
}
