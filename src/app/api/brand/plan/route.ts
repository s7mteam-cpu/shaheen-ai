import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { claudeVisionJson } from "@/lib/providers/text";
import { FORMAT_LABEL, ROTATION, normaliseAnalysis, normaliseWeek, planDates, planStartISO, type Analysis, type PlanItem } from "@/lib/plan";
import type { Concept } from "@/lib/identity";

export const maxDuration = 300;

const SYSTEM = `أنت مدير تسويق محتوى خليجي خبير بإنستغرام (خطط شهرية، ريلز، كاروسيل، بوستات) وتفكر كاستراتيجي علامات. تعمل لعميل عنده هوية معتمدة. اكتب بلهجة خليجية بيضاء واضحة وإملاء سليم.

قواعدك:
- لا تخترع حقائق عن العميل: لا أسعار ولا أرقام ولا شهادات ولا إنجازات ولا أسماء ما ذكرها. استخدم فقط ما في وصفه وسيرته ومعلومات موقعه.
- كل منشور يخدم هدفاً واحداً (تعريف، ثقة، تعليم، مبيعات، تفاعل) ويتبع عموداً من أعمدة المحتوى.
- الـ prompt هو نص جاهز يلصقه العميل في أداة تصميم أو فيديو، فاكتبه كطلب احترافي كامل بدون أي مقدمة: الفكرة والرسالة، الجمهور، النبرة، المحتوى المطلوب بالتفصيل (للبوست: العنوان والنقاط وحتى 3 مزايا ودعوة الإجراء. للكاروسيل: ترتيب الشرائح شريحة بشريحة (6-8) مع نص كل وحدة. للريلز: الجملة الافتتاحية ثم المشاهد بالترتيب مع النص على الشاشة وما يقال بالصوت ثم الدعوة للإجراء بالنهاية)، وأخيراً أسلوب الصورة والألوان من هوية العميل. 120-220 كلمة.
- الكابشن: جاهز للنشر بنبرة العميل وفيه دعوة لإجراء وهاشتاقات قليلة مناسبة.`;

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  const admin = createAdminClient();
  const { data: kit } = await admin.from("brand_kits").select("business_name,about,cv_text,identity,website,instagram").eq("user_id", user.id).maybeSingle();
  const id = kit?.identity as Concept | null;
  if (!id) return NextResponse.json({ error: "اعتمد هوية أول، وبعدها نسوي لك الخطة." }, { status: 400 });

  const { data: tool } = await admin.from("tools").select("credit_cost").eq("id", "brand-plan").maybeSingle();
  const cost = tool?.credit_cost ?? 4;
  const { data: job, error: je } = await admin.from("jobs").insert({ user_id: user.id, tool_id: "brand-plan", title: `خطة ${id.name}`.slice(0, 80), status: "draft", progress: 5, input: { kind: "plan" } }).select("id").single();
  if (je || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
  const { error: ce } = await admin.rpc("spend_credits", { p_user: user.id, p_amount: cost, p_job: job.id });
  if (ce) { await admin.from("jobs").delete().eq("id", job.id); return NextResponse.json({ error: ce.message.includes("INSUFFICIENT") ? "رصيدك من الريش ما يكفي." : "تعذّر خصم الرصيد." }, { status: 402 }); }

  try {
    const info = [
      `اسم النشاط: ${kit?.business_name || id.name}`,
      kit?.about && `وصف النشاط:\n${kit.about}`,
      kit?.cv_text && `السيرة الذاتية:\n${String(kit.cv_text).slice(0, 5000)}`,
      `الهوية المعتمدة: ${id.name}. ${id.idea}\nالشخصية: ${id.personality.join("، ")}\nأعمدة المحتوى: ${id.content.pillars.map((p) => `${p.name} (${p.share}): ${p.ideas.join("، ")}`).join(" | ")}\nالبايو: ${id.bio}`,
    ].filter(Boolean).join("\n\n");
    const dates = planDates();

    const week = (w: number) => claudeVisionJson<{ items?: unknown[] }>(SYSTEM,
      `${info}\n\nاكتب منشورات الأسبوع ${w + 1} من 4 (خطة شهرية). النشر 3 مرات: السبت والاثنين والأربعاء بهذا الترتيب والأنواع: ${ROTATION[w].map((f, i) => `${["السبت", "الاثنين", "الأربعاء"][i]} = ${FORMAT_LABEL[f]}`).join("، ")}. نوّع الأعمدة والأهداف خلال الأسبوع، ولا تكرر مواضيع الأسابيع الأخرى (زملاؤك يكتبون بقية الأسابيع بالتوازي، فخصّص أسبوعك بزاوية مميزة).\nأجب بـ: {"items":[{"pillar":"","topic":"عنوان الموضوع","hook":"جملة افتتاحية قوية","goal":"","prompt":"","caption":""},{...},{...}]} (3 عناصر بالترتيب).`, [], 6000);
    const analysis = claudeVisionJson<{ analysis?: unknown }>(SYSTEM, `${info}\n\nاكتب تحليلاً صريحاً ومفيداً لنشاط العميل كمستشار تسويق: أجب بـ {"analysis":{"positioning":"كيف نوضعه بالسوق بجملتين","audience":"جمهوره الأقرب ودوافعه","voice":"نبرة صوته","strengths":["3-4 نقاط قوة"],"gaps":["3-4 فجوات أو مخاطر يجب معالجتها"],"opportunities":["3-4 فرص محتوى أو سوق"],"differentiators":["3 ما يميزه عن المنافسين"],"competitors":"نوع المنافسين الذين يقارن بهم العميل وكيف يتميز"}}`, [], 3500);

    const [wk, an] = await Promise.all([Promise.allSettled([0, 1, 2, 3].map(week)), analysis.then((r) => normaliseAnalysis(r.analysis)).catch(() => null)]);
    const items: PlanItem[] = [];
    wk.forEach((r, w) => { if (r.status === "fulfilled") items.push(...normaliseWeek(r.value, w + 1, dates[w])); else console.error("plan week", w, r.reason); });
    if (items.length < 6) throw new Error(`plan ${items.length}/12`);
    const plan = { month: `${dates[0][0]} → ${dates[3][2]}`, start: planStartISO(), items };
    await admin.from("brand_kits").update({ content_plan: plan, analysis: an as Analysis | null }).eq("user_id", user.id);
    return NextResponse.json({ plan, analysis: an, cost });
  } catch (e) {
    console.error("plan", e);
    await admin.rpc("refund_job", { p_job: job.id }).then(() => null, () => null);
    return NextResponse.json({ error: "تعذّر إنشاء الخطة الحين، وما انخصم منك شي.", detail: String(e instanceof Error ? e.message : e).slice(0, 240) }, { status: 500 });
  }
}
