import { toolOffMessage } from "@/lib/toolPause";
import { extraPricing } from "@/lib/server/pricing";
import { teamBriefFor } from "@/lib/server/teamBrief";
import { setUsageCtx } from "@/lib/server/usageCtx";
import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { claudeVisionJson } from "@/lib/providers/text";
import { saveResult } from "@/lib/providers/storage";
import { illustrate } from "@/lib/server/illustrate";
import { failJob, finishJob } from "@/lib/server/jobs";
import { buildDeck, type Deck, type Slide } from "@/lib/server/deck";

export const maxDuration = 300;

const MAX_SLIDES = 200;
const BIG = 25; // above this the deck is written in parts (outline first, then batches)
const BATCH = 12;
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : null);

const SYSTEM = (n: number, lang: string, pics: boolean, auto = false) => `أنت مصمّم عروض تقديمية محترف وكاتب محتوى. اكتب عرض PowerPoint كامل جاهز للتقديم من مادة العميل.
القواعد:
- ${auto ? "اختر أنت العدد المناسب للمادة: بين 8 و20 شريحة" : `عدد الشرائح بالضبط ${n}`}. الشريحة الأولى kind=title والأخيرة kind=closing (شكر/خلاصة/تواصل).
- اللغة: ${lang === "en" ? "English" : "العربية الفصحى المبسّطة الواضحة (إلا إذا طلب العميل لهجة)"}.
- إذا العميل كتب نصاً جاهزاً أو ملفاً، التزم بمعلوماته وأرقامه وأسمائه ولا تخترع حقائق أو أرقاماً غير موجودة في مادته. إذا ما أعطاك إلا فكرة قصيرة، اكتب المحتوى بمعرفتك العامة وتجنّب الأرقام المحددة التي لا تتأكد منها (استخدم صياغة عامة).
- نص الشريحة مختصر: عنوان من 2-8 كلمات، وكل نقطة لا تزيد عن 14 كلمة، وبحد أقصى 6 نقاط. لا تكرر نفس الصياغة.
- نوّع أنواع الشرائح (kind): title, section, bullets, twocol, stats, steps, quote, closing.
  bullets: {title, subtitle?, bullets[]} · twocol: {title, left:{title,bullets[]}, right:{title,bullets[]}} · stats: {title, stats:[{value,label}] (2-4)} · steps: {title, steps:[{t,d}] (3-5)} · quote: {quote, by?} · section: {title, subtitle?} · title/closing: {title, subtitle?}.
- لا تستخدم stats إلا إذا في أرقام حقيقية بمادة العميل. 
- لكل شريحة notes: ملاحظات المتحدث (2-3 جمل يقولها المقدّم).
${pics ? '- لأهم 3 إلى 4 شرائح (title وشرائح bullets) أضف img: وصف إنجليزي لصورة واقعية احترافية مناسبة بدون أي كتابة داخلها.' : "- لا تضف img."}
- اختر لونين متناسقين مناسبين للموضوع: primary (غامق للخلفيات والعناوين) و accent (لون مميز دافئ).
الشكل: {"title":"...","primary":"#RRGGBB","accent":"#RRGGBB","slides":[...]}`;

const OUTLINE = (n: number, lang: string) => `أنت مخطّط عروض تقديمية محترف. ضع هيكل عرض PowerPoint من ${n} شريحة بالضبط من مادة العميل، يغطي المادة كلها بتسلسل منطقي (مقدمة، أقسام رئيسية بينها شرائح section، شرائح المحتوى، خاتمة).
- اللغة: ${lang === "en" ? "English" : "العربية الفصحى المبسّطة"}.
- الشريحة الأولى title والأخيرة closing. الأنواع: title, section, bullets, twocol, stats, steps, quote, closing. لا تستخدم stats إلا لو في أرقام بمادة العميل.
- عنوان كل شريحة 2-8 كلمات.
- اختر لونين مناسبين: primary غامق و accent دافئ.
الشكل: {"title":"...","primary":"#RRGGBB","accent":"#RRGGBB","outline":[{"kind":"...","title":"..."}]} وبعدد ${n} عنصراً بالضبط.`;

const BATCHSYS = (lang: string) => `أنت كاتب شرائح عروض تقديمية. لك هيكل عرض كامل، واكتب محتوى الشرائح المطلوبة فقط (من رقم إلى رقم).
- اللغة: ${lang === "en" ? "English" : "العربية الفصحى المبسّطة"}. التزم بمعلومات مادة العميل ولا تخترع أرقاماً أو حقائق غير موجودة فيها.
- كل شريحة تحافظ على نوعها (kind) وعنوانها (title) من الهيكل. نص مختصر: كل نقطة لا تزيد عن 14 كلمة وبحد أقصى 6 نقاط، ولا تكرر محتوى شرائح أخرى.
- الشكل لكل نوع: bullets: {bullets[]} · twocol: {left:{title,bullets[]}, right:{title,bullets[]}} · stats: {stats:[{value,label}]} · steps: {steps:[{t,d}] 3-5} · quote: {quote, by?} · section/title/closing: {subtitle?}.
- لكل شريحة notes: ملاحظات المتحدث (جملتان).
الشكل: {"slides":[{"kind","title",...}]} بنفس ترتيب الأرقام المطلوبة.`;

