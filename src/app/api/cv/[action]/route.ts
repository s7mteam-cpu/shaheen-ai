import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { claudeVisionJson } from "@/lib/providers/text";
import { saveResult } from "@/lib/providers/storage";
import { CV_STYLES, applyCVStyle, normaliseCV, blankCV, type CVSpec } from "@/cv/spec";
import { buildCVDocx } from "@/lib/server/cvdocx";

export const maxDuration = 120;
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const SYSTEM = (lang: string, target: string) => `أنت خبير موارد بشرية وكاتب سير ذاتية محترف في الخليج. حوّل مادة العميل إلى سيرة ذاتية احترافية مرتبة.
القواعد الصارمة:
- لا تخترع أبداً: لا شركات ولا وظائف ولا تواريخ ولا شهادات ولا جامعات ولا أرقام ولا إنجازات ولا مهارات غير مذكورة أو مفهومة بوضوح من كلام العميل. إذا ناقص شي اتركه فارغاً.
- حسّن الصياغة فقط: أفعال قوية، جمل قصيرة، 2-5 نقاط لكل وظيفة، بدون حشو. لا تضف أرقاماً (نسب، أعداد) ما ذكرها العميل.
- النبذة المهنية: جملتان إلى 3 جمل، مبنية على خبرته الفعلية${target ? `، وموجّهة للوظيفة المستهدفة: «${target}» (استخدم كلمات مفتاحية مناسبة لها من خبرته)` : ""}.
- الخبرات من الأحدث للأقدم. to = «الآن» (أو Present) للوظيفة الحالية.
- المهارات: 6 إلى 12 مهارة قصيرة مستخرجة من خبرته. اللغات بمستوى كما ذكر.
- details: بيانات شخصية اختيارية فقط إذا ذكرها (الجنسية، تاريخ الميلاد، الحالة الاجتماعية، رخصة القيادة).
- اللغة: ${lang === "en" ? "English" : "العربية الفصحى المبسّطة (الأسماء التقنية والشهادات تبقى بالإنجليزية)"}.
- اختر styleId من القائمة بما يناسب مجاله ومستواه (تنفيذي/مدير → exec أو classic، تقني/إبداعي → modern أو chips، أكاديمي → minimal أو classic، عام → side). القائمة: ${CV_STYLES.map((s) => `${s.id}=${s.template}/${s.name}`).join("، ")}.
أعد JSON فقط بالشكل: {"styleId":"c1","person":{"name","title","email","phone","city","linkedin","website"},"details":[{"label","value"}],"summary":"","experience":[{"role","company","place","from","to","bullets":[]}],"education":[{"degree","school","place","from","to","note"}],"skills":[],"languages":[{"name","level"}],"courses":[{"name","org","year"}],"extra":[{"title","items":[]}]}`;

