import { NextResponse } from "next/server";
import { extraPricing } from "@/lib/server/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, adminAccess } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { getFreeEngine } from "@/lib/server/freeEngine";
import { FX_IDS } from "@/lib/fxStyles";
import { cleanEls } from "@/lib/htmlKit";
import { config } from "@/lib/tools/run";

export const maxDuration = 30;
const TOOL = "free-montage";
const clean = (v: unknown, n: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
/** what the customer reads when the worker stops a job (the feathers are already back) */
const WHY: Record<string, string> = {
  FX_NO_VIDEO: "ما قدرنا نقرأ الفيديو. ارفعه مرة ثانية بصيغة MP4.",
  FX_BAD_FILE: "الفيديو المرفوع صورته أقصر من صوته (غالباً انضغط غلط قبل الرفع)، فما كمّلنا عشان ما يطلع الصوت متأخر. ارفعه مرة ثانية.",
  FX_TOO_LONG: "الفيديو أطول من الحد المسموح حالياً.",
  FX_DURATION_MISMATCH: "مدة الفيديو أطول من اللي انحسب سعرها. ارفعه مرة ثانية.",
  FX_NO_SPEECH: "ما لقينا كلام واضح بالفيديو. المونتاج المبتكر يعتمد على كلام المتحدث.",
  FX_NO_PLAN: "ما قدرنا نطلع خطة مونتاج من هذا الفيديو. جرّب وصف أوضح.",
  FX_QUALITY: "الغرافيكس ما طلع بجودة كافية بعد محاولتين، فما سلّمناه.",
  FX_BG_FAILED: "ما قدرنا نغيّر الخلفية هالمرة، فما كمّلنا ورجعت لك ريشك. جرّب مرة ثانية أو بوصف ثاني للخلفية.",
  FX_CUT_FAILED: "خدمة قص المتحدث من الخلفية ما اشتغلت هالمرة، فما كمّلنا. جرّب مرة ثانية أو بدون خيار «ورا المتحدث».",
  FX_CUT_NOKEY: "خيار «ورا المتحدث» غير مفعّل بالنظام حالياً.",
  FX_NO_SOURCE: "ما لقينا المونتاج الأصلي.",
  FX_SOURCE_GONE: "الفيديو الأصلي انحذف بعد مدة الحفظ، فما نقدر نعيد تصديره. ارفعه بمونتاج جديد.",
  FX_EDIT_FAILED: "المصمم ما قدر يطبّق طلبك على هذا المقطع. جرّب صياغة أوضح.",
  FX_CANCELLED: "ألغيت الطلب.",
  WORKER_RESTARTED: "توقف التنفيذ بسبب تحديث بالنظام. ابدأ من جديد.",
};

/** «مونتاج مبتكر»: the customer's own video + his wishes become a job; the video worker listens, plans, writes the graphics layer and draws it over the video. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const admin = createAdminClient();
  const { data: tool } = await admin.from("tools").select("credit_cost,is_enabled").eq("id", TOOL).maybeSingle();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  // SECURITY: only a file of his own folder in the private uploads bucket (the worker checks again)
  const video = String(b.video ?? "");
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|mov|webm)$/i.test(video) || !video.startsWith(`${user.id}/`) || video.includes("..")) return NextResponse.json({ error: "ارفع الفيديو أولاً." }, { status: 400 });
  const secs = Math.ceil(Number(b.seconds));
  if (!Number.isFinite(secs) || secs < 5) return NextResponse.json({ error: "الفيديو قصير جداً (أقل من 5 ثواني)." }, { status: 400 });
  const eng = await getFreeEngine();
  const maxSeconds = eng.fxMaxMin * 60; // the admin's limit («إعدادات المحرك»)
  if (secs > maxSeconds) return NextResponse.json({ error: `الحد الأقصى حالياً ${eng.fxMaxMin} دقائق للفيديو.` }, { status: 400 });
  // one or two ready styles (merged into one look), and/or the customer's own description of the style
  const styles = [...new Set((Array.isArray(b.styles) ? b.styles : [b.style]).map((x) => String(x ?? "")).filter((x) => FX_IDS.includes(x)))].slice(0, 2);
  const styleDesc = clean(b.styleDesc, 600);
  if (!styles.length && styleDesc.length < 15) return NextResponse.json({ error: "اختر ستايل، أو اكتب وصف الستايل بتفصيل (جملة أو جملتين)." }, { status: 400 });
  const depth = b.depth === "2d" || b.depth === "2.5d" || b.depth === "3d" ? b.depth : "auto";
  const fx = styles[0] ?? "desc";
  const notes = clean(b.notes, 800);
  const blocked = await guardContent(user.id, `${notes} ${styleDesc}`, TOOL);
  if (blocked) return blocked;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: today } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", TOOL).is("input->>fromJob", null).gte("created_at", since);
  if ((today ?? 0) >= eng.dailyCap && !(await adminAccess())) return NextResponse.json({ error: "وصلت الحد اليومي لعدد المونتاجات، جرّب بكرة." }, { status: 429 });
  const { count: busy } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", TOOL).in("status", ["queued", "running"]);
  if ((busy ?? 0) >= 1) return NextResponse.json({ error: "عندك مونتاج قيد التنفيذ. انتظر يخلص ثم ابدأ الثاني." }, { status: 429 });
  let colors: string[] = [];
  if (b.useIdentity !== false) {
    const { data: kit } = await admin.from("brand_kits").select("colors").eq("user_id", user.id).maybeSingle();
    colors = ((kit?.colors ?? []) as unknown[]).map((c) => String(c ?? "")).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 4);
  }
  // «صور العميل»: up to 3 of his own pictures, each inside his own folder (the worker checks again and re-encodes them)
  const photos = (Array.isArray(b.photos) ? b.photos : []).slice(0, 3).flatMap((x) => {
    const o = (x ?? {}) as Record<string, unknown>, path = String(o.path ?? "");
    return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpe?g|webp)$/i.test(path) && path.startsWith(`${user.id}/`) && !path.includes("..") ? [{ path, note: clean(String(o.note ?? "").replace(/[<>`]/g, ""), 80) }] : [];
  });
  // «موسيقتك»: the customer's own sound file, inside his own folder (the worker checks again and re-encodes it)
  const mf = String(b.musicFile ?? "");
  const musicFile = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp3|m4a|wav|ogg|aac|flac|opus)$/i.test(mf) && mf.startsWith(`${user.id}/`) && !mf.includes("..") ? mf : "";
  const noteBlock = photos.map((x) => x.note).join(" ").trim();
  if (noteBlock) { const blockedN = await guardContent(user.id, noteBlock, TOOL); if (blockedN) return blockedN; }
  const behind = b.behind === true && eng.fxBehind; // «عناصر ورا المتحدث»: only when the admin offers it
  // «صور مولّدة»: only when the admin offers it; the model is the image tool's own (the admin's choice), never the customer's
  const aiImg = b.aiImages === true && eng.fxImages ? await config("image").catch(() => null) : null;
  const img = aiImg && (aiImg.provider === "google" || aiImg.provider === "fal") && aiImg.model ? { provider: aiImg.provider, model: aiImg.model } : null;
  // «غيّر خلفيتي»: needs the cut-out service and the image tool's model, so it is offered only when the admin offers both
  const bgText = clean(String(b.bg ?? "").replace(/[<>`]/g, ""), 200);
  const bgCfg = bgText.length >= 3 && eng.fxBehind && eng.fxImages ? (aiImg ?? await config("image").catch(() => null)) : null;
  const bgImg = bgCfg && (bgCfg.provider === "google" || bgCfg.provider === "fal") && bgCfg.model ? { provider: bgCfg.provider, model: bgCfg.model } : null;
  if (bgImg) { const blockedB = await guardContent(user.id, bgText, TOOL); if (blockedB) return blockedB; }
  const music = !musicFile && b.music === true && eng.fxMusic; // «موسيقى خلفية»: only when the admin offers it (it calls a paid music service)
  // v295: the AI pictures are priced like every AI picture (one price each). The worker draws round(seconds / 8) of them, 1 to 8 per video (see fxflow.mjs).
  const picCount = img ? Math.max(1, Math.min(8, Math.round(secs / 8))) : 0;
  const picsCost = picCount * (await extraPricing()).ai_image_cost;
  const cost = Math.max(1, Math.ceil((secs - 1) / 15)) * tool.credit_cost + Math.max(1, Math.ceil((secs - 1) / 60)) * ((behind || bgImg ? eng.fxBehindCost : 0) + (music ? eng.fxMusicCost : 0)) + picsCost;
  const input = { kind: "fx", mode: "new", video, seconds: secs, notes, fx, styles, depth, ...(styleDesc ? { styleDesc } : {}), captions: b.captions !== false, model: eng.model, maxSeconds, ...(eng.fxReview ? { review: true } : {}), ...(behind ? { behind: true } : {}), ...(img ? { img } : {}), ...(music ? { music: true } : {}), ...(bgImg ? { bg: bgText, bgImg } : {}), ...(musicFile ? { musicFile } : {}), ...(b.tight === true ? { tight: true } : {}), ...(b.sfx === false ? { sfx: false } : {}), ...(b.moves === false ? { moves: false } : {}), ...(photos.length ? { photos } : {}), ...(colors.length ? { colors } : {}) };
  const { data: job, error } = await admin.from("jobs").insert({ user_id: user.id, tool_id: TOOL, title: (notes || "مونتاج مبتكر").slice(0, 60), status: "queued", progress: 0, input }).select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر بدء المونتاج." }, { status: 500 });
  const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (payErr) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: "رصيدك ما يكفي." }, { status: 402 }); }
  return NextResponse.json({ jobId: job.id });
}

/** Polled by the page: the step and the progress while the montage is made, then the video. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("job") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("id,status,progress,error,input,output,title").eq("id", id).eq("user_id", user.id).eq("tool_id", TOOL).maybeSingle();
  if (!job) return NextResponse.json({ error: "ما لقينا الطلب." }, { status: 404 });
  if (job.status === "failed" && String(job.error ?? "").startsWith("FX_SYNC")) return NextResponse.json({ status: "failed", error: `وقّفنا المونتاج لأن طول الفيديو تغيّر أثناء التجهيز، وما نسلّم فيديو صوته مو مع صورته. صوّر هذي الرسالة وأرسلها للدعم: [${String(job.error).slice(0, 180)}]` });
  if (job.status === "failed" && String(job.error ?? "").startsWith("FX_CUT_FAILED")) {
    // the customer reads a plain sentence; the admin also sees which step failed and the service's own words
    const isAdmin = !!(await adminAccess());
    return NextResponse.json({ status: "failed", error: WHY.FX_CUT_FAILED + (isAdmin ? ` [للأدمن: ${String(job.error).slice(14, 240)}]` : "") });
  }
  if (job.status === "failed") { const code = String(job.error ?? ""); return NextResponse.json({ status: "failed", error: WHY[code] ?? (/scribe|quota|429/i.test(code) ? "خدمة تفريغ الصوت غير متاحة حالياً. جرّب بعد شوي." : "ما اكتمل المونتاج.") }); }
  if (job.status !== "done") return NextResponse.json({ status: job.status, progress: job.progress ?? 0, step: job.status === "running" ? String(job.title ?? "") : "" });
  const path = String((job.output as { files?: { path?: string }[] } | null)?.files?.[0]?.path ?? "");
  // SECURITY: only a result inside his own folder is ever signed
  if (!path.startsWith(`${user.id}/`) || path.includes("..")) return NextResponse.json({ status: "failed", error: "ما لقينا الفيديو." });
  const [play, dl] = await Promise.all([admin.storage.from("results").createSignedUrl(path, 60 * 60 * 6), admin.storage.from("results").createSignedUrl(path, 60 * 60 * 6, { download: "shaheen-montage.mp4" })]);
  const inp = (job.input ?? {}) as { aspect?: string; cseconds?: number; video?: string; captions?: boolean; colors?: string[]; fxr?: { missing?: number; note?: string; review?: { score?: number | null; summary?: string; issues?: number; redone?: number[] } | null; timings?: Record<string, number>; cues?: unknown[]; photos?: { id?: string; path?: string }[]; matte?: string | null; wordsPath?: string; pages?: { a?: number; b?: number; path?: string | null; els?: unknown }[]; pv?: string | null; voice?: string | null; music?: string | null; sfx?: unknown[]; gains?: { sfx?: number; music?: number } } };
  if (new URL(req.url).searchParams.get("studio") === "1") {
    // «استوديو المونتاج»: the saved pieces, the word times and the customer's own video. Every path is checked to sit inside his folder before it is read or signed.
    const mine = (p: unknown): p is string => typeof p === "string" && p.startsWith(`${user.id}/`) && !p.includes("..");
    const fr = inp.fxr;
    if (!fr || !Array.isArray(fr.pages) || !mine(inp.video)) return NextResponse.json({ error: "هذا المونتاج ما ينفتح بالاستوديو." }, { status: 400 });
    const read = async (p: unknown) => { if (!mine(p)) return ""; const r = await admin.storage.from("results").download(p); return r.error ? "" : await r.data.text(); };
    const [srcUrl, wordsTxt, pages, tl] = await Promise.all([
      // the studio plays the montage's own prepared copy when it has one (same cuts, zooms and sound as the result); the uploaded video otherwise
      mine(fr.pv) ? admin.storage.from("results").createSignedUrl(fr.pv, 60 * 60 * 3) : admin.storage.from("uploads").createSignedUrl(inp.video, 60 * 60 * 3),
      read(fr.wordsPath),
      Promise.all(fr.pages.slice(0, 12).map(async (p) => ({ a: Number(p.a) || 0, b: Number(p.b) || 0, html: await read(p.path), els: cleanEls(p.els) }))),
      admin.from("tools").select("edit_cost").eq("id", TOOL).maybeSingle(),
    ]);
    const photos: Record<string, string> = {};
    for (const ph of Array.isArray(fr.photos) ? fr.photos.slice(0, 12) : []) {
      if (!/^(p[1-3]|g[1-9])$/.test(String(ph?.id)) || !mine(ph?.path)) continue;
      const r = await admin.storage.from("results").download(ph.path);
      if (!r.error) photos[String(ph.id)] = `data:image/${ph.path.endsWith(".png") ? "png" : "jpeg"};base64,${Buffer.from(await r.data.arrayBuffer()).toString("base64")}`;
    }
    const matteUrl = mine(fr.matte) ? ((await admin.storage.from("results").createSignedUrl(fr.matte, 60 * 60 * 3)).data?.signedUrl ?? "") : "";
    let words: unknown = []; try { words = JSON.parse(wordsTxt || "[]"); } catch { words = []; }
    return NextResponse.json({ status: "studio", title: job.title, aspect: inp.aspect ?? "9:16", seconds: inp.cseconds ?? 0, srcUrl: srcUrl.data?.signedUrl ?? "", pages, words, photos, matteUrl, sound: mine(fr.voice) ? { sfx: Array.isArray(fr.sfx) && fr.sfx.length > 0, music: mine(fr.music), gSfx: Number(fr.gains?.sfx ?? 1), gMusic: Number(fr.gains?.music ?? 1) } : null, captions: inp.captions !== false, accent: (Array.isArray(inp.colors) && inp.colors[1]) || "#ffd400", editCost: tl.data?.edit_cost ?? 8 });
  }
  // for the admin only: how long each step took, and what the final screening said
  const adminView = (inp.fxr?.timings || inp.fxr?.review) && (await adminAccess()) ? { timings: inp.fxr?.timings ?? null, review: inp.fxr?.review ?? null } : null;
  return NextResponse.json({ status: "done", adminView, title: job.title, aspect: inp.aspect ?? "9:16", seconds: inp.cseconds ?? 0, cues: Array.isArray(inp.fxr?.cues) ? inp.fxr!.cues!.length : 0, missing: inp.fxr?.missing ?? 0, note: String(inp.fxr?.note ?? "").slice(0, 220), videoUrl: play.data?.signedUrl ?? "", downloadUrl: dl.data?.signedUrl ?? "" });
}

/** «استوديو المونتاج»: the edits become a NEW job (the montage it edits stays as it is). Drawing again with the customer's own edits is free (limited per day); a request in words for one piece costs the tool's edit price. */
export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const from = String(b.job ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(from)) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const admin = createAdminClient();
  const [{ data: tool }, { data: src }] = await Promise.all([
    admin.from("tools").select("edit_cost,is_enabled").eq("id", TOOL).maybeSingle(),
    admin.from("jobs").select("id,title,input").eq("id", from).eq("user_id", user.id).eq("tool_id", TOOL).eq("status", "done").maybeSingle(),
  ]);
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  const n = Array.isArray((src?.input as { fxr?: { pages?: unknown[] } } | null)?.fxr?.pages) ? (src!.input as { fxr: { pages: unknown[] } }).fxr.pages.length : 0;
  if (!src || !n) return NextResponse.json({ error: "ما لقينا المونتاج." }, { status: 404 });
  // only clean, bounded values travel to the worker (which cleans them again)
  const e = (b.edit && typeof b.edit === "object" ? b.edit : {}) as Record<string, unknown>;
  const chunks: Record<string, { texts: Record<string, string>; hex: Record<string, string>; els: ReturnType<typeof cleanEls> }> = {};
  for (const [k, v] of Object.entries(e.chunks && typeof e.chunks === "object" ? (e.chunks as Record<string, unknown>) : {})) {
    const i = Number(k); if (!Number.isInteger(i) || i < 0 || i >= n || !v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>, texts: Record<string, string> = {}, hex: Record<string, string> = {};
    for (const [tk, tv] of Object.entries(o.texts && typeof o.texts === "object" ? (o.texts as Record<string, unknown>) : {}).slice(0, 200)) if (/^t\d{1,3}$/.test(tk) && typeof tv === "string") texts[tk] = clean(tv.replace(/[<>`]/g, ""), 300);
    for (const [hk, hv] of Object.entries(o.hex && typeof o.hex === "object" ? (o.hex as Record<string, unknown>) : {}).slice(0, 12)) if (/^#[0-9a-f]{6}$/i.test(hk) && /^#[0-9a-f]{6}$/i.test(String(hv))) hex[hk] = String(hv);
    chunks[String(i)] = { texts, hex, els: cleanEls(o.els) };
  }
  const words: Record<string, string> = {};
  for (const [k, v] of Object.entries(e.words && typeof e.words === "object" ? (e.words as Record<string, unknown>) : {}).slice(0, 3000)) if (/^\d{1,5}$/.test(k) && typeof v === "string") words[k] = clean(v.replace(/[<>`]/g, ""), 40);
  const askRaw = (b.ask && typeof b.ask === "object" ? b.ask : null) as Record<string, unknown> | null;
  const askText = askRaw ? clean(askRaw.text, 600) : "";
  const askChunk = askRaw ? Number(askRaw.chunk) : -1;
  const ask = askText.length >= 4 && Number.isInteger(askChunk) && askChunk >= 0 && askChunk < n ? { chunk: askChunk, text: askText } : null;
  const blocked = await guardContent(user.id, `${askText} ${Object.values(chunks).flatMap((c) => Object.values(c.texts)).join(" ")} ${Object.values(words).join(" ")}`.slice(0, 6000), TOOL);
  if (blocked) return blocked;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: today } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", TOOL).not("input->>fromJob", "is", null).gte("created_at", since);
  if ((today ?? 0) >= 15) return NextResponse.json({ error: "وصلت الحد اليومي لعدد مرات التصدير من الاستوديو، جرّب بكرة." }, { status: 429 });
  const { count: busy } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", TOOL).in("status", ["queued", "running"]);
  if ((busy ?? 0) >= 1) return NextResponse.json({ error: "عندك مونتاج قيد التنفيذ. انتظر يخلص." }, { status: 429 });
  const sRaw = (e.sound && typeof e.sound === "object" ? e.sound : null) as Record<string, unknown> | null;
  const vol = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? Math.min(2, Math.max(0, Math.round(x * 100) / 100)) : 1; };
  const input = { kind: "fx", mode: "export", fromJob: from, edit: { chunks, words, captions: e.captions !== false, ...(sRaw ? { sound: { sfx: vol(sRaw.sfx), music: vol(sRaw.music) } } : {}) }, ...(ask ? { ask } : {}) };
  const { data: job, error } = await admin.from("jobs").insert({ user_id: user.id, tool_id: TOOL, title: String(src.title ?? "مونتاج مبتكر").slice(0, 60), status: "queued", progress: 0, input }).select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر بدء التصدير." }, { status: 500 });
  if (ask) {
    const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: tool.edit_cost ?? 8, p_job: job.id });
    if (payErr) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: "رصيدك ما يكفي." }, { status: 402 }); }
  }
  return NextResponse.json({ jobId: job.id });
}

/** «إلغاء الطلب»: the customer stops his own waiting or running montage. The feathers come back once (only the request that really changed the job refunds it); the worker sees it and stops. */
export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("job") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const admin = createAdminClient();
  const { data: changed } = await admin.from("jobs").update({ status: "failed", error: "FX_CANCELLED", updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).eq("tool_id", TOOL).in("status", ["queued", "running"]).select("id");
  if (!changed?.length) return NextResponse.json({ error: "الطلب خلص أو توقف قبل الإلغاء." }, { status: 409 });
  await admin.rpc("refund_job", { p_job: id });
  return NextResponse.json({ ok: true });
}
