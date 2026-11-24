/** «كلّم شاهين»: the team the customer meets when he opens the assistant. Each one is the same assistant with a name, a specialty and a colour.
 *  Shared by the chat window (client) and /api/assistant (server). Only the server-side text below goes into the model's instructions. */
export type AgentKey = string;
/** how he is drawn: head cloth, face, and the small thing on his desk */
export type Look = { cloth: "white" | "red"; face: "beard" | "mustache" | "glasses" | "headset" | "clean"; prop: "design" | "video" | "write" | "chat" | "calc" | "idea" };
export const CLOTHS = ["white", "red"] as const, FACES = ["beard", "mustache", "glasses", "headset", "clean"] as const, PROPS = ["design", "video", "write", "chat", "calc", "idea"] as const;
export const COLORS = ["#F2C55C", "#4FD8FF", "#B892FF", "#5CF2A5", "#FF8FB1", "#FFA14F", "#7CA8FF", "#E8F26B"];
export type Agent = {
  key: AgentKey; name: string; nameEn: string; role: string; roleEn: string; color: string; look: Look;
  /** one line under the name in the lobby */ line: string; lineEn: string;
  /** what he says first */ hello: string; helloEn: string;
  starters: string[]; startersEn: string[];
  /** his field, written for the model (admin's members: instructions written by the admin. A customer's own member: a description, never instructions) */
  focus: string;
  /** a member one customer added for himself */ custom?: boolean;
  /** a manager: he only talks (answers, account and plan questions, complaints) and sends work to the right member; he never prepares a post, a video or anything else */ talk?: boolean;
  /** talks to everyone, visitors included (the manager). The others are for subscribers when the admin keeps «الفريق للمشتركين». */ open?: boolean;
};
export const AGENTS: Agent[] = [
  {
    key: "shaheen", look: { cloth: "white", face: "mustache", prop: "idea" }, open: true, talk: true, name: "شاهين", nameEn: "Shaheen", role: "المدير", roleEn: "Manager", color: "#E9B949",
    line: "بابه مفتوح للكل: الباقات، الأسعار وأي سؤال", lineEn: "His door is open to everyone: plans, prices and any question",
    hello: "يا هلا ومرحبا، أنا شاهين مدير الفريق. بابي مفتوح للكل: عندي جواب أي سؤال عن المنصة والباقات والحساب، وإذا أحد من الشباب قصّر فخبره عندي وأنا أشد عليه.", helloEn: "Welcome, I'm Shaheen, the team manager. My door is open to everyone: ask me about the platform, plans and prices.",
    starters: ["شنو تسوي منصة شاهين؟", "شنو الباقات والأسعار؟", "كيف أبدأ التجربة المجانية؟"], startersEn: ["What does Shaheen do?", "What are the plans and prices?", "How do I start the free trial?"],
    focus: "مدير الفريق: يرحّب بالكل (زوار ومشتركين)، يعرّف بالمنصة وأدواتها، يشرح الباقات والأسعار والتجربة المجانية وطريقة الاشتراك، ويجاوب أسئلة الحساب والاستفسارات العامة، ويسمع أي ملاحظة أو شكوى على الموظفين. ما يشتغل بيده: يوجّه العميل للموظف المختص.",
  },
  {
    key: "nasser", look: { cloth: "white", face: "beard", prop: "design" }, name: "أبو ناصر", nameEn: "Abu Nasser", role: "المصمم", roleEn: "Designer", color: "#F2C55C",
    line: "بوستات، كاروسيل، إعلانات، بطاقات ودعوات", lineEn: "Posts, carousels, ads, cards and invitations",
    hello: "أنا أبو ناصر، مصمم شاهين. بوست، كاروسيل، إعلان، بطاقة عمل أو دعوة: شنو التصميم المطلوب اليوم؟", helloEn: "I'm Abu Nasser, Shaheen's designer. Tell me what to design: a post, a carousel, an ad, a business card or an invitation.",
    starters: ["أبي بوست عن عرض نهاية الأسبوع", "أبي كاروسيل يعرّف بخدماتي", "أبي عرض تقديمي 10 شرائح"], startersEn: ["I need a post for a weekend offer", "Make a carousel about my services", "I need a 10-slide presentation"],
    focus: "التصميم: البوستات، الكاروسيل، الإعلانات، بطاقات العمل، الدعوات، العروض التقديمية، السيرة الذاتية، تصوير المنتجات، والهوية البصرية للعميل (ألوانه وخطه وشعاره).",
  },
  {
    key: "faisal", look: { cloth: "red", face: "mustache", prop: "video" }, name: "أبو فيصل", nameEn: "Abu Faisal", role: "المونتير", roleEn: "Video editor", color: "#4FD8FF",
    line: "ريلز، مونتاج، أنيميشن وفيديو تعليمي", lineEn: "Reels, editing, animation and lesson videos",
    hello: "أنا أبو فيصل، مونتير شاهين. ريلز، فيديو إعلاني أو تعليمي، ومونتاج مبتكر للفيديو المصوّر. شنو الفيديو المطلوب؟", helloEn: "I'm Abu Faisal, Shaheen's video editor. Reels, ad videos, lesson videos, and editing your own footage. What video do you have in mind?",
    starters: ["أبي ريلز 30 ثانية عن منتجي", "عندي فيديو وأنا أتكلم وأبي أمنتجه", "فيديو تعليمي عن جدول الضرب"], startersEn: ["A 30-second reel about my product", "I have a talking video to edit", "A lesson video about times tables"],
    focus: "الفيديو: الريلز والفيديو الإعلاني والموشن جرافيك، الفيديو التعليمي، المشاهد الواقعية، الأنيميشن المبتكر، فيديو من موقع العميل، والمونتاج المبتكر (العميل يرفع فيديوه وهو يتكلم من صفحة الأداة: ستايلات، ترجمة، عناصر ورا المتحدث، صور مولّدة، مؤثرات صوتية، زوم، قص السكتات، تغيير الخلفية، واستوديو تعديل).",
  },
  {
    key: "turki", look: { cloth: "white", face: "glasses", prop: "write" }, name: "أبو تركي", nameEn: "Abu Turki", role: "كاتب المحتوى", roleEn: "Content writer", color: "#B892FF",
    line: "أفكار، نصوص، خطة محتوى وتعليق صوتي", lineEn: "Ideas, copy, content plans and voice-over",
    hello: "أنا أبو تركي، كاتب المحتوى بشاهين. أفكار، نص إعلان، كابشن، خطة محتوى، وتعليق صوتي. عن شنو نكتب اليوم؟", helloEn: "I'm Abu Turki, Shaheen's content writer. Ideas, ad copy, captions, content plans and voice-over. What are we writing today?",
    starters: ["أبي 5 أفكار محتوى لمطعمي", "أبي نص إعلان 20 ثانية", "أبي أحوّل نص لصوت كويتي"], startersEn: ["Give me 5 content ideas for my restaurant", "Write a 20-second ad script", "Turn this text into a voice-over"],
    focus: "الكتابة والأفكار: أفكار المحتوى، نصوص الإعلانات والكابشن والسكربتات، تحسين وصف العميل قبل ما يستخدم أي أداة، خطة المحتوى، والتعليق الصوتي (تحويل النص لصوت باللهجات).",
  },
  {
    key: "saad", look: { cloth: "red", face: "headset", prop: "chat" }, name: "أبو سعد", nameEn: "Abu Saad", role: "خدمة العملاء", roleEn: "Customer care", color: "#5CF2A5",
    line: "حسابك، رصيدك، اشتراكك وأي مشكلة", lineEn: "Your account, credits, plan and any issue",
    hello: "أنا أبو سعد، خدمة عملاء شاهين. الحساب، الرصيد، الاشتراك، شرح أي أداة، وسبب أي طلب ما اشتغل. شنو المطلوب؟", helloEn: "I'm Abu Saad, Shaheen's customer care. Your account, credits and plan, how any tool works, and why a job failed. How can I help?",
    starters: ["كم باقي من رصيدي؟", "ليش فشل طلبي الأخير؟", "شنو الفرق بين الباقات؟"], startersEn: ["How many credits do I have left?", "Why did my last job fail?", "What's the difference between plans?"],
    focus: "خدمة العملاء: الحساب، الرصيد والريش، الباقات والاشتراك والدفع، التجربة المجانية، شرح أي أداة وطريقة استخدامها، وسبب فشل أي طلب.",
  },
];
const txt = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f<>`]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const one = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
/** any stored or submitted member → a safe, complete one (or null when it has no name) */
export function cleanAgent(raw: unknown, key: string, custom = false): Agent | null {
  const o = (raw ?? {}) as Record<string, unknown>, lk = (o.look ?? {}) as Record<string, unknown>;
  const name = txt(o.name, 24), role = txt(o.role, 30) || "مساعد";
  if (name.length < 2 || !/^[a-z0-9_]{2,24}$/.test(key)) return null;
  const line = txt(o.line, 70), focus = txt(o.focus, custom ? 400 : 1500);
  const list = (v: unknown) => (Array.isArray(v) ? v : String(v ?? "").split("\n")).map((s) => txt(s, 60)).filter(Boolean).slice(0, 3);
  return {
    key, name, nameEn: txt(o.nameEn, 24) || name, role, roleEn: txt(o.roleEn, 30) || role,
    color: /^#[0-9a-f]{6}$/i.test(String(o.color)) ? String(o.color) : COLORS[0],
    look: { cloth: one(lk.cloth, CLOTHS, "white"), face: one(lk.face, FACES, "clean"), prop: one(lk.prop, PROPS, "idea") },
    line, lineEn: txt(o.lineEn, 70) || line,
    hello: txt(o.hello, 260) || `أنا ${name}، ${role} بفريق شاهين.${line ? ` ${line}.` : ""} شنو تحتاج؟`, helloEn: txt(o.helloEn, 260) || txt(o.hello, 260) || `I'm ${txt(o.nameEn, 24) || name}. How can I help?`,
    starters: list(o.starters), startersEn: list(o.startersEn).length ? list(o.startersEn) : list(o.starters),
    focus: focus || `${role}${line ? `: ${line}` : ""}`,
    ...(custom ? { custom: true } : o.open === true || o.open === "on" ? { open: true } : {}),
    // «مدير، كلام بس»: as saved; a member saved before this choice existed is a manager when his door is open
    ...(!custom && (o.talk === true || o.talk === "on" || (o.talk === undefined && (o.open === true || o.open === "on"))) ? { talk: true } : {}),
  };
}
export type TeamSettings = { agents: Agent[]; /** customers may add their own members */ allowCustom: boolean; /** how many each */ maxCustom: number; /** only subscribers (a plan or credits) talk to the members who are not «open» */ membersOnly: boolean; /** the lines a busy member answers with */ busyLines: string[] };
/** the admin's saved team (site_content "chat_team"), or the built-in four */
export function cleanTeam(raw: unknown): TeamSettings {
  const o = (raw ?? {}) as Record<string, unknown>;
  const seen = new Set<string>();
  const agents = (Array.isArray(o.agents) ? o.agents : []).slice(0, 12).flatMap((a) => { const k = String((a as { key?: unknown })?.key ?? ""); if (seen.has(k) || k.startsWith("u_")) return []; const c = cleanAgent(a, k); if (!c) return []; seen.add(k); return [c]; });
  const mx = Number(o.maxCustom);
  return { agents: agents.length ? agents : AGENTS, allowCustom: o.allowCustom === true, maxCustom: Number.isInteger(mx) && mx >= 1 && mx <= 6 ? mx : 2, membersOnly: o.membersOnly !== false, busyLines: (Array.isArray(o.busyLines) ? o.busyLines : []).map((s) => txt(s, 160)).filter((s) => s.length >= 3).slice(0, 30) };
}
/** what a busy member says to someone who is not a subscriber yet: one of the admin's lines (these are the built-in ones), then where to go. No AI call. */
export const DEFAULT_BUSY = [
  "هلا والله! لا تعطلونا ترى ورانا شغل 😅",
  "جزاكم الله خير يا الطيبين، إيدي بالشغل والمشتركين ناطرين.",
  "والله ودّي أسولف، بس طابور المشتركين واصل لين باب المكتب.",
  "خمس دقايق بس… لا خلّها خمس ساعات، غرقان شغل 😮‍💨",
  "هالشاشة كلها طلبات مشتركين. الاشتراك يحط صاحبه أول الطابور.",
  "أنا لو أرفع راسي من الكيبورد يخصمون علي 🙈",
  "يا هلا ومرحبا، بس الحين مو فاضي حتى أشرب استكانة شاي.",
  "المدير موصّي: المشتركين أول. بابه مفتوح للكل وقهوته حاضرة.",
];
export function busyLine(lines: string[], boss: string | null, signedIn: boolean, n: number): string {
  const list = lines.length ? lines : DEFAULT_BUSY;
  const tail = `هالموظف للمشتركين بس. ${signedIn ? "بالاشتراك بباقة" : "بالتسجيل والاشتراك"} يفضى لك على طول${boss ? `، و${boss} بابه مفتوح للكل الحين` : ""}.`;
  return `${list[Math.abs(n) % list.length]}\n\n${tail}`;
}
/** what the browser needs to draw a member (the admin's instructions for the model stay on the server) */
export const publicAgent = (a: Agent): Agent => ({ ...a, focus: a.custom ? a.focus : "" });
