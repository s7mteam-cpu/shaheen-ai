import { NextResponse } from "next/server";
import { cleanEls } from "@/lib/htmlKit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { FREE_FONTS, cleanColors, cleanContact } from "@/lib/server/freeMotion";
import { getFreeEngine } from "@/lib/server/freeEngine";
import { DIALECT_NAME, pickVoice, typeToGA, type VoiceItem } from "@/lib/voiceMatch";

export const maxDuration = 30;
const ASPECTS = ["9:16", "16:9", "1:1", "4:5"];
const FONTS = FREE_FONTS;

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
/** edit a finished Gemini video: same page with new texts / colours / font / logo, same voice + music. A new video in his history; the original stays. */
async function gemEdit(userId: string, b: Record<string, unknown>) {
  const from = typeof b.fromJob === "string" && /^[0-9a-f-]{36}$/i.test(b.fromJob) ? b.fromJob : "";
  const admin = createAdminClient();
  const { data: src } = from ? await admin.from("jobs").select("input").eq("id", from).eq("user_id", userId).eq("tool_id", "free-motion").eq("status", "done").maybeSingle() : { data: null };
  const sg = (src?.input as { engine?: string; gem?: { htmlPath?: string } } | null);
  if (sg?.engine !== "gemini" || !sg.gem?.htmlPath) return NextResponse.json({ error: "ما لقينا الفيديو الأصلي." }, { status: 404 });
  const texts: Record<string, string> = {};
  if (b.texts && typeof b.texts === "object") for (const [k, v] of Object.entries(b.texts as Record<string, unknown>).slice(0, 120)) if (/^t\d{1,3}$/.test(k) && typeof v === "string") texts[k] = v.replace(/\s+/g, " ").trim().slice(0, 300);
  const hex: Record<string, string> = {};
  if (b.hex && typeof b.hex === "object") for (const [k, v] of Object.entries(b.hex as Record<string, unknown>).slice(0, 12)) if (/^#[0-9a-f]{6}$/i.test(k) && typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)) hex[k] = v;
  const instruction = typeof b.instruction === "string" ? b.instruction.replace(/\s+/g, " ").trim().slice(0, 500) : "";
  const blocked = await guardContent(userId, `${Object.values(texts).join(" ")} ${instruction}`, "free-motion");
  if (blocked) return blocked;
  const font = FONTS.includes(String(b.font)) ? String(b.font) : undefined;
  const els = cleanEls(b.els);
  let logo: unknown = undefined; // undefined = keep, null = remove
  if (b.logo === null) logo = null;
  else if (b.logo && typeof b.logo === "object") {
    const l = b.logo as { path?: unknown; box?: { x?: unknown; y?: unknown; w?: unknown } };
    if (typeof l.path === "string" && l.path.startsWith(`${userId}/`) && !l.path.includes("..")) logo = { path: l.path, box: { x: num(l.box?.x, 0.85), y: num(l.box?.y, 0.09), w: num(l.box?.w, 0.18) } };
  }
  // voice edit: rewrite / translate / new dialect or voice (re-recorded and fitted to the same scenes), or the customer's own audio file
  let voiceEdit: Record<string, unknown> | undefined;
  let voiceIn: { id: string; model?: string; settings?: unknown } | undefined;
  let dialectIn: string | undefined;
  const vb = b.voiceEdit && typeof b.voiceEdit === "object" ? (b.voiceEdit as Record<string, unknown>) : null;
  if (vb?.mode === "own") {
    const pth = typeof vb.path === "string" ? vb.path : "";
    if (!pth.startsWith(`${userId}/`) || pth.includes("..")) return NextResponse.json({ error: "ملف الصوت غير صالح." }, { status: 400 });
    voiceEdit = { mode: "own", path: pth };
  } else if (vb?.mode === "regen") {
    const gs = (src!.input as { gem?: { scenes?: unknown[] | null } }).gem?.scenes;
    if (!Array.isArray(gs) || !gs.length) return NextResponse.json({ error: "هذا الفيديو قديم، تعديل الصوت يشتغل على الفيديوهات الجديدة." }, { status: 400 });
    const sentences = Array.isArray(vb.sentences) ? vb.sentences.slice(0, 20).map((x) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, 300)) : [];
    if (sentences.length !== gs.length || sentences.some((x) => x.length < 2)) return NextResponse.json({ error: "كل مشهد لازم يكون له جملة صوتية." }, { status: 400 });
    const bad = await guardContent(userId, sentences.join(" "), "free-motion");
    if (bad) return bad;
    const translateTo = typeof vb.translateTo === "string" && ["en", "fr", "es", "tr", "de", "it"].includes(vb.translateTo) ? vb.translateTo : undefined;
    if (typeof vb.dialect === "string" && vb.dialect in DIALECT_NAME) dialectIn = vb.dialect;
    const vt = typeof vb.vtype === "string" && vb.vtype !== "keep" ? vb.vtype : "";
    if (dialectIn || vt) {
      const { data: vc } = await admin.from("site_content").select("value").eq("key", "voices").maybeSingle();
      const voices = ((vc?.value as { items?: VoiceItem[] })?.items ?? []);
      const { gender, age } = typeToGA(vt || "auto");
      const v = pickVoice(voices, { dialect: dialectIn ?? String((src!.input as { dialect?: string }).dialect ?? "kuwaiti"), gender, age });
      if (v) voiceIn = { id: v.id, ...(v.model ? { model: v.model } : {}), ...(v.settings ? { settings: v.settings } : {}) };
    }
    voiceEdit = { mode: "regen", sentences, rewrite: vb.rewrite === true && !translateTo, ...(translateTo ? { translateTo } : {}) };
  }
  // the studio mixer: volumes, the customer's own sound (trim / place / fades) and the video cut
  let mix: Record<string, unknown> | undefined;
  if (b.mix && typeof b.mix === "object") {
    const m = b.mix as Record<string, unknown>;
    const n = (v: unknown, d: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) ? Number(v) : d));
    mix = { voiceVol: n(m.voiceVol, 1, 0, 1.5), musicVol: n(m.musicVol, 0.14, 0, 1) };
    const o = m.own && typeof m.own === "object" ? (m.own as Record<string, unknown>) : null;
    if (o && typeof o.path === "string" && o.path.startsWith(`${userId}/`) && !o.path.includes("..")) {
      mix.own = { path: o.path, name: String(o.name ?? "").slice(0, 60), dur: o.dur == null ? null : n(o.dur, 0, 0, 7200), start: n(o.start, 0, 0, 7200), end: o.end == null ? null : n(o.end, 0, 0, 7200), at: n(o.at, 0, 0, 600), volume: o.volume == null ? null : n(o.volume, 0.6, 0, 1), fadeIn: n(o.fadeIn, 0, 0, 5), fadeOut: n(o.fadeOut, 0, 0, 5) };
    }
    const t = m.trim && typeof m.trim === "object" ? (m.trim as Record<string, unknown>) : null;
    if (t) { const a = n(t.start, 0, 0, 600), z = n(t.end, 0, 0, 600); if (z - a >= 1) mix.trim = { start: a, end: z }; }
  }
  const { data: tool } = await admin.from("tools").select("edit_cost,is_enabled").eq("id", "free-motion").maybeSingle();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  const { count: waiting } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("tool_id", "free-motion").in("status", ["queued", "running"]);
  if ((waiting ?? 0) >= 2) return NextResponse.json({ error: "عندك تصميمين قيد التنفيذ، انتظر لين يخلصون." }, { status: 429 });
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: today } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("tool_id", "free-motion").gte("created_at", since).contains("input", { mode: "gemedit" });
  if ((today ?? 0) >= 12) return NextResponse.json({ error: "وصلت الحد اليومي للتعديلات، جرّب بكرة." }, { status: 429 });
  const input = { ...(src!.input as object), kind: "free", mode: "gemedit", engine: "gemini", fromJob: from, texts, hex, els, ...(font ? { font } : {}), ...(logo !== undefined ? { logo } : {}), ...(instruction ? { instruction } : {}), ...(voiceEdit ? { voiceEdit } : {}), ...(mix ? { mix } : {}), ...(voiceIn ? { voice: voiceIn } : {}), ...(dialectIn ? { dialect: dialectIn, dialectLabel: DIALECT_NAME[dialectIn] } : {}), musicOff: b.musicOff === true };
  const { data: job, error } = await admin.from("jobs").insert({ user_id: userId, tool_id: "free-motion", title: "تعديل تصميم مبتكر", status: "queued", progress: 0, input }).select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر بدء التعديل." }, { status: 500 });
  const { error: payErr } = await admin.rpc("spend_credits", { p_user: userId, p_amount: (tool.edit_cost ?? 8) * (1 + (instruction ? 1 : 0) + (voiceEdit?.mode === "regen" ? 1 : 0)), p_job: job.id });
  if (payErr) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: "رصيدك ما يكفي." }, { status: 402 }); }
  return NextResponse.json({ jobId: job.id });
}