async function readFileText(f: File): Promise<{ text: string; pdf?: string }> {
  const buf = Buffer.from(await f.arrayBuffer());
  const n = f.name.toLowerCase();
  if (n.endsWith(".pdf")) return { text: "", pdf: buf.toString("base64") };
  if (n.endsWith(".docx")) {
    const zip = await JSZip.loadAsync(buf);
    const xml = (await zip.files["word/document.xml"]?.async("string")) ?? "";
    return { text: xml.replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"') };
  }
  return { text: buf.toString("utf8") };
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const admin = createAdminClient();
  const mine = (p?: string) => typeof p === "string" && p.startsWith(`${user.id}/`) && !p.includes("..");
  const cleanSpec = (raw: unknown): CVSpec => { const s = normaliseCV(raw); return { ...s, photo: s.photo && mine(s.photo.path) ? s.photo : null }; };

  // ---------------- start: the AI builds the CV from what the customer wrote / uploaded ----------------
  if (action === "start") {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "الطلب غير صالح." }, { status: 400 });
    const info = String(form.get("info") ?? "").trim().slice(0, 12000);
    const target = String(form.get("target") ?? "").trim().slice(0, 120);
    const lang = form.get("lang") === "en" ? "en" : "ar";
    const photoPath = String(form.get("photo") ?? "");
    const file = form.get("file");
    const upload = file instanceof File && file.size > 0 ? file : null;
    if (info.length < 20 && !upload) return NextResponse.json({ error: "اكتب خبراتك ومعلوماتك، أو ارفع سيرتك القديمة." }, { status: 400 });
    if (upload && upload.size > 3_500_000) return NextResponse.json({ error: "الملف كبير (الحد 3.5 ميغابايت)." }, { status: 400 });
    { const bad = await guardContent(user.id, { info, target }, "cv"); if (bad) return bad; }
    const { data: tool } = await admin.from("tools").select("credit_cost,is_enabled").eq("id", "cv").single();
    if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
    const { data: job, error } = await admin.from("jobs").insert({ user_id: user.id, tool_id: "cv", title: (target || "سيرة ذاتية").slice(0, 80), status: "running", progress: 10, input: { lang } }).select("id").single();
    if (error || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
    const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: tool.credit_cost, p_job: job.id });
    if (payErr) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: payErr.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 }); }
    try {
      const doc = upload ? await readFileText(upload) : { text: "" };
      if (upload && !doc.text.trim() && !doc.pdf) throw new Error("unreadable file");
      const ask = `${info ? `معلومات العميل:\n${info}\n\n` : ""}${doc.text ? `سيرته القديمة (${upload?.name}):\n${doc.text.slice(0, 30000)}\n\n` : ""}${doc.pdf ? "سيرته القديمة مرفقة كملف PDF.\n\n" : ""}${target ? `الوظيفة المستهدفة: ${target}` : ""}`;
      const twice = async <T,>(f: () => Promise<T>) => { try { return await f(); } catch { return await f(); } };
      const out = await twice(() => claudeVisionJson<Record<string, unknown>>(SYSTEM(lang, target), ask, [], 8000, "claude-sonnet-5-5", doc.pdf ? [doc.pdf] : []));
      const style = CV_STYLES.find((x) => x.id === out.styleId) ?? CV_STYLES[0];
      let spec = applyCVStyle(normaliseCV({ ...out, lang }), style);
      if (mine(photoPath)) spec = { ...spec, photo: { path: photoPath, bucket: "uploads" }, showPhoto: true };
      else spec = { ...spec, showPhoto: false };
      if (!spec.person.name && !spec.experience.length) throw new Error("empty cv");
      await admin.from("jobs").update({ status: "draft", progress: 100, title: (spec.person.name || target || "سيرة ذاتية").slice(0, 80), input: { lang, target, spec }, updated_at: new Date().toISOString() }).eq("id", job.id);
      return NextResponse.json({ jobId: job.id });
    } catch (e) {
      console.error("cv start", e);
      await admin.from("jobs").update({ status: "failed", error: `cv: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500) }).eq("id", job.id);
      await admin.rpc("refund_job", { p_job: job.id });
      return NextResponse.json({ error: "ما قدرنا نجهّز السيرة الحين، ورجّعنا لك الريش. حاول مرة ثانية." }, { status: 502 });
    }
  }

  // ---------------- actions on the customer's own CV ----------------
  const body = ((await req.json().catch(() => null)) ?? {}) as { jobId?: string; spec?: unknown; pages?: number; kind?: string; text?: string };
  const { data: job } = await admin.from("jobs").select("id,user_id,tool_id,status,input").eq("id", String(body.jobId)).single();
  if (!job || job.user_id !== user.id || job.tool_id !== "cv") return NextResponse.json({ error: "السيرة غير موجودة." }, { status: 404 });
  if (job.status === "queued" || job.status === "running") return NextResponse.json({ error: "السيرة قيد التصدير، لحظات." }, { status: 409 });

  if (action === "save") {
    if (!body.spec) return NextResponse.json({ error: "ما فيه سيرة." }, { status: 400 });
    await admin.from("jobs").update({ input: { ...job.input, spec: cleanSpec(body.spec) }, updated_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "export") {
    if (!body.spec) return NextResponse.json({ error: "ما فيه سيرة." }, { status: 400 });
    const spec = cleanSpec(body.spec);
    const pages = Math.min(6, Math.max(1, Math.round(Number(body.pages)) || 1));
    await admin.from("jobs").update({ status: "queued", progress: 0, error: null, title: (spec.person.name || "سيرة ذاتية").slice(0, 80), input: { ...job.input, spec, pages, render: true, attempts: 0 }, updated_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "docx") {
    if (!body.spec) return NextResponse.json({ error: "ما فيه سيرة." }, { status: 400 });
    const spec = cleanSpec(body.spec);
    const buf = await buildCVDocx(spec);
    const path = await saveResult(user.id, job.id, buf, DOCX, "docx");
    const url = (await admin.storage.from("results").createSignedUrl(path, 60 * 60 * 6)).data?.signedUrl ?? "";
    return NextResponse.json({ url });
  }

  if (action === "polish") {
    const text = String(body.text ?? "").slice(0, 2000);
    if (text.length < 10) return NextResponse.json({ error: "اكتب النص أولاً." }, { status: 400 });
    { const bad = await guardContent(user.id, { text }, "cv/polish"); if (bad) return bad; }
    const { data: tool } = await admin.from("tools").select("edit_cost").eq("id", "cv").single();
    const cost = tool?.edit_cost ?? 2;
    const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
    if (payErr) return NextResponse.json({ error: payErr.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 });
    try {
      const spec = normaliseCV((job.input as { spec?: unknown }).spec);
      const sys = `أنت كاتب سير ذاتية محترف. أعد صياغة النص التالي ${body.kind === "bullets" ? "(نقاط إنجازات: كل سطر نقطة)" : "(نبذة مهنية)"} بشكل أقوى وأوضح وأقصر، بنفس اللغة (${spec.lang === "en" ? "English" : "العربية"}). لا تخترع أرقاماً أو معلومات غير موجودة. أعد JSON: {"text":"..."} ${body.kind === "bullets" ? "والنقاط مفصولة بأسطر جديدة" : ""}`;
      const r = await claudeVisionJson<{ text: string }>(sys, text, [], 1500, "claude-sonnet-5-5");
      return NextResponse.json({ text: String(r.text ?? "").slice(0, 1500) });
    } catch {
      await admin.rpc("grant_credits", { p_user: user.id, p_amount: cost, p_reason: "refund", p_ref: `cv-polish:${job.id}:${Date.now()}` }).then(() => null, () => null);
      return NextResponse.json({ error: "ما قدرنا نحسّن النص الحين، ورجّعنا لك الريش." }, { status: 502 });
    }
  }
  void blankCV;
  return NextResponse.json({ error: "طلب غير معروف." }, { status: 404 });
}
