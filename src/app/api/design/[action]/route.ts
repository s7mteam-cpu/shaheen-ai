import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { claudeVisionJson } from "@/lib/providers/text";
import { geminiImage } from "@/lib/providers/google";
import { falImages, falRun } from "@/lib/providers/fal";
import { saveFromUrl, saveResult } from "@/lib/providers/storage";
import { keyFor, splitIconSheet } from "@/lib/providers/iconsheet";
import { ICON_EN } from "@/design/icon-names";
import { config } from "@/lib/tools/run";
import { industryBrief, industryById } from "@/design/industries";
import { usedIcons, ICON_IDS, LAYOUTS, LAYOUT_IDS, DECO_IDS, DESIGN_TOOLS, designImages, lum, normaliseDesign, onColor, type DAspect, type DImg, type DKind, type DesignSpec } from "@/design/spec";

export const maxDuration = 300;

const ASPECTS: DAspect[] = ["4:5", "1:1", "9:16"];
const DIALECT: Record<string, string> = { kuwaiti: "كويتية بإملاء واضح", gulf: "خليجية بيضاء", msa: "عربية فصحى سهلة", same: "نفس لهجة العميل" };

const SYSTEM = `أنت مدير فني ومصمم سوشال ميديا خليجي خبير بأحدث أساليب التصميم 2026 (Editorial، Swiss typography، Bento grids، Bold minimal). تحوّل معلومات العميل إلى تصميم احترافي جاهز للنشر، مو تصميم عام ومكرر.

مبادئك:
- هرمية واضحة: رسالة رئيسية وحدة. العنوان 2-6 كلمات، highlight (الجزء الملوّن بسطر ثاني) 1-4 كلمات، body حتى 20 كلمة.
- لا تزحم التصميم: المزايا 3 كحد أقصى (4 في bold وbento)، كل ميزة 2-5 كلمات. باقي التفاصيل تروح للكابشن.
- meta للتاريخ والوقت والمكان والهاتف فقط (حتى 3).
- لا تخترع أبداً أسعار أو تواريخ أو أرقام هواتف أو أسماء أو نسب خصم أو إحصائيات ما ذكرها العميل. إذا ما فيه سعر لا تكتب price.
- الأيقونات من هذي القائمة فقط: ${ICON_IDS.join(", ")}.
- الألوان: إذا للعميل ألوان هوية استخدمها ووزّع الأدوار: bg خلفية، ink لون النص (تباين عالي مع bg)، accent لون مميز للتأكيد والأزرار، soft سطح البطاقات (قريب من bg). إذا ما فيه، اختر لوحة راقية تناسب المجال (مطاعم دافئة، طبي هادئ، فخامة داكن وذهبي، أطفال مبهج...) وتجنّب التدرجات البنفسجية والنيون والكليشيهات.
- الخط من: Cairo, Tajawal, Almarai, Changa, Amiri (Amiri للفخامة والتراث فقط).
- deco زخرفة الخلفية من: ${DECO_IDS.join(", ")}.
- icons أسلوب الأيقونات: 3d (أيقونات ثلاثية الأبعاد احترافية بألوان الهوية، تنرسم بالذكاء الاصطناعي، الأفضل للتصاميم التسويقية العصرية إذا الصور مسموحة)، line (خطّية أنيقة، الافتراضي للستايل الراقي والبسيط)، duo (معبّاة بلون خفيف، عصرية)، emoji (أيقونات ملوّنة طبيعية، للستايل المبهج والزاهي والأطفال والأكل والعروض). إذا طلب العميل أيقونات طبيعية أو ملوّنة استخدم emoji.
- إذا طلب العميل ستايل معيّن (ألوان زاهية، فخم، بسيط، داكن...) نفّذه بالألوان والتخطيط والزخرفة والأيقونات.
- النصوص بلهجة مطلوبة وبإملاء صحيح، وجمل تسويقية قوية وقصيرة.

التخطيطات (layout) وما يستخدمه كل واحد:
${LAYOUT_IDS.map((id) => `- ${id}: ${LAYOUTS[id].hint}. الحقول: ${LAYOUTS[id].uses.join(", ")}`).join("\n")}

الحقول:
kicker (سطر صغير فوق العنوان)، title، highlight، body، items [{icon,text}]، meta [{icon,text}]، date {day (رقم), month, weekday}، price {value (رقم فقط), old, currency (مثل د.ك), note}، stat {value (مثل 30% أو 2x), label}، badge (شارة قصيرة)، cta (2-3 كلمات)، person {name, role}، photo، imagePrompt، caption.

الصور (photo):
- "upload:N" لاستخدام صورة العميل رقم N (شوفها وحطها بالتخطيط المناسب).
- "scene:N" مع imagePrompt إنجليزي: صورة إعلانية احترافية لمنتج العميل رقم N نفسه (عباية، علبة، عطر، جهاز...) بمشهد يناسب المجال، والمنتج يبقى مثل ما هو بالضبط. استخدمها لما صورة العميل منتج مصوّر بشكل عادي وتحتاج لمسة احترافية.
- "ai" مع imagePrompt إنجليزي تفصيلي لصورة فوتوغرافية احترافية بدون أي نص أو كتابة، تناسب الموضوع والتخطيط.
- إذا العميل رفع صورة منتج، اكتب وصف المنتج ومزاياه بشكل تسويقي (body وitems) من المعلومات والصورة، بدون اختراع مواصفات ما تبين.
- null إذا التصميم أقوى بدون صورة.`;