async function readFile(f: File): Promise<{ text: string; pdf?: string }> {
  const buf = Buffer.from(await f.arrayBuffer());
  const n = f.name.toLowerCase();
  if (n.endsWith(".pdf")) return { text: "", pdf: buf.toString("base64") };
  if (n.endsWith(".docx") || n.endsWith(".pptx")) {
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).filter((k) => (n.endsWith(".docx") ? k === "word/document.xml" : /^ppt\/slides\/slide\d+\.xml$/.test(k))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const parts: string[] = [];
    let total = 0;
    for (const k of names.slice(0, 400)) {
      // a tiny zip can unpack to gigabytes: stop reading once the text passes 40 MB
      const xml = await new Promise<string>((ok, no) => {
        const chunks: Buffer[] = []; let n = 0;
        const st = zip.files[k].nodeStream() as unknown as import("node:stream").Readable;
        st.on("data", (c: Buffer) => { n += c.length; total += c.length; if (n > 20_000_000 || total > 40_000_000) { st.destroy(); no(new Error("FILE_TOO_BIG")); } else chunks.push(c); });
        st.on("end", () => ok(Buffer.concat(chunks).toString("utf8")));
        st.on("error", no);
      });
      parts.push(xml.replace(/<\/w:p>|<\/a:p>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"'));
    }
    return { text: parts.join("\n\n") };
  }
  return { text: buf.toString("utf8") };
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "الطلب غير صالح." }, { status: 400 });
  const topic = String(form.get("topic") ?? "").trim().slice(0, 12000);
  const file = form.get("file");
  const upload = file instanceof File && file.size > 0 ? file : null;
  if (topic.length < 5 && !upload) return NextResponse.json({ error: "اكتب موضوع العرض أو ارفع ملفك." }, { status: 400 });
  if (upload && upload.size > 3_500_000) return NextResponse.json({ error: "الملف كبير (الحد 3.5 ميغابايت)." }, { status: 400 });
  const auto = form.get("slides") === "auto";
  const n = auto ? 20 : Math.min(MAX_SLIDES, Math.max(3, Math.round(Number(form.get("slides"))) || 10));
  const lang = form.get("lang") === "en" ? "en" : "ar";
  const pics = form.get("images") === "1";
  const useKit = form.get("kit") === "1";
  const audience = String(form.get("audience") ?? "").trim().slice(0, 200);
  { const bad = await guardContent(user.id, { topic, audience }, "presentations"); if (bad) return bad; }

  const admin = createAdminClient();
  const { data: tool } = await admin.from("tools").select("credit_cost,is_enabled").eq("id", "presentations").single();
  if (!tool?.is_enabled) return NextResponse.json({ error: await toolOffMessage("presentations") }, { status: 400 });
  const ex = await extraPricing();
  const cost = tool.credit_cost * (auto ? ex.pres_auto_units : Math.ceil(n / 10)) + (pics ? ex.pres_image_cost : 0);
  const { data: job, error } = await admin.from("jobs").insert({ user_id: user.id, tool_id: "presentations", title: (topic || upload?.name || "عرض").slice(0, 80), status: "running", progress: 5, input: { topic: topic.slice(0, 2000), slides: n, lang } }).select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
  setUsageCtx({ jobId: job.id, userId: user.id, toolId: "presentations" }); // «تكلفة كل طلب»: the AI calls below are noted under this request
  const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (payErr) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: payErr.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 }); }

  try {
    const doc = upload ? await readFile(upload) : { text: "" };
    if (upload && !doc.text.trim() && !doc.pdf) throw new Error("ما قدرنا نقرأ نص من الملف.");
    const { data: kit } = await admin.from("brand_kits").select("business_name,colors,font,logo_url,handle,instagram").eq("user_id", user.id).maybeSingle();
    const team = await teamBriefFor("presentations", user.id, `${topic} ${audience}`, 7000); // «فريق التوجيه»
    const cp = String(kit?.handle ?? "").replace(/[<>"]/g, "").trim().slice(0, 60), ci = String(kit?.instagram ?? "").replace(/[<>"\s]/g, "").slice(0, 120);
    const contactNote = useKit && (cp || ci) ? `بيانات تواصل العميل الحقيقية (للشريحة الأخيرة أو الختام، اكتبها حرفياً ولا تكتب «بالبايو»): ${cp ? `الهاتف/الحساب: ${cp}. ` : ""}${ci ? `إنستغرام: ${ci}.` : ""}\n\n` : "";
    const ask = `${team ? `${team}\n\n` : ""}${contactNote}${topic ? `موضوع العميل / نصه:\n${topic}\n\n` : ""}${doc.text ? `محتوى الملف المرفوع (${upload?.name}):\n${doc.text.slice(0, 40000)}\n\n` : ""}${doc.pdf ? "الملف المرفوع (PDF) مرفق. اعتمد عليه.\n\n" : ""}${audience ? `الجمهور/الغرض: ${audience}\n` : ""}${kit?.business_name ? `اسم الجهة المقدِّمة: ${kit.business_name}\n` : ""}${auto ? "عدد الشرائح: اختره بنفسك حسب المادة." : `عدد الشرائح: ${n}.`}`;
    let deck: Deck;
    const pdfs = doc.pdf ? [doc.pdf] : [];
    const twice = async <T,>(f: () => Promise<T>) => { try { return await f(); } catch { return await f(); } };
    if (n <= BIG) {
      deck = await twice(() => claudeVisionJson<Deck>(SYSTEM(n, lang, pics, auto), ask, [], 16000, "claude-sonnet-5-5", pdfs));
      if (!deck.slides?.length) throw new Error("empty deck");
      deck.slides = deck.slides.slice(0, auto ? 24 : n);
    } else {
      // a long deck: the structure first, then the slides in parts that are written at the same time
      const plan = await twice(() => claudeVisionJson<{ title: string; primary: string; accent: string; outline: { kind: Slide["kind"]; title: string }[] }>(OUTLINE(n, lang), ask, [], 16000, "claude-sonnet-5-5", pdfs));
      const outline = (plan.outline ?? []).slice(0, n);
      if (outline.length < Math.min(n, 5)) throw new Error("short outline");
      await admin.from("jobs").update({ progress: 25 }).eq("id", job.id);
      const list = outline.map((o, i) => `${i + 1}. [${o.kind}] ${o.title}`).join("\n");
      const ranges: number[] = []; for (let i = 0; i < outline.length; i += BATCH) ranges.push(i);
      const out: Slide[] = new Array(outline.length);
      let next = 0, done = 0;
      const worker = async () => {
        while (next < ranges.length) {
          const from = ranges[next++], to = Math.min(from + BATCH, outline.length);
          const msg = `عنوان العرض: ${plan.title}\nالهيكل الكامل:\n${list}\n\nاكتب الشرائح من ${from + 1} إلى ${to} فقط.\n\n${ask.slice(0, 30000)}`;
          const r = await twice(() => claudeVisionJson<{ slides: Slide[] }>(BATCHSYS(lang), msg, [], 12000, "claude-sonnet-5-5", pdfs));
          for (let k = from; k < to; k++) out[k] = { ...(r.slides?.[k - from] ?? {}), kind: outline[k].kind, title: outline[k].title };
          done++; await admin.from("jobs").update({ progress: 25 + Math.round((done / ranges.length) * 20) }).eq("id", job.id);
        }
      };
      await Promise.all(Array.from({ length: Math.min(9, ranges.length) }, worker));
      deck = { title: plan.title, lang, primary: plan.primary, accent: plan.accent, slides: out };
    }
    deck.lang = lang;
    const kc = (kit?.colors ?? []).filter(Boolean) as string[];
    deck.primary = (useKit && hex(kc[0])) || hex(deck.primary) || "#1F3A5F";
    deck.accent = (useKit && hex(kc[1])) || hex(deck.accent) || "#C9A24B";
    await admin.from("jobs").update({ progress: 45 }).eq("id", job.id);

    if (pics) {
      const withImg = deck.slides.filter((s) => s.img && (s.kind === "title" || s.kind === "bullets")).slice(0, 4);
      await Promise.all(withImg.map(async (s) => {
        try {
          const path = await illustrate(user.id, job.id, `${s.img}. Photorealistic professional photograph, clean composition, no text, no logos`, undefined, "16:9");
          const dl = await admin.storage.from("results").download(path);
          if (dl.data) { const sharp = (await import("sharp")).default; s.pic = await sharp(Buffer.from(await dl.data.arrayBuffer())).resize(1280, 720, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer(); }
        } catch { /* a missing picture just leaves the slide as text */ }
      }));
    }
    await admin.from("jobs").update({ progress: 75 }).eq("id", job.id);

    let logo: Buffer | null = null;
    if (kit?.logo_url) {
      try {
        const dl = await admin.storage.from("uploads").download(kit.logo_url as string);
        if (dl.data) { const sharp = (await import("sharp")).default; logo = await sharp(Buffer.from(await dl.data.arrayBuffer())).resize(400, 250, { fit: "inside" }).png().toBuffer(); }
      } catch { logo = null; }
    }
    const buf = await buildDeck(deck, useKit ? logo : null, useKit ? (kit?.font as string | null) : null);
    const path = await saveResult(user.id, job.id, buf, PPTX, "pptx");
    const outline = deck.slides.map((s) => String(s.title ?? s.quote ?? "").slice(0, 80));
    await admin.from("jobs").update({ title: String(deck.title ?? "").slice(0, 80) || undefined, input: { topic: topic.slice(0, 2000), slides: n, lang, outline } }).eq("id", job.id);
    await finishJob(job.id, [{ path, type: PPTX, caption: String(deck.title ?? "") }]);
    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    await failJob(job.id, e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "ما قدرنا ننشئ العرض. رجعنا لك الريش، جرّب مرة ثانية." }, { status: 500 });
  }
}
