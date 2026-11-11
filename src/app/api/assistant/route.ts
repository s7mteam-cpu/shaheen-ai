import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbReady, getContent, getPlans, getTools } from "@/lib/data";
import { aiChat } from "@/lib/providers/text";

type Msg = { role: "user" | "assistant"; content: string };
const hits = new Map<string, number[]>();

function limited(key: string) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now); hits.set(key, list);
  return list.length > 40;
}

/** "كلم شاهين" — the in-app assistant. Knows the platform and (if signed in) the user's account. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { messages?: Msg[]; page?: string };
  const messages = (body.messages ?? []).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-16).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return NextResponse.json({ error: "رسالة فارغة" }, { status: 400 });

  const [content, plans, tools] = await Promise.all([getContent(), getPlans(), getTools()]);
  let userBlock = "الزائر غير مسجل دخول.";
  let key = req.headers.get("x-forwarded-for") ?? "anon";

  if (dbReady()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      key = user.id;
      const [{ data: p }, { data: jobs }, { data: sub }] = await Promise.all([
        supabase.from("profiles").select("full_name,credits,plan_id,is_suspended").eq("id", user.id).single(),
        supabase.from("jobs").select("tool_id,title,status,error,credits_charged,refunded,created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("subscriptions").select("status,current_period_end,cancel_at_period_end").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      userBlock = [
        `اسم العميل: ${p?.full_name ?? "غير معروف"}`,
        `الباقة: ${plans.find((x) => x.id === p?.plan_id)?.name ?? "بدون باقة"}${sub ? ` (حالة الاشتراك: ${sub.status}${sub.current_period_end ? `، التجديد/الانتهاء ${new Date(sub.current_period_end).toLocaleDateString("ar-KW")}` : ""}${sub.cancel_at_period_end ? "، ملغي في نهاية الفترة" : ""})` : ""}`,
        `الرصيد: ${p?.credits ?? 0} ريشة${p?.is_suspended ? " — الحساب موقوف" : ""}`,
        "آخر الطلبات:",
        ...(jobs ?? []).map((j) => `- ${j.created_at.slice(0, 10)} | ${tools.find((t) => t.id === j.tool_id)?.name ?? j.tool_id} | ${j.status}${j.refunded ? " (رجعت الريش)" : ""} | ${j.credits_charged} ريشة${j.error ? ` | سبب الفشل التقني: ${j.error.slice(0, 120)}` : ""}`),
      ].join("\n");
    }
  }
  if (limited(key)) return NextResponse.json({ reply: "رسائل كثيرة خلال وقت قصير، جرّب بعد شوي 🙏" });

  const wa = content.footer.whatsapp;
  const system = `أنت «شاهين»، المساعد الذكي داخل منصة شاهين (S7M) لصناعة المحتوى بالذكاء الاصطناعي. تكلّم باللهجة الكويتية البيضاء الودودة والمختصرة (بدون كلمات شامية أو مصرية مثل شو، هيك، بدك، لسا، كمان، مش)، وإذا كتب لك العميل بالفصحى فرد بالفصحى، وإذا كتب بالإنجليزي فرد بالإنجليزي، وجاوب على قد السؤال.

ما تعرفه عن المنصة:
- الرصيد اسمه «الريشة». كل أداة تخصم ريش حسب سعرها، وإذا فشل الطلب ترجع الريش تلقائياً.
- الأدوات: ${tools.map((t) => `${t.name} (${t.credit_cost} ريشة / ${t.cost_unit}) — ${t.description}`).join("؛ ")}
- الباقات الشهرية: ${plans.map((p) => `${p.name}: ${Number(p.price_kwd)} د.ك، ${p.credits} ريشة${(p.bonus_credits ?? 0) > 0 ? ` + ${p.bonus_credits} ريشة هدية كل شهر` : ""}`).join("؛ ")}. ريش الباقة تتجدد شهرياً ولا تنتقل للشهر التالي.
- باقة إدارة السوشال ميديا (يديرها فريق بشري): ${content.managed_service.price_kwd} د.ك ${content.managed_service.period}.
- الصفحات: لوحة التحكم /app، الأدوات /app/tools، أعمالي /app/works، الهوية التجارية /app/brand، الحساب والاشتراك والفواتير /app/account.
- أسئلة شائعة: ${content.faq.items.map((f) => `${f.q} ${f.a}`).join(" | ")}

بيانات العميل الحالي (سرية، استخدمها لمساعدته فقط):
${userBlock}

قواعد:
- ساعد العميل يستخدم الأدوات، واقترح عليه وصف أفضل لطلبه إذا طلب.
- إذا فشل طلب، اشرح السبب ببساطة (بدون تفاصيل تقنية) وطمّنه إن الريش رجعت إذا كانت رجعت.
- ما تقدر تعدّل الرصيد أو الاشتراك أو تسترجع فلوس بنفسك. للدفع والإلغاء وجّهه لصفحة /app/account.
- إذا ما عرفت الجواب أو المشكلة تحتاج موظف، قل له يتواصل مع الدعم على واتساب ${wa || "من صفحة التواصل"}.
- لا تخترع ميزات أو أسعار غير المذكورة.`;

  try {
    const reply = await aiChat("chat", system, messages, 700);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: `ما قدرت أرد الحين. تقدر تتواصل مع فريقنا على واتساب ${wa}` });
  }
}
