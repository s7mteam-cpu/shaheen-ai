import { NextResponse } from "next/server";
import { teamBriefFor } from "@/lib/server/teamBrief";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { claudeVisionJson } from "@/lib/providers/text";
import { FORMAT_LABEL, TIMES, normaliseAnalysis, normaliseWeek, planSlots, cleanFormats, FORMAT_TOOL_ID, PLAN_FORMATS, SITE_FORMATS, type Analysis, type PlanItem } from "@/lib/plan";
import type { Concept } from "@/lib/identity";

export const maxDuration = 300;

const SYSTEM = `أنت مدير تسويق محتوى خليجي خبير بإنستغرام (خطط شهرية، ريلز، كاروسيل، بوستات) وتفكر كاستراتيجي علامات. تعمل لعميل عنده هوية معتمدة. اكتب بلهجة خليجية بيضاء واضحة وإملاء سليم.

قواعدك:
- لا تخترع حقائق عن العميل: لا أسعار ولا أرقام ولا شهادات ولا إنجازات ولا أسماء ما ذكرها. استخدم فقط ما في وصفه وسيرته ومعلومات موقعه.
- كل منشور يخدم هدفاً واحداً (تعريف، ثقة، تعليم، مبيعات، تفاعل) ويتبع عموداً من أعمدة المحتوى.
- الـ prompt هو نص جاهز يلصقه العميل في أداة تصميم أو فيديو، فاكتبه كطلب احترافي كامل بدون أي مقدمة: الفكرة والرسالة، الجمهور، النبرة، المحتوى المطلوب بالتفصيل (للبوست: العنوان والنقاط وحتى 3 مزايا ودعوة الإجراء. للكاروسيل: ترتيب الشرائح شريحة بشريحة (6-8) مع نص كل وحدة. للريلز: الجملة الافتتاحية ثم المشاهد بالترتيب مع النص على الشاشة وما يقال بالصوت ثم الدعوة للإجراء بالنهاية)، وأخيراً أسلوب الصورة والألوان من هوية العميل. 120-220 كلمة.
- وقت النشر time: أفضل أوقات النشر بالخليج ثلاثة فقط: "12:30 ظهراً" أو "4:30 عصراً" أو "11:00 مساءً". اختر لكل منشور الأنسب لنوعه وجمهوره (الريلز والمحتوى الترفيهي غالباً 11 مساءً، والمحتوى المهني والتعليمي الظهر أو العصر) ونوّع خلال الأسبوع.
- الكابشن: جاهز للنشر بنبرة العميل وفيه دعوة لإجراء وهاشتاقات قليلة مناسبة.`;

