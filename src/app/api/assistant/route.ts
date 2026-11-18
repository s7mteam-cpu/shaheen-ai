import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dbReady, getContent, getPlans, getTools } from "@/lib/data";
import { aiChat } from "@/lib/providers/text";
import { trialSettings, trialStatus } from "@/lib/server/trial";
import { createAdminClient } from "@/lib/supabase/admin";

const KEEP_DAYS = 30;
const DAY = 86_400_000;
type Saved = Msg & { at: number };
let lastPurge = 0;

/** Chats older than 30 days are deleted. Runs from here (at most once an hour) so it does not depend on a cron. */
async function purgeOld() {
  if (Date.now() - lastPurge < 3_600_000) return;
  lastPurge = Date.now();
  await createAdminClient().from("assistant_chats").delete().lt("updated_at", new Date(Date.now() - KEEP_DAYS * DAY).toISOString());
}
async function loadChat(userId: string): Promise<Saved[]> {
  const { data } = await createAdminClient().from("assistant_chats").select("messages").eq("user_id", userId).maybeSingle();
  const list = Array.isArray(data?.messages) ? (data!.messages as Saved[]) : [];
  return list.filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && Date.now() - Number(m.at || 0) < KEEP_DAYS * DAY);
}

/** The signed-in customer's saved conversation (last 30 days). */
export async function GET() {
  if (!dbReady()) return NextResponse.json({ signedIn: false, messages: [] });
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, messages: [] });
  purgeOld().catch(() => null);
  const saved = await loadChat(user.id).catch(() => []);
  return NextResponse.json({ signedIn: true, messages: saved.map(({ role, content }) => ({ role, content })) });
}

/** «محادثة جديدة»: deletes the saved conversation. */
export async function DELETE() {
  if (!dbReady()) return NextResponse.json({ ok: true });
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (user) await createAdminClient().from("assistant_chats").delete().eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

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

  const [content, plans, tools, trial] = await Promise.all([getContent(), getPlans(), getTools(), trialSettings().catch(() => null)]);
  let userBlock = "الزائر غير مسجل دخول.";
  let key = req.headers.get("x-forwarded-for") ?? "anon";
  let uid: string | null = null;

  if (dbReady()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      key = user.id;
      uid = user.id;
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
        `التجربة المجانية: ${await trialStatus(user.id).then((t) => t.state === "active" ? `شغّالة الحين (${t.credits} ريشة، تنتهي ${t.expiresAt ? new Date(t.expiresAt).toLocaleString("ar-KW") : ""})` : t.state === "offer" ? "متاحة له وما أخذها بعد (زر «ابدأ التجربة المجانية» فوق لوحة التحكم)" : "مو متاحة له (أخذها قبل، أو تخطّاها من شاشة الترحيب، أو عنده اشتراك)").catch(() => "غير معروف")}`,
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
- الصفحات: لوحة التحكم /app، الأدوات /app/tools، أعمالي /app/works، الهوية التجارية /app/brand، «أعمال صُنعت بشاهين» /app/showcase (نماذج من شغل شاهين: بوستات وكاروسيل وريلز وفيديو)، الحساب والاشتراك والفواتير /app/account، الدفع بالتحويل /app/pay/transfer.
- التجربة المجانية: ${trial?.enabled ? `مرة وحدة لكل شخص: ${trial.credits} ريشة لمدة ${trial.hours} ساعة، يحتاج بريد مؤكد ورقم جوال. إذا ضغط «تخطي التجربة المجانية» بشاشة الترحيب، تروح عليه نهائياً. بعدها يشترك ويكمّل بلا حدود.` : "متوقفة حالياً."}
- الدفع: بالبطاقة (فيزا/ماستركارد وطرق الدفع المحلية) بالدينار الكويتي، وبعض الدول تقدر تدفع بالتحويل من صفحة /app/pay/transfer وفريقنا يراجع الإيصال ويفعّل الاشتراك. الأسعار بالعملات الثانية تقريبية بسعر صرف اليوم.
- حفظ المحادثة: للعميل المسجّل دخول، محادثته معك تنحفظ 30 يوم من آخر رسالة، ويرجع لها من أي جهاز. زر «محادثة جديدة» يمسحها نهائياً. للزائر غير المسجّل ما تنحفظ. إذا سألك عن هذا جاوبه بالأرقام هذي بالضبط.
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
    if (uid) {
      // keep the whole thread (not just the 16 messages Claude sees), each message with its own date
      try {
        const old = await loadChat(uid);
        const all = [...(body.messages ?? []).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-40).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })), { role: "assistant" as const, content: reply }];
        const pool = [...old];
        const stamped: Saved[] = all.map((m) => { const k = pool.findIndex((o) => o.role === m.role && o.content === m.content); return { ...m, at: k >= 0 ? pool.splice(k, 1)[0].at : Date.now() }; });
        await createAdminClient().from("assistant_chats").upsert({ user_id: uid, messages: stamped, updated_at: new Date().toISOString() });
      } catch (e) { console.error("assistant save", e instanceof Error ? e.message : e); }
    }
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("assistant:", e instanceof Error ? e.message : e);   // shows in Vercel → Logs
    return NextResponse.json({ reply: `ما قدرت أرد الحين. تقدر تتواصل مع فريقنا على واتساب ${wa}` });
  }
}
