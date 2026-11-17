import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { claudeVisionJson } from "@/lib/providers/text";
import { saveResult } from "@/lib/providers/storage";
import { illustrate } from "@/lib/server/illustrate";
import { failJob, finishJob } from "@/lib/server/jobs";
import { buildDeck, type Deck } from "@/lib/server/deck";

export const maxDuration = 300;

const COUNTS = [6, 10, 15, 20];
const IMG_COST = 8; // up to 4 pictures drawn by AI
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const hex = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : null);

const SYSTEM = (n: number, lang: string, pics: boolean) => `أنت مصمّم عروض تقديمية محترف وكاتب محتوى. اكتب عرض PowerPoint كامل جاهز للتقديم من مادة العميل.
القواعد:
- عدد الشرائح بالضبط ${n}. الشريحة الأولى kind=title والأخيرة kind=closing (شكر/خلاصة/تواصل).
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

async function readFile(f: File): Promise<{ text: string; pdf?: string }> {
  const buf = Buffer.from(await f.arrayBuffer());
  const n = f.name.toLowerCase();
  if (n.endsWith(".pdf")) return { text: "", pdf: buf.toString("base64") };
  if (n.endsWith(".docx") || n.endsWith(".pptx")) {
    const zip = await JSZip.loadAsync(buf);
    const names = Object.keys(zip.files).filter((k) => (n.endsWith(".docx") ? k === "word/document.xml" : /^ppt\/slides\/slide\d+\.xml$/.test(k))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const parts: string[] = [];
    for (const k of names) {
      const xml = await zip.files[k].async("string");
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
  const n = COUNTS.includes(Number(form.get("slides"))) ? Number(form.get("slides")) : 10;
  const lang = form.get("lang") === "en" ? "en" : "ar";
  const pics = form.get("images") === "1";
  const useKit = form.get("kit") === "1";
  const audience = String(form.get("audience") ?? "").trim().slice(0, 200);
  { const bad = await guardContent(user.id, { topic, audience }, "presentations"); if (bad) return bad; }

  const admin = createAdminClient();
  const { data: tool } = await admin.from("tools").select("credit_cost,is_enabled").eq("id", "presentations").single();
  if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
  const cost = tool.credit_cost * Math.ceil(n / 10) + (pics ? IMG_COST : 0);
  const { data: job, error } = await admin.from("jobs").insert({ user_id: user.id, tool_id: "presentations", title: (topic || upload?.name || "عرض").slice(0, 80), status: "running", progress: 5, input: { topic: topic.slice(0, 2000), slides: n, lang } }).select("id").single();
  if (error || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
  const { error: payErr } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (payErr) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: payErr.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 }); }

  try {
    const doc = upload ? await readFile(upload) : { text: "" };
    if (upload && !doc.text.trim() && !doc.pdf) throw new Error("ما قدرنا نقرأ نص من الملف.");
    const { data: kit } = await admin.from("brand_kits").select("business_name,colors,font,logo_url").eq("user_id", user.id).maybeSingle();
    const ask = `${topic ? `موضوع العميل / نصه:\n${topic}\n\n` : ""}${doc.text ? `محتوى الملف المرفوع (${upload?.name}):\n${doc.text.slice(0, 40000)}\n\n` : ""}${doc.pdf ? "الملف المرفوع (PDF) مرفق. اعتمد عليه.\n\n" : ""}${audience ? `الجمهور/الغرض: ${audience}\n` : ""}${kit?.business_name ? `اسم الجهة المقدِّمة: ${kit.business_name}\n` : ""}عدد الشرائح: ${n}.`;
    let deck: Deck;
    const run = () => claudeVisionJson<Deck>(SYSTEM(n, lang, pics), ask, [], 12000, "claude-sonnet-5-5", doc.pdf ? [doc.pdf] : []);
    try { deck = await run(); } catch { deck = await run(); }
    if (!deck.slides?.length) throw new Error("empty deck");
    deck.slides = deck.slides.slice(0, n);
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
