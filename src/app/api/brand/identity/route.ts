import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { guardContent } from "@/lib/server/moderation";
import { claudeVisionJson } from "@/lib/providers/text";
import { geminiImage } from "@/lib/providers/google";
import { falImages, falRun } from "@/lib/providers/fal";
import { saveResult } from "@/lib/providers/storage";
import { config } from "@/lib/tools/run";
import { safeFetch } from "@/lib/server/safeFetch";
import { ID_FONTS, normaliseConcept, type Concept } from "@/lib/identity";

export const maxDuration = 300;

const SYSTEM = `أنت فريق خبراء في شخص واحد: استراتيجي علامات تجارية، ومدير فني لهويات بصرية، وخبير تسويق وسوشال ميديا خليجي بخبرة 15 سنة. مهمتك بناء هوية متكاملة لعميل يبدأ حسابه على إنستغرام.

مبادئك الاحترافية:
- التناسق أهم من الزخرفة: كل شي (الألوان، الخطوط، شكل البوستات، ريلز، الكابشن، البايو) يحكي نفس الشخصية وبنفس الصوت.
- لكل اتجاه لوحة 5 ألوان بأدوار محددة بالترتيب: primary، secondary، accent، light (خلفية فاتحة)، dark (نص وخلفية داكنة). تباين النص على الخلفيات لازم يكون واضح، وتجنب الألوان المبهرجة والتدرجات الرخيصة.
- الخطوط من هذي القائمة فقط: ${ID_FONTS.join("، ")} (Amiri للفخامة والتراث فقط): head للعناوين و body للنصوص.
- ستكتب اتجاهاً واحداً فقط في كل طلب (الاتجاه المحدد لك)، وهناك 3 زملاء يكتبون الاتجاهات الأخرى بالتوازي، فلا تتشابه معهم: لوحتك وخطوطك وشخصيتك خاصة بالاتجاه المطلوب.
- فكّر بنشاط العميل وجمهوره ومنافسيه ومكانته. لا تعطي اتجاهات عامة تصلح لأي أحد.
- لا تخترع حقائق عن العميل: لا أسعار ولا أرقام ولا شهادات ولا إنجازات ولا أسماء ما ذكرها. إذا ما فيه معلومة اكتب نص عام سليم أو اتركه.
- إذا فيه سيرة ذاتية: استخرج منها الخبرة والتخصص والإنجازات الحقيقية والنبرة الشخصية، وابنِ عليها البايو والكابشنات والأعمدة. استخدم المذكور فيها فقط.
- إذا فيه شعار مرفق: ابنِ الألوان والخطوط بتناغم معه ولا تتجاهله. إذا ما فيه شعار: اكتب وصفاً لرمز الشعار (بالعربي) و prompt إنجليزي لرمز فقط بدون أي حروف أو كلمات.
- شبكة الفيد: 9 مربعات (3×3) متنوعة ومتوازنة (لا نفس النوع بجنب بعض)، نصوص قصيرة جداً (حتى 6 كلمات)، bg رقم لون من اللوحة (0-4).
- الكابشنات: 3 كابشنات جاهزة بنبرة العميل بلهجة خليجية بيضاء واضحة وإملاء سليم، مع دعوة لإجراء. البايو: حتى 150 حرف بسطور قصيرة تقول من أنت ولمن وشنو تقدّم ودعوة واحدة.
- ريلز: غلاف، حركة، ستايل ترجمة، مدة مناسبة، و3 جمل افتتاح (hooks) قوية.

أجب بهذا الشكل بالضبط:
{"concept":{"name":"اسم الاتجاه (2-3 كلمات)","idea":"فكرة الهوية بجملتين","why":"ليش تناسب نشاط العميل وجمهوره","personality":["3-4 صفات"],"palette":[{"role":"primary","name":"اسم اللون","hex":"#RRGGBB"},{"role":"secondary",...},{"role":"accent",...},{"role":"light",...},{"role":"dark",...}],"fonts":{"head":"","body":""},"logo":{"direction":"وصف رمز الشعار","prompt":"English prompt: symbol only, no text"},"feed":{"approach":"طريقة ترتيب الفيد وإيقاعه","rules":["4 قواعد ثابتة لتصميم كل بوست"],"tiles":[{"kind":"quote|offer|tip|product|testimonial|brand","text":"","bg":0}]},"reels":{"cover":"","motion":"","captionStyle":"","length":"","hooks":["","",""]},"content":{"pillars":[{"name":"","share":"30%","ideas":["",""]}],"cadence":"عدد ووقت النشر المقترح"},"bio":"","highlights":["4-5 أسماء قصيرة للهايلايت"],"captions":[{"type":"تعريفي|ترويجي|قيمة","text":""}],"hashtags":["8 هاشتاقات"]}}`;