export async function POST(req: Request) {
  const scope: "week" | "month" = ((await req.json().catch(() => ({}))) as { scope?: string }).scope === "week" ? "week" : "month";
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const admin = createAdminClient();
  const { data: kit } = await admin.from("brand_kits").select("business_name,about,cv_text,identity,industry,handle,website,instagram,analysis,plan_prefs").eq("user_id", user.id).maybeSingle();
  const id = kit?.identity as Concept | null;
  // a customer who never made an identity can still have a plan, as long as he told Shaheen about his business (name or description) in «هويتي التجارية»
  const known = [kit?.business_name, kit?.industry, kit?.website, kit?.instagram, kit?.handle].some((v) => String(v ?? "").trim()) || String(kit?.about ?? "").trim().length >= 15 || String(kit?.cv_text ?? "").trim().length >= 15;
  if (!id && !known) return NextResponse.json({ error: "عرّف شاهين بنشاطك بهويتك التجارية: اسم النشاط أو مجالك أو وصفه أو سيرتك، وبعدها نسوي لك الخطة." }, { status: 400 });
  const planName = id?.name ?? String(kit?.business_name ?? "").trim().slice(0, 60) ?? "نشاطك";

  const { data: tool } = await admin.from("tools").select("credit_cost,edit_cost").eq("id", "brand-plan").maybeSingle();
  const cost = scope === "week" ? (tool?.edit_cost || 2) : (tool?.credit_cost ?? 4);
  const { data: job, error: je } = await admin.from("jobs").insert({ user_id: user.id, tool_id: "brand-plan", title: `خطة ${planName || "نشاطك"}`.slice(0, 80), status: "draft", progress: 5, input: { kind: "plan" } }).select("id").single();
  if (je || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
  const { error: ce } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (ce) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: ce.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 }); }

  try {
    const info = [
      `اسم النشاط: ${kit?.business_name || planName || "غير محدد"}`,
      kit?.about && `وصف النشاط:\n${kit.about}`,
      (kit?.plan_prefs as { insta?: { voice?: string } } | null)?.insta?.voice && `تحليل حسابه على إنستغرام (من نص ولقطات رفعها العميل بنفسه، استفد منه بنبرة المحتوى والمواضيع ولا تنسخه):\n${(() => { const i = (kit!.plan_prefs as { insta: { voice: string; topics: string[]; formats: string[]; gaps: string[]; ideas: string[]; best: string } }).insta; return `النبرة: ${i.voice}\nمواضيعه: ${i.topics.join("، ")}\nأنواعه: ${i.formats.join("، ")}\nفجوات: ${i.gaps.join("، ")}\nاتجاهات مناسبة: ${i.ideas.join("، ")}${i.best ? `\nالأفضل أداءً: ${i.best}` : ""}`; })()}`,
      kit?.cv_text && `السيرة الذاتية:\n${String(kit.cv_text).slice(0, 5000)}`,
      id && `الهوية المعتمدة: ${id.name}. ${id.idea}\nالشخصية: ${id.personality.join("، ")}\nأعمدة المحتوى: ${id.content.pillars.map((p) => `${p.name} (${p.share}): ${p.ideas.join("، ")}`).join(" | ")}\nالبايو: ${id.bio}`,
    ].filter(Boolean).join("\n\n");
    const { data: ft } = await admin.from("tools").select("id,is_enabled").in("id", Object.values(FORMAT_TOOL_ID));
    const off = PLAN_FORMATS.filter((f) => !ft?.find((t) => t.id === FORMAT_TOOL_ID[f])?.is_enabled || (SITE_FORMATS.includes(f) && !kit?.website));
    const chosen = cleanFormats((kit?.plan_prefs as { formats?: unknown } | null)?.formats, off);
    const { weeks: slots, start } = planSlots(scope, new Date(), chosen);

    const team = await teamBriefFor("content-plan", user.id, `${kit?.about ?? ""} ${kit?.business_name ?? ""}`, 9000); // «فريق التوجيه»: the field, the skills for posts, his «تعليماتي» and his dialect
    const week = (w: number) => claudeVisionJson<{ items?: unknown[] }>(SYSTEM,
      `${info}\n\n${team ? `${team}\n\n` : ""}اكتب منشورات ${scope === "week" ? "هذا الأسبوع" : `الأسبوع ${w + 1} من 4 (خطة شهرية)`}. النشر 3 مرات بهذا الترتيب والأنواع: ${slots[w].map((sl) => `${sl.day} ${sl.date} = ${FORMAT_LABEL[sl.format]}`).join("، ")}. نوّع الأعمدة والأهداف${scope === "week" ? "" : "، ولا تكرر مواضيع الأسابيع الأخرى (زملاؤك يكتبون بقية الأسابيع بالتوازي، فخصّص أسبوعك بزاوية مميزة)"}.\nأجب بـ: {"items":[{"pillar":"","topic":"عنوان الموضوع","hook":"جملة افتتاحية قوية","goal":"","time":"${TIMES.join(" | ")}","prompt":"","caption":""},{...},{...}]} (3 عناصر بالترتيب).`, [], 6000);
    const keepAnalysis = scope === "week" && kit?.analysis;
    const analysis = keepAnalysis ? Promise.resolve({ analysis: undefined }) : claudeVisionJson<{ analysis?: unknown }>(SYSTEM, `${info}\n\nاكتب تحليلاً صريحاً ومفيداً لنشاط العميل كمستشار تسويق: أجب بـ {"analysis":{"positioning":"كيف نوضعه بالسوق بجملتين","audience":"جمهوره الأقرب ودوافعه","voice":"نبرة صوته","strengths":["3-4 نقاط قوة"],"gaps":["3-4 فجوات أو مخاطر يجب معالجتها"],"opportunities":["3-4 فرص محتوى أو سوق"],"differentiators":["3 ما يميزه عن المنافسين"],"competitors":"نوع المنافسين الذين يقارن بهم العميل وكيف يتميز"}}`, [], 3500);

    const [wk, an0] = await Promise.all([Promise.allSettled(slots.map((_, w) => week(w))), analysis.then((r) => normaliseAnalysis(r.analysis)).catch(() => null)]);
    const an = keepAnalysis ? (kit?.analysis as Analysis) : an0;
    const items: PlanItem[] = [];
    wk.forEach((r, w) => { if (r.status === "fulfilled") items.push(...normaliseWeek(r.value, w + 1, slots[w])); else console.error("plan week", w, r.reason); });
    if (items.length < (scope === "week" ? 2 : 6)) throw new Error(`plan ${items.length}`);
    const flat = slots.flat();
    const plan = { month: `${flat[0].date} → ${flat[flat.length - 1].date}`, start, scope, items };
    await admin.from("brand_kits").update({ content_plan: plan, analysis: an as Analysis | null, auto_state: null }).eq("user_id", user.id);
    return NextResponse.json({ plan, analysis: an, cost });
  } catch (e) {
    console.error("plan", e);
    await admin.rpc("refund_job", { p_job: job.id }).then(() => null, () => null);
    return NextResponse.json({ error: "تعذّر إنشاء الخطة الحين، وما انخصم منك شي.", detail: String(e instanceof Error ? e.message : e).slice(0, 240) }, { status: 500 });
  }
}