/** «تصميم مبتكر»: the customer's idea becomes a job; the video worker asks the AI to write the design, checks it and renders it. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const b = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  if (b.mode === "gemedit") return gemEdit(user.id, b);
  const idea = String(b.idea ?? "").replace(/\s+/g, " ").trim().slice(0, 1500);
  if (idea.length < 10) return NextResponse.json({ error: "اكتب فكرتك بتفصيل أكثر (جملتين على الأقل)." }, { status: 400 });
  const blocked = await guardContent(user.id, idea, "free-motion");
  if (blocked) return blocked;
  const aspect = ASPECTS.includes(String(b.aspect)) ? String(b.aspect) : "9:16";
  const sec = Number(b.seconds);
  const seconds = Number.isInteger(sec) && sec >= 15 && sec <= 120 && sec % 15 === 0 ? sec : 15; // 15 s steps up to 2 minutes (the automatic length picks any step)
  const admin = createAdminClient();
  const { data: tool } = await admin.from("tools").select("credit_cost,edit_cost,is_enabled").eq("id", "free-motion").maybeSingle();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  const { count: waiting } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", "free-motion").in("status", ["queued", "running"]);
  if ((waiting ?? 0) >= 2) return NextResponse.json({ error: "عندك تصميمين قيد التنفيذ، انتظر لين يخلصون." }, { status: 429 });
  // "similar": the same design (its code is copied from the customer's own finished job), new words → cheaper
  let free: unknown = null;
  const from = typeof b.fromJob === "string" && /^[0-9a-f-]{36}$/i.test(b.fromJob) ? b.fromJob : "";
  if (from) {
    const { data: src } = await admin.from("jobs").select("input").eq("id", from).eq("user_id", user.id).eq("tool_id", "free-motion").eq("status", "done").maybeSingle();
    const f = (src?.input as { free?: { code?: string; title?: string; fields?: unknown[] } } | null)?.free;
    if (!f?.code) return NextResponse.json({ error: "ما لقينا التصميم الأصلي." }, { status: 404 });
    free = f;
  }
  // the narrator: the best registered voice for the dialect / gender / age the customer asked for
  const wantVoice = b.voiceover !== false;
  let voice: { id: string; model?: string; settings?: unknown } | null = null;
  const dialect = typeof b.dialect === "string" && b.dialect in DIALECT_NAME ? b.dialect : "kuwaiti";
  if (wantVoice) {
    const { data: vc } = await admin.from("site_content").select("value").eq("key", "voices").maybeSingle();
    const voices = ((vc?.value as { items?: VoiceItem[] })?.items ?? []);
    const { gender, age } = typeToGA(String(b.vtype ?? "auto"));
    const v = voices.some((x) => x.id === b.voice) ? voices.find((x) => x.id === b.voice) : pickVoice(voices, { dialect, gender, age });
    if (v) voice = { id: v.id, ...(v.model ? { model: v.model } : {}), ...(v.settings ? { settings: v.settings } : {}) };
  }
  // the admin's switch: new designs may run on the Gemini engine (similar/edit requests of old designs stay classic)
  const eng = from ? null : await getFreeEngine();
  const useGem = eng?.engine === "gemini";
  if (useGem) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: today } = await admin.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("tool_id", "free-motion").gte("created_at", since).contains("input", { engine: "gemini" });
    if ((today ?? 0) >= eng!.dailyCap) return NextResponse.json({ error: "وصلت الحد اليومي لعدد التصاميم، جرّب بكرة." }, { status: 429 });
  }
  const cost = from ? tool.edit_cost ?? 8 : Math.max(1, Math.round(seconds / 15)) * tool.credit_cost;
  const input = { kind: "free", mode: from ? "similar" : "new", voiceover: !!voice, voice, dialect, dialectLabel: DIALECT_NAME[dialect], music: b.music !== false, idea, aspect, seconds, brand: { name: String(b.brand ?? "").slice(0, 60) }, colors: cleanColors(b.colors), ...(b.useIdentity === false && !from ? { autoStyle: true } : {}), font: FONTS.includes(String(b.font)) ? String(b.font) : "Cairo", contact: cleanContact(b.contact), ...(useGem ? { engine: "gemini", model: eng!.model, plan: eng!.plan } : {}), ...(free ? { free } : {}), ...(typeof b.logoPath === "string" && b.logoPath.startsWith(`${user.id}/`) && !b.logoPath.includes("..") ? { logoPath: b.logoPath } : {}) };
  const { data: job, error } = await admin.from("jobs").insert({ user_id: user.id, tool_id: "free-motion", title: idea.slice(0, 60), status: "queued", progress: 0, input }).select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر بدء التصميم." }, { status: 500 });
  const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (payErr) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: "رصيدك ما يكفي." }, { status: 402 }); }
  return NextResponse.json({ jobId: job.id });
}

/** Polled by the page: progress while the design is made, then everything the live studio needs. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("job") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  const admin = createAdminClient();
  const { data: job } = await admin.from("jobs").select("id,status,progress,error,input,output,title,created_at").eq("id", id).eq("user_id", user.id).eq("tool_id", "free-motion").maybeSingle();
  if (!job) return NextResponse.json({ error: "ما لقينا الطلب." }, { status: 404 });
  if (job.status === "failed") return NextResponse.json({ status: "failed", error: "ما قدرنا نكمل هذا التصميم. تم إرجاع ريشك، جرّب فكرة أبسط أو القوالب الجاهزة.", reason: String(job.error ?? "").replace(/sk-[\w-]+|eyJ[\w.-]+/g, "").slice(0, 220) }); // the technical reason is shown while the tool is experimental
  const inp = (job.input ?? {}) as { mode?: string; voiceover?: boolean; free?: { assets?: unknown; fields?: unknown[]; title?: string; vo?: { sentences?: string[]; beats?: unknown[]; path?: string; musicPath?: string } }; colors?: unknown; font?: string; contact?: unknown; aspect?: string; cseconds?: number; seconds?: number; idea?: string; editError?: string; brand?: { name?: string }; music?: boolean; musicVol?: number; dialect?: string; logoPath?: string; logoOn?: boolean; logoBox?: { x: number; y: number; w: number }; unlocked?: boolean };
  const out = (job.output ?? {}) as { files?: { path: string }[]; thumb?: string; preview?: string };
  if ((inp as { engine?: string }).engine === "gemini") { // the Gemini engine delivers a finished video (no live studio yet)
    if (job.status !== "done") return NextResponse.json({ status: job.status, progress: job.progress ?? 0, engine: "gemini" });
    const vp = out.files?.[0]?.path ?? "";
    if (!vp.startsWith(`${user.id}/`) || vp.includes("..")) return NextResponse.json({ status: "failed", error: "ما لقينا الفيديو." });
    const play = (await admin.storage.from("results").createSignedUrl(vp, 60 * 60 * 3)).data?.signedUrl ?? "";
    const dl = (await admin.storage.from("results").createSignedUrl(vp, 60 * 60 * 3, { download: `shaheen-${id.slice(0, 6)}.mp4` })).data?.signedUrl ?? "";
    const gm = ((inp as { gem?: { mix?: Record<string, unknown> & { own?: { path?: string } | null }; musicPath?: string | null; scenes?: { text?: string }[] | null; htmlPath?: string; voicePath?: string | null; logo?: { path?: string; box?: unknown } | null; musicOff?: boolean } }).gem ?? {});
    const okp = (x?: string | null) => (x && x.startsWith(`${user.id}/`) && !x.includes("..") ? x : "");
    const htmlUrl = okp(gm.htmlPath) ? (await admin.storage.from("results").createSignedUrl(gm.htmlPath!, 60 * 60 * 3)).data?.signedUrl ?? "" : "";
    const lp = okp(gm.logo?.path);
    const logoUrl = lp ? (await admin.storage.from("uploads").createSignedUrl(lp, 60 * 60 * 3)).data?.signedUrl ?? "" : "";
    const vpu = okp(gm.voicePath) ? (await admin.storage.from("results").createSignedUrl(gm.voicePath!, 60 * 60 * 3)).data?.signedUrl ?? "" : "";
    const mpu = okp(gm.musicPath) ? (await admin.storage.from("results").createSignedUrl(gm.musicPath!, 60 * 60 * 3)).data?.signedUrl ?? "" : "";
    const sm = gm.mix ?? {};
    const op = okp(sm.own?.path);
    const ownUrl = op ? (await admin.storage.from("uploads").createSignedUrl(op, 60 * 60 * 3)).data?.signedUrl ?? "" : "";
    const { data: tl } = await admin.from("tools").select("edit_cost").eq("id", "free-motion").maybeSingle();
    return NextResponse.json({ status: "gemini", seconds: inp.cseconds ?? inp.seconds ?? 30, voiceUrl: vpu, musicUrl: mpu, mix: { ...sm, own: op ? { ...(sm.own as object), url: ownUrl } : null }, title: job.title, aspect: inp.aspect ?? "9:16", videoUrl: play, downloadUrl: dl, htmlUrl, hasVoice: !!okp(gm.voicePath), scenes: Array.isArray(gm.scenes) ? gm.scenes.map((x) => String(x?.text ?? "")) : null, dialect: (inp as { dialect?: string }).dialect ?? "kuwaiti", musicOff: gm.musicOff === true, editCost: tl?.edit_cost ?? 8, logo: logoUrl ? { path: lp, url: logoUrl, box: gm.logo?.box ?? { x: 0.85, y: 0.09, w: 0.18 } } : null });
  }
  if (!out.preview) return NextResponse.json({ status: job.status, progress: job.progress ?? 0 });
  const own = (x?: string) => (x && x.startsWith(`${user.id}/`) && !x.includes("..") ? x : "");
  const paths = [own(out.preview), own(inp.free?.vo?.path), own(inp.free?.vo?.musicPath), own(out.files?.[0]?.path)].filter(Boolean);
  const signed = paths.length ? (await admin.storage.from("results").createSignedUrls(paths, 60 * 60 * 3)).data ?? [] : [];
  const urlOf = (p?: string) => (p ? signed.find((x) => x.path === p)?.signedUrl ?? "" : "");
  const logo = own(inp.logoPath) ? (await admin.storage.from("uploads").createSignedUrl(inp.logoPath!, 60 * 60 * 3)).data?.signedUrl ?? "" : "";
  const ownA = (inp as { ownAudio?: { path?: string } | null }).ownAudio;
  const ownAudio = ownA && own(ownA.path) ? { ...ownA, url: (await admin.storage.from("uploads").createSignedUrl(ownA.path!, 60 * 60 * 3)).data?.signedUrl ?? "" } : null;
  const busy = job.status !== "done" ? { kind: inp.mode === "export" ? "export" : "revoice", progress: job.progress ?? 0 } : null;
  return NextResponse.json({
    status: "studio", busy, title: job.title, aspect: inp.aspect ?? "9:16", cseconds: inp.cseconds ?? inp.seconds ?? 15, idea: inp.idea ?? "", brand: inp.brand?.name ?? "",
    voiceover: !!inp.voiceover, narration: inp.free?.vo?.sentences ?? [], beats: inp.free?.vo?.beats ?? [], dialect: inp.dialect ?? "kuwaiti",
    fields: Array.isArray(inp.free?.fields) ? inp.free!.fields : [], colors: cleanColors(inp.colors), font: FONTS.includes(String(inp.font)) ? inp.font : "Cairo", contact: cleanContact(inp.contact),
    logoOn: inp.logoOn !== false, logoBox: inp.logoBox ?? { x: 0.85, y: 0.09, w: 0.18 }, logoPath: own(inp.logoPath),
    musicOn: inp.music !== false, musicVol: typeof inp.musicVol === "number" ? inp.musicVol : 0.14,
    locked: !!own(out.files?.[0]?.path) && !inp.unlocked,
    previewUrl: urlOf(own(out.preview)), voiceUrl: urlOf(own(inp.free?.vo?.path)), musicUrl: urlOf(own(inp.free?.vo?.musicPath)), exportUrl: urlOf(own(out.files?.[0]?.path)), logo,
    assets: inp.free?.assets ?? {}, trim: (inp as { trim?: { start: number; end: number } }).trim ?? null, ownAudio,
    editError: inp.editError ? "تعذّر تطبيق العملية الأخيرة، وبقي تصميمك كما هو." : "",
  });
}