type Body = {
  tool?: string; info?: string; count?: number; aspect?: DAspect; dialect?: string; photos?: string[]; person?: string;
  useBrand?: boolean; aiImages?: boolean; industry?: string; ref?: DImg | null; jobId?: string; spec?: DesignSpec; instruction?: string; index?: number; prompt?: string;
};
type Raw = Partial<DesignSpec> & Record<string, unknown> & { slides?: (Record<string, unknown> & { photo?: unknown; person?: Record<string, unknown> | null })[] };

async function siteText(url?: string | null) {
  if (!url || !/^https?:\/\//.test(url)) return "";
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "user-agent": "Mozilla/5.0 ShaheenBot" } });
    const html = (await r.text()).slice(0, 300_000);
    const title = html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "";
    const desc = html.match(/name=["']description["'][^>]*content=["']([^"']*)/i)?.[1] ?? "";
    const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 1500);
    return `${title}\n${desc}\n${body}`.trim();
  } catch { return ""; }
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const body = ((await req.json().catch(() => null)) ?? {}) as Body;
  const admin = createAdminClient();

  async function charge(jobId: string, amount: number) {
    if (amount <= 0) return null;
    const { error } = await admin.rpc("spend_credits", { p_user: user!.id, p_amount: amount, p_job: jobId });
    if (!error) return null;
    return NextResponse.json({ error: error.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 });
  }
  const refund = (jobId: string, amount: number, why: string) =>
    admin.rpc("grant_credits", { p_user: user.id, p_amount: amount, p_reason: "refund", p_ref: `design-${why}:${jobId}:${Date.now()}` }).then(() => null, () => null);
  const sign = async (bucket: string, path: string) => (await admin.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6)).data?.signedUrl ?? "";
  const mine = (p?: string) => typeof p === "string" && p.startsWith(`${user.id}/`);

  /** One AI photo, saved to results. Uses the image provider the admin picked for this tool (Gemini or fal). */
  async function aiPhoto(toolId: string, jobId: string, prompt: string, aspect: DAspect, refs: string[] = []): Promise<DImg> {
    const { provider, model } = await config(toolId);
    const full = `${prompt}. Professional commercial photography, natural light, high detail, no text, no letters, no logos, no watermark.`;
    let path: string;
    if (provider === "google") {
      const r = await geminiImage(model, full, refs, aspect === "9:16" ? "9:16" : aspect === "1:1" ? "1:1" : "4:5");
      path = await saveResult(user!.id, jobId, r.bytes, r.type, r.type.includes("png") ? "png" : "jpg");
    } else {
      const data = await falRun(refs.length ? (model.endsWith("/edit") ? model : `${model}/edit`) : model.replace(/\/edit$/, ""), { prompt: full, num_images: 1, aspect_ratio: aspect, ...(refs.length ? { image_urls: refs } : {}) });
      const [url] = falImages(data);
      if (!url) throw new Error("no image");
      path = (await saveFromUrl(user!.id, jobId, url)).path;
    }
    return { path, bucket: "results", url: await sign("results", path) };
  }

  /** One AI sheet of matching 3D icons (brand colours, flat key background) → a transparent PNG per icon. */
  async function icons3d(toolId: string, jobId: string, s: DesignSpec): Promise<Record<string, DImg>> {
    const ids = usedIcons(s);
    if (!ids.length) throw new Error("NO_ICONS");
    const { provider, model } = await config(toolId);
    if (provider !== "google") throw new Error("3D icons need Gemini (admin: image provider google)");
    const cols = ids.length <= 4 ? 2 : 3, rows = Math.ceil(ids.length / cols);
    const key = keyFor(s.colors.accent);
    const keyHex = key[1] === 255 ? "#00FF00 (pure green screen)" : "#FF00FF (pure magenta screen)";
    const list = ids.map((id, i) => `${i + 1}. ${ICON_EN[id as keyof typeof ICON_EN] ?? id}`).join("\n");
    const prompt = `A matching set of ${ids.length} premium 3D icons arranged in a precise ${cols} columns x ${rows} rows grid, reading order left to right, top to bottom:\n${list}\n` +
      `Each grid cell holds exactly one icon, centered, about 60% of the cell, with generous empty space; nothing touches or crosses the cell borders.${ids.length < cols * rows ? " Leave the remaining cells completely empty." : ""}\n` +
      `Style: modern glossy 3D render, soft rounded shapes, smooth clay-like materials with subtle gloss, soft studio lighting, consistent angle and lighting for every icon, high detail, professional app-icon quality. ` +
      `Colour palette: main ${s.colors.accent}, with ${s.colors.ink} and white accents.\n` +
      `Background: one perfectly flat solid ${keyHex} filling the whole image, no gradient, no floor, no shadows on the background, no grid lines, no borders, no text, no letters, no numbers.`;
    const r = await geminiImage(model, prompt, [], "1:1");
    const tiles = await splitIconSheet(r.bytes, cols, rows, key);
    const out: Record<string, DImg> = {};
    for (const [i, id] of ids.entries()) {
      if (!tiles[i]?.length) continue;
      const path = await saveResult(user!.id, jobId, tiles[i], "image/png", "png");
      out[id] = { path, bucket: "results", url: await sign("results", path) };
    }
    if (!Object.keys(out).length) throw new Error("icon sheet empty");
    return out;
  }

  /** Keep text readable whatever colours the AI or customer picked. */
  function safeColors(s: DesignSpec): DesignSpec {
    const contrast = Math.abs(lum(s.colors.bg) - lum(s.colors.ink));
    return contrast < 0.45 ? { ...s, colors: { ...s.colors, ink: onColor(s.colors.bg) } } : s;
  }

  // ---------------- new design ----------------
  if (action === "start") {
    const toolId = String(body.tool);
    const kind = DESIGN_TOOLS[toolId] as DKind | undefined;
    if (!kind) return NextResponse.json({ error: "أداة غير معروفة." }, { status: 400 });
    const { data: tool } = await admin.from("tools").select("credit_cost,is_enabled").eq("id", toolId).single();
    if (!tool?.is_enabled) return NextResponse.json({ error: "الأداة متوقفة حالياً." }, { status: 400 });
    const info = String(body.info ?? "").trim().slice(0, 3000);
    if (info.length < 5) return NextResponse.json({ error: "اكتب معلومات التصميم." }, { status: 400 });
    const count = kind === "carousel" ? Math.min(10, Math.max(3, Number(body.count) || 5)) : kind === "ads" ? Math.min(4, Math.max(1, Number(body.count) || 2)) : 1;
    const aspect = ASPECTS.includes(body.aspect as DAspect) ? (body.aspect as DAspect) : "4:5";
    const photos = (body.photos ?? []).filter(mine).slice(0, 6);
    const person = mine(body.person) ? body.person! : null;

    const { data: job, error } = await admin.from("jobs")
      .insert({ user_id: user.id, tool_id: toolId, title: info.slice(0, 80), status: "draft", progress: 5, input: { info, count, aspect, kind, photos, person } })
      .select("id").single();
    if (error || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
    const cost = (kind === "post" ? 1 : count) * tool.credit_cost;
    const denied = await charge(job.id, cost);
    if (denied) { await admin.from("jobs").delete().eq("id", job.id); return denied; }

    try {
      const { data: kit } = body.useBrand === false ? { data: null } : await admin.from("brand_kits").select("*").eq("user_id", user.id).maybeSingle();
      const site = await siteText(kit?.website);
      const images: { url: string; label: string }[] = [];
      for (const [i, p] of photos.entries()) images.push({ url: await sign("uploads", p), label: `صورة العميل upload:${i}` });
      if (person) images.push({ url: await sign("uploads", person), label: "صورة الشخص (المدرب أو صاحب النشاط) — تنحط تلقائياً في person" });
      for (const p of ((kit?.style_refs ?? []) as string[]).slice(0, 6)) images.push({ url: await sign("uploads", p), label: "مرجع ستايل: بوست سابق يحبه العميل. تعلّم منه الأسلوب والألوان والإحساس (لا تنسخه حرفياً)" });

      const want = kind === "carousel"
        ? `كاروسيل من ${count} شرائح: الأولى cover، الأخيرة cta، والوسط فكرة وحدة لكل شريحة (point غالباً، ويمكن quote أو minimal أو bento للتنويع). نفس الألوان والخط لكل الشرائح. caption عام للكاروسيل.`
        : kind === "ads"
          ? `${count} تصاميم إعلانية مختلفة لنفس المنتج، كل واحد بزاوية تسويقية مختلفة (عرض، فائدة، دليل اجتماعي، ندرة...) وبتخطيط مختلف. كل تصميم له caption خاص.`
          : `تصميم بوست واحد. اختر أنسب تخطيط للمحتوى، وحط caption.`;
      const raw = await claudeVisionJson<Raw>(SYSTEM,
        `${want}\nالمقاس: ${aspect}\nلهجة النصوص: ${DIALECT[String(body.dialect)] ?? DIALECT.gulf}\n` +
        `الصور المولّدة بالذكاء الاصطناعي: ${body.aiImages === false ? "ممنوعة (استخدم صور العميل أو بدون صورة)" : "مسموحة إذا تفيد التصميم"}\n` +
        (kit ? `هوية العميل: الاسم ${kit.business_name || "غير محدد"}، الألوان ${(kit.colors ?? []).join(", ") || "غير محددة"}، الخط ${kit.font || "اختر أنت"}، الحساب ${kit.handle || kit.instagram || "غير محدد"}${kit.website ? `، الموقع ${kit.website}` : ""}\n` : "") +
        (site ? `من موقع العميل (لتعرف نشاطه وأسلوب كلامه):\n${site}\n` : "") +
        (industryById(body.industry) ? `${industryBrief(industryById(body.industry)!)}\n` : "") +
        `\nمعلومات العميل:\n${info}\n\n` +
        `أعد JSON: { "font", "deco", "icons", "colors": {"bg","ink","accent","soft"}, "brand": {"name","handle"}, "caption", "slides": [ {layout, ...الحقول, "photo", "imagePrompt", "caption"} ] }`,
        images, 9000);

      // photos: customer uploads by index, AI photos generated in parallel (max 4)
      const ups = photos.map((p) => ({ path: p, bucket: "uploads" as const, url: "" }));
      const aiWanted: { i: number; ref?: string }[] = [];
      raw.slides = (raw.slides ?? []).slice(0, count).map((s, i) => {
        const ref = String(s.photo ?? "");
        const m = ref.match(/^(upload|scene):(\d+)$/);
        const up = m ? ups[Number(m[2])] : undefined;
        const slide = { ...s, photo: up ?? null };
        if (body.aiImages !== false && s.imagePrompt && aiWanted.length < 4) {
          if (ref === "ai") aiWanted.push({ i });
          else if (m?.[1] === "scene" && up) aiWanted.push({ i, ref: up.path });
        }
        if (slide.person && person) slide.person = { ...slide.person, photo: { path: person, bucket: "uploads", url: "" } };
        return slide;
      });
      if (kind === "post" && !raw.slides.length) throw new Error("no slides");
      const brand = { name: (raw.brand as { name?: string })?.name || kit?.business_name || undefined, handle: kit?.handle || kit?.instagram || (raw.brand as { handle?: string })?.handle || undefined, logo: kit?.logo_url ? { path: kit.logo_url, bucket: "uploads" as const, url: "" } : null, showLogo: true };
      let spec = safeColors(normaliseDesign({ ...raw, brand, aspect }, { kind, aspect }));
      await admin.from("jobs").update({ progress: 60 }).eq("id", job.id);

      const gen = await Promise.allSettled(aiWanted.map(async ({ i, ref }) => {
        const p = String(spec.slides[i].imagePrompt);
        if (!ref) return aiPhoto(toolId, job.id, p, aspect);
        return aiPhoto(toolId, job.id, `Professional advertising photo of the exact same product from the reference image (keep its shape, label, logo, colors and details unchanged). Scene: ${p}`, aspect, [await sign("uploads", ref)]);
      }));
      gen.forEach((g, n) => { if (g.status === "fulfilled") spec.slides[aiWanted[n].i].photo = g.value; else console.error("design ai photo", g.reason); });
      if (industryById(body.industry)) {
        const { data: has } = await admin.from("brand_kits").select("user_id").eq("user_id", user.id).maybeSingle();
        if (has) await admin.from("brand_kits").update({ industry: body.industry }).eq("user_id", user.id);
        else await admin.from("brand_kits").insert({ user_id: user.id, industry: body.industry });
      }
      if (spec.icons === "3d") {
        if (body.aiImages === false) spec.icons = "duo";
        else {
          try { spec.icon3d = await icons3d(toolId, job.id, spec); }
          catch (e) { console.error("design 3d icons", e); spec.icons = "duo"; }
        }
      }
      // A photo layout without a photo looks empty: fall back to a text layout.
      spec = { ...spec, slides: spec.slides.map((s) => (!s.photo && (s.layout === "photo" || s.layout === "split") ? { ...s, layout: "classic" } : s)) };

      await admin.from("jobs").update({ progress: 100, input: { info, count, aspect, kind, photos, person, spec: { ...spec, slides: spec.slides.map((s) => s) } } }).eq("id", job.id);
      return NextResponse.json({ jobId: job.id });
    } catch (e) {
      console.error("design start", e);
      await admin.from("jobs").update({ status: "failed", error: `design: ${e instanceof Error ? e.message : String(e)}`.slice(0, 500) }).eq("id", job.id);
      await admin.rpc("refund_job", { p_job: job.id });
      return NextResponse.json({ error: "ما قدرنا نجهّز التصميم الحين، ورجّعنا لك الريش. حاول مرة ثانية." }, { status: 502 });
    }
  }

  // ---------------- edits on the customer's own design ----------------
  const { data: job } = await admin.from("jobs").select("id,user_id,tool_id,status,input").eq("id", String(body.jobId)).single();
  if (!job || job.user_id !== user.id || !DESIGN_TOOLS[job.tool_id]) return NextResponse.json({ error: "التصميم غير موجود." }, { status: 404 });
  if (job.status === "queued" || job.status === "running") return NextResponse.json({ error: "التصميم قيد التصدير، لحظات." }, { status: 409 });
  const base = { kind: DESIGN_TOOLS[job.tool_id], aspect: (job.input.aspect as DAspect) ?? "4:5" };
  const { data: tool } = await admin.from("tools").select("edit_cost").eq("id", job.tool_id).single();
  const editCost = tool?.edit_cost ?? 2;
  /** Images must be the customer's own files (or results of this job). */
  const clean = (s: DesignSpec): DesignSpec => {
    const ok = (i?: DImg | null) => (i && mine(i.path) ? i : null);
    return { ...s, icon3d: Object.fromEntries(Object.entries(s.icon3d ?? {}).filter(([, v]) => ok(v))), brand: { ...s.brand, logo: ok(s.brand.logo) }, slides: s.slides.map((sl) => ({ ...sl, photo: ok(sl.photo), person: sl.person ? { ...sl.person, photo: ok(sl.person.photo) } : null })) };
  };

  if (action === "save") {
    if (!body.spec) return NextResponse.json({ error: "ما فيه تصميم." }, { status: 400 });
    const spec = clean(normaliseDesign(body.spec as Raw, base));
    await admin.from("jobs").update({ input: { ...job.input, spec, aspect: spec.aspect }, updated_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "revise") {
    const instruction = String(body.instruction ?? "").trim().slice(0, 800);
    if (!instruction || !body.spec) return NextResponse.json({ error: "اكتب التعديل المطلوب." }, { status: 400 });
    const denied = await charge(job.id, editCost);
    if (denied) return denied;
    try {
      const current = clean(normaliseDesign(body.spec as Raw, base));
      const strip = { ...current, brand: { name: current.brand.name, handle: current.brand.handle }, slides: current.slides.map((s) => ({ ...s, photo: s.photo ? "keep" : null, person: s.person ? { name: s.person.name, role: s.person.role } : null })) };
      const raw = await claudeVisionJson<Raw>(SYSTEM,
        `هذا التصميم الحالي:\n${JSON.stringify(strip)}\n\nطلب العميل: ${instruction}\nطبّق الطلب فقط وحافظ على الباقي. photo: "keep" يعني خلّ الصورة الحالية. أعد JSON كامل بنفس الشكل.`, [], 9000);
      const next = normaliseDesign({ ...raw, brand: current.brand, aspect: raw.aspect ?? current.aspect }, base);
      next.slides = next.slides.map((s, i) => {
        const old = current.slides[i];
        const r = raw.slides?.[i] as { photo?: unknown } | undefined;
        return { ...s, photo: r?.photo === "keep" || r?.photo === undefined ? old?.photo ?? null : null, person: s.person ? { ...s.person, photo: old?.person?.photo ?? null } : null };
      });
      next.icon3d = current.icon3d;
      return NextResponse.json({ spec: safeColors(next) });
    } catch (e) {
      console.error("design revise", e);
      await refund(job.id, editCost, "revise");
      return NextResponse.json({ error: "ما ضبط التعديل، ورجّعنا لك الريش. جرّب تكتبه بطريقة ثانية." }, { status: 502 });
    }
  }

  if (action === "image") {
    const prompt = String(body.prompt ?? "").trim().slice(0, 600);
    if (prompt.length < 3) return NextResponse.json({ error: "اوصف الصورة." }, { status: 400 });
    const denied = await charge(job.id, editCost);
    if (denied) return denied;
    try {
      const ref = body.ref && mine(body.ref.path) ? await sign(body.ref.bucket === "results" ? "results" : "uploads", body.ref.path) : "";
      const img = ref
        ? await aiPhoto(job.tool_id, job.id, `Professional advertising photo of the exact same product from the reference image (keep its shape, label, logo, colors and details unchanged). Scene: ${prompt}`, (body.spec?.aspect as DAspect) ?? base.aspect, [ref])
        : await aiPhoto(job.tool_id, job.id, prompt, (body.spec?.aspect as DAspect) ?? base.aspect);
      return NextResponse.json({ img });
    } catch (e) {
      console.error("design image", e);
      await refund(job.id, editCost, "image");
      const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
      const why = me?.role === "admin" ? ` [${String(e instanceof Error ? e.message : e).slice(0, 220)}]` : "";
      return NextResponse.json({ error: `ما قدرنا نولّد الصورة، ورجّعنا لك الريش.${why}` }, { status: 502 });
    }
  }

  if (action === "icons3d") {
    if (!body.spec) return NextResponse.json({ error: "ما فيه تصميم." }, { status: 400 });
    const current = normaliseDesign(body.spec as Raw, base);
    if (!usedIcons(current).length) return NextResponse.json({ error: "التصميم ما فيه أيقونات." }, { status: 400 });
    const denied = await charge(job.id, editCost);
    if (denied) return denied;
    try {
      return NextResponse.json({ icon3d: await icons3d(job.tool_id, job.id, current) });
    } catch (e) {
      console.error("design icons3d", e);
      await refund(job.id, editCost, "icons3d");
      const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).single();
      const why = me?.role === "admin" ? ` [${String(e instanceof Error ? e.message : e).slice(0, 220)}]` : "";
      return NextResponse.json({ error: `ما قدرنا نرسم الأيقونات، ورجّعنا لك الريش.${why}` }, { status: 502 });
    }
  }

  if (action === "export") {
    if (!body.spec) return NextResponse.json({ error: "ما فيه تصميم." }, { status: 400 });
    const spec = clean(normaliseDesign(body.spec as Raw, base));
    const title = `${spec.slides[0]?.title ?? ""} ${spec.slides[0]?.highlight ?? ""}`.trim() || job.input.info;
    await admin.from("jobs").update({ status: "queued", progress: 0, error: null, title: String(title).slice(0, 80), input: { ...job.input, spec, aspect: spec.aspect, render: true, attempts: 0 }, updated_at: new Date().toISOString() }).eq("id", job.id);
    return NextResponse.json({ ok: true, images: designImages(spec).length });
  }

  return NextResponse.json({ error: "طلب غير معروف." }, { status: 404 });
}