const DIRECTIONS = ["فخم وهادئ وراقي", "جريء وحيوي وملفت", "دافئ وقريب من الناس وودود", "عصري ومينيمال ونظيف"];

const LOGO_TOOL = "brand-identity";

/** The customer's own website, read as plain text so the identity fits what he really sells (Instagram itself can't be read: it needs a login, so he uploads screenshots instead). */
async function siteText(url?: string | null) {
  const u = (url ?? "").trim();
  if (!u) return "";
  const full = /^https?:\/\//.test(u) ? u : `https://${u}`;
  try {
    const r = await safeFetch(full, { headers: { "user-agent": "Mozilla/5.0 ShaheenBot" } });
    if (!r?.ok || !(r.headers.get("content-type") ?? "").includes("text/html")) return "";
    const html = (await r.text()).slice(0, 300_000);
    const title = html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "";
    const desc = html.match(/name=["']description["'][^>]*content=["']([^"']*)/i)?.[1] ?? "";
    const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 3000);
    return `${title}\n${desc}\n${body}`.trim();
  } catch { return ""; }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { about?: string; audience?: string; tone?: string; cv?: string; cvImages?: string[]; igImages?: string[]; website?: string; logo?: string | null; drawMarks?: boolean; regenerate?: boolean };
  const about = String(body.about ?? "").trim().slice(0, 2500);
  if (about.length < 15) return NextResponse.json({ error: "اكتب وصف نشاطك (سطرين على الأقل) عشان نبني لك هوية تناسبك." }, { status: 400 });
  const audience = String(body.audience ?? "").trim().slice(0, 400);
  const tone = String(body.tone ?? "").trim().slice(0, 300);
  const cv = String(body.cv ?? "").trim().slice(0, 9000);
  const mine = (p: unknown): p is string => typeof p === "string" && p.startsWith(`${user.id}/`) && !p.includes("..");
  const cvImages = (body.cvImages ?? []).filter(mine).slice(0, 4);
  const igImages = (body.igImages ?? []).filter(mine).slice(0, 6);

  const bad = await guardContent(user.id, { about, audience, tone, cv }, "brand/identity");
  if (bad) return bad;

  const admin = createAdminClient();
  const { data: tool } = await admin.from("tools").select("credit_cost,edit_cost").eq("id", LOGO_TOOL).maybeSingle();
  const base = tool?.credit_cost ?? 6, markCost = tool?.edit_cost ?? 6;
  const { data: kit } = await admin.from("brand_kits").select("business_name,logo_url,instagram,website").eq("user_id", user.id).maybeSingle();
  const logoPath = mine(body.logo) ? body.logo : null;
  const drawMarks = !logoPath && body.drawMarks !== false;
  const cost = base + (drawMarks ? markCost : 0);

  const { data: job, error: je } = await admin.from("jobs").insert({ user_id: user.id, tool_id: LOGO_TOOL, title: about.slice(0, 80), status: "draft", progress: 5, input: { kind: "identity", hasLogo: !!logoPath, hasCv: !!(cv || cvImages.length) } }).select("id").single();
  if (je || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
  const { error: ce } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (ce) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: ce.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 }); }

  try {
    const site = await siteText(body.website || kit?.website);
    const sign = async (bucket: string, path: string) => (await admin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6)).data?.signedUrl ?? "";
    const images: { url: string; label: string }[] = [];
    if (logoPath) images.push({ url: await sign("uploads", logoPath), label: "شعار العميل الحالي: ابنِ الألوان والخطوط بتناغم معه." });
    for (const [i, p] of igImages.entries()) images.push({ url: await sign("uploads", p), label: `لقطة ${i + 1} من حساب العميل الحالي على إنستغرام: حلّل أسلوبه وما ينقصه وابنِ الهوية الجديدة كتطوير احترافي له.` });
    for (const [i, p] of cvImages.entries()) images.push({ url: await sign("uploads", p), label: `صفحة ${i + 1} من السيرة الذاتية للعميل (اقرأها واستخرج منها الحقائق الحقيقية فقط).` });
    const info = [
      `اسم النشاط أو الشخص: ${kit?.business_name || "غير محدد"}`,
      `وصف النشاط وما يريده العميل:\n${about}`,
      audience && `الجمهور المستهدف: ${audience}`,
      tone && `الأسلوب المطلوب: ${tone}`,
      kit?.instagram && `حساب إنستغرام: ${kit.instagram}`,
      kit?.website && `الموقع: ${kit.website}`,
      site && `محتوى موقع العميل:\n${site}`,
      logoPath ? "للعميل شعار مرفق (انظر الصورة). لا تقترح شعاراً جديداً: اجعل logo.direction وصفاً قصيراً لكيف يتناغم الشعار الحالي مع الهوية." : "العميل ما عنده شعار: اقترح رمزاً مناسباً لكل اتجاه.",
      cv && `السيرة الذاتية (نص):\n${cv}`,
    ].filter(Boolean).join("\n\n");

    // one concept per request, in parallel: faster, and a long Arabic answer never gets cut off half way
    const settled = await Promise.allSettled(DIRECTIONS.map((d) => claudeVisionJson<{ concept?: unknown }>(SYSTEM, `${info}\n\nالاتجاه المطلوب منك فقط: ${d}`, images, 6000)));
    const errs: string[] = [];
    const concepts = settled.map((r, i) => { if (r.status === "fulfilled") return normaliseConcept(r.value.concept, i); errs.push(String(r.reason).slice(0, 200)); return null; }).filter((c): c is Concept => !!c);
    concepts.forEach((c, i) => { c.id = `c${i + 1}`; });
    if (concepts.length < 2) throw new Error(`concepts ${concepts.length}/4 ${errs[0] ?? "bad json"}`);

    if (drawMarks) {
      const { provider, model } = await config("image");
      const results = await Promise.allSettled(concepts.map(async (c) => {
        const hexes = c.palette.map((x) => x.hex).join(", ");
        const prompt = `${c.logo.prompt || c.logo.direction}. A minimal professional flat vector logo symbol (icon only), centered on a plain white background, simple bold geometric shapes, at most 2 colours chosen from ${hexes}. Absolutely no text, no letters, no numbers, no mockup, no shadows, no gradients.`;
        if (provider === "google") { const r = await geminiImage(model, prompt, [], "1:1"); return saveResult(user.id, job.id, r.bytes, r.type, r.type.includes("png") ? "png" : "jpg"); }
        const data = await falRun(model.replace(/\/edit$/, ""), { prompt, num_images: 1, aspect_ratio: "1:1" });
        const [url] = falImages(data);
        if (!url) throw new Error("no image");
        const res = await fetch(url);
        return saveResult(user.id, job.id, Buffer.from(await res.arrayBuffer()), res.headers.get("content-type") || "image/png", "png");
      }));
      let failed = 0;
      for (const [i, r] of results.entries()) if (r.status === "fulfilled") concepts[i].logo.path = r.value; else { failed++; console.error("identity mark", r.reason); }
      if (failed) await admin.rpc("grant_credits", { p_user: user.id, p_amount: Math.round((markCost * failed) / concepts.length), p_reason: "refund", p_ref: `identity-marks:${job.id}` }).then(() => null, () => null);
    }
    for (const c of concepts) if (c.logo.path) c.logo.url = await sign("results", c.logo.path);

    await admin.from("brand_kits").upsert({ user_id: user.id, about, cv_text: cv || null, identity_options: concepts.map((c) => ({ ...c, logo: { ...c.logo, url: undefined } })) }, { onConflict: "user_id" });
    return NextResponse.json({ concepts, cost });
  } catch (e) {
    console.error("identity", e);
    await admin.rpc("refund_job", { p_job: job.id }).then(() => null, () => null);
    return NextResponse.json({ error: "تعذّر إنشاء الهوية الحين، وما انخصم منك شي. جرّب مرة ثانية.", detail: String(e instanceof Error ? e.message : e).slice(0, 240) }, { status: 500 });
  }
}
