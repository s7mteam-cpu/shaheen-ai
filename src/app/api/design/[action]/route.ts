import { loadLike, likeText } from "@/lib/server/like";
import { cleanColors } from "@/lib/plan";
import { NextResponse } from "next/server";
import { safeFetch } from "@/lib/server/safeFetch";
import { guardContent } from "@/lib/server/moderation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { RULES_DESIGN_2026 } from "@/lib/server/rules2026";
import { claudeVisionJson } from "@/lib/providers/text";
import { geminiImage } from "@/lib/providers/google";
import { falImages, falRun } from "@/lib/providers/fal";
import { saveFromUrl, saveResult } from "@/lib/providers/storage";
import { keyFor, splitIconSheet } from "@/lib/providers/iconsheet";
import { ICON_EN } from "@/design/icon-names";
import { iconGuide } from "@/design/iconData";
import { config } from "@/lib/tools/run";
import { industryBrief, industryById } from "@/design/industries";
import { designBrief, designPack } from "@/design/packs";
import { guessIndustry } from "@/lib/server/guessIndustry";
import { snapshot, trendsFor } from "@/lib/server/trends";
import { DECOR_FONTS, usedIcons, LAYOUTS, LAYOUT_IDS, layoutsFor, DECO_IDS, FRAME_IDS, STICKER_IDS, STICKER_LABELS, DESIGN_TOOLS, designImages, lum, normaliseDesign, onColor, type DAspect, type DImg, type DKind, type DesignSpec } from "@/design/spec";

export const maxDuration = 300;

const ASPECTS: DAspect[] = ["4:5", "1:1", "9:16"];

const INVITE_SYSTEM = `أنت مصمم دعوات مناسبات خليجي محترف بأحدث أساليب 2026 (طباعة محرّرة Editorial، ألوان ترابية دافئة وزيتونية وبودرة، أقواس وإطارات رفيعة، فراغات واسعة، خطوط كبيرة واثقة). تحوّل معلومات العميل إلى دعوة أنيقة جاهزة للطباعة والإرسال (وجه + ظهر اختياري).
القواعد:
- النصوص التي كتبها العميل (الأسماء، التاريخ، الوقت، المكان، الأرقام، نص الدعوة) تنسخ حرفياً بدون تغيير أو تصحيح. لا تخترع أسماء أو تواريخ أو أماكن أو أرقام هواتف أو آيات قرآنية أو أحاديث. العبارة الدينية المسموحة بدون أن يكتبها العميل: «بسم الله الرحمن الرحيم» فقط.
- الوجه (slides[0]): layout من: ${layoutsFor("invite").filter((x) => x !== "invBack").join(", ")}. kicker = عبارة افتتاحية قصيرة (مثل بسم الله الرحمن الرحيم، أو «ندعوكم لمشاركتنا فرحتنا»)، title = الأسماء أو عنوان المناسبة (مثال: «محمد وسارة»، «مولودنا الجديد»)، highlight اختياري (الاسم الثاني إن أردت سطراً ثانياً)، body = نص الدعوة (حتى 28 كلمة، فيه الداعي والمناسبة)، date = {day, month, weekday} (day رقم فقط، month اسم الشهر بالعربي، weekday اسم اليوم) إن ذكر العميل التاريخ، meta = حتى 4 عناصر {icon,text}: الوقت (clock) والمكان (map-pin) وعنوان المكان أو الاستقبال (map-pin) وللتأكيد (phone) والأيقونة من: clock, map-pin, phone, calendar, gift, users.
- الظهر (slides[1]) إن طُلب: layout invBack: kicker (مثل «تفاصيل الحفل»)، title (مثل «نتشرف بحضوركم»)، body (الزي، الاستقبال، ملاحظات العميل)، date، meta (المكان والتأكيد وما يلزم الضيوف). لا تكرر الوجه حرفياً بلا فائدة.
- اختر التخطيط والألوان والخط حسب المناسبة وذوق العميل: زفاف فخم → invA أو invD مع خط Amiri وذهبي/كحلي/زيتوني؛ زفاف عصري ورومانسي → invB بألوان وردية أو ترابية؛ بسيط عصري → invC؛ مولود/تخرج/عيد/حفلة → invE بألوان مبهجة. لا تكرر نفس الاختيار دائماً. حدّد finish: "foil" (فويل معدني لامع) إذا كان اللون المميز ذهبياً أو نحاسياً أو فضياً أو وردياً معدنياً، وإلا "flat".
- الألوان: bg خلفية الدعوة (فاتحة غالباً)، ink لون النص ويجب أن يكون **غامقاً** بتباين عالٍ مع bg (خاصة مع invD فالخلفية الداكنة تُرسم من ink)، accent لون مميز، soft سطح ثانوي. استخدم ألوان هوية العميل إن وُجدت.
- font (خط النصوص الصغيرة، يجب أن يكون واضحاً): Cairo, Tajawal, Almarai, Amiri, El Messiri. و titleFont (خط الأسماء والعنوان والتاريخ، خط زخرفي): ${DECOR_FONTS.map((f) => `${f.id} (${f.label})`).join("، ")}. اختر titleFont يناسب المناسبة: Aref Ruqaa أو Aref Ruqaa Ink للزفاف الفخم والتقليدي (خط رقعة بالحبر)، Katibeh للرومانسي والخط اليدوي، Mirza للمائل الناعم، Reem Kufi للعصري الهندسي، El Messiri للأنيق الهادئ. نوّع الاختيار.
- deco من: ${DECO_IDS.join(", ")} (none أو sparkle أو leaves للدعوات غالباً). frame: none غالباً.
- لا صور ولا sticker ولا note ولا price (photo: null).
أعد JSON: { "font", "titleFont", "deco", "frame", "colors": {"bg","ink","accent","soft"}, "slides": [ {layout, kicker, title, highlight, body, date, meta:[{icon,text}]} ] }`;

const BCARD_SYSTEM = `أنت مصمم هويات وبطاقات عمل خليجي محترف. تحوّل معلومات العميل إلى بطاقة عمل أنيقة جاهزة للطباعة (وجه + ظهر).
القواعد:
- النصوص التي كتبها العميل (الاسم، المسمى، الأرقام، البريد، الموقع، العنوان، اسم الشركة) تنسخ حرفياً كما هي بدون أي تغيير أو ترجمة أو تصحيح. لا تخترع رقم هاتف أو بريد أو موقع أو عنوان أو مسمى وظيفي ما ذكره العميل.
- الوجه (slides[0]): layout من هذي: ${layoutsFor("bcard").filter((x) => !x.includes("Back")).join(", ")}. title = اسم الشخص (أو اسم الشركة لو بطاقة شركة)، kicker = المسمى الوظيفي (أو المجال)، highlight اختياري (كلمة وحدة من الاسم أو اسم الشركة)، body = عبارة تعريفية قصيرة جداً إن وجدت بكلام العميل، meta = وسائل التواصل بحد أقصى 5 كل واحدة {icon,text} والأيقونة من: phone (جوال/هاتف)، message (بريد إلكتروني)، globe (موقع إلكتروني)، map-pin (عنوان)، clock (دوام)، أو شعار الحساب إن ذكر العميل حسابًا: b-instagram، b-whatsapp، b-snapchat، b-tiktok، b-x، b-youtube، b-facebook، b-telegram (النص هو الحساب كما كتبه العميل).
- الظهر (slides[1]) إن طُلب: layout إما cardBack (لون الهوية كامل مع الشعار + عبارة تعريفية: title اسم الجهة، body العبارة) أو cardBackB (تفاصيل: kicker، title مثل «تواصل معنا» أو «موقعنا»، body، meta بدون تكرار ما في الوجه حرفياً إلا الضروري).
- نوّع الأسلوب حسب مجال العميل وذوقه: فخم/تقليدي → cardB أو cardE مع Amiri والذهبي أو الكحلي، تقني/عصري → cardD أو cardC، طبي/قانوني/استشاري → cardE أو cardA بألوان هادئة، تجاري عام → cardA. لا تكرر نفس الاختيار دائماً. حدّد finish: "foil" (فويل معدني لامع) إذا كان اللون المميز ذهبياً أو نحاسياً أو فضياً أو وردياً معدنياً، وإلا "flat".
- الألوان: إذا للعميل ألوان هوية استخدمها بالأدوار: bg خلفية البطاقة (فاتحة غالباً)، ink لون النص (تباين عالٍ مع bg)، accent لون الهوية المميز، soft سطح ثانوي. وإلا اختر ألواناً راقية تناسب المجال.
- font: Cairo, Tajawal, Almarai, Changa, Amiri. و titleFont اختياري للاسم والعنوان فقط: Reem Kufi أو El Messiri أو Aref Ruqaa للفخامة والتقليدي.
- deco من: ${DECO_IDS.join(", ")} (استخدم none أو lines أو corner للبطاقات غالباً حتى لا تزدحم). frame من: ${FRAME_IDS.join(", ")} (none غالباً أو gold للفخامة).
- لا تستخدم صور (photo: null) ولا sticker ولا note ولا price.
أعد JSON: { "font", "titleFont", "deco", "frame", "colors": {"bg","ink","accent","soft"}, "brand": {"name"}, "slides": [ {layout, kicker, title, highlight, body, meta:[{icon,text}]} ] }`;
const DIALECT: Record<string, string> = { kuwaiti: "كويتية بإملاء واضح", saudi: "لهجة سعودية بيضاء واضحة", emirati: "لهجة إماراتية بيضاء واضحة", qatari: "لهجة قطرية بيضاء واضحة", bahraini: "لهجة بحرينية بيضاء واضحة", omani: "لهجة عُمانية بيضاء واضحة",  gulf: "خليجية بيضاء", iraqi: "لهجة عراقية بيضاء واضحة", levantine: "لهجة شامية بيضاء واضحة", syrian: "لهجة سورية بيضاء واضحة", jordanian: "لهجة أردنية بيضاء واضحة", egyptian: "لهجة مصرية بيضاء واضحة", sudanese: "لهجة سودانية بيضاء واضحة", yemeni: "لهجة يمنية بيضاء واضحة", libyan: "لهجة ليبية بيضاء واضحة", maghrebi: "لهجة مغاربية مفهومة (دارجة مبسطة قريبة من الفصحى)", msa: "عربية فصحى سهلة", same: "نفس لهجة العميل" };

const SYSTEM = `أنت مدير فني ومصمم سوشال ميديا خليجي خبير بأحدث أساليب التصميم 2026 (Editorial، Swiss typography، Bento grids، Bold minimal). تحوّل معلومات العميل إلى تصميم احترافي جاهز للنشر، مو تصميم عام ومكرر.

مبادئك:
- هرمية واضحة: رسالة رئيسية وحدة. العنوان 2-6 كلمات، highlight (الجزء الملوّن بسطر ثاني) 1-4 كلمات، body حتى 20 كلمة.
- لا تزحم التصميم: المزايا 3 كحد أقصى (4 في bold وbento)، كل ميزة 2-5 كلمات. باقي التفاصيل تروح للكابشن.
- meta للتاريخ والوقت والمكان والهاتف فقط (حتى 3).
- لا تخترع أبداً أسعار أو تواريخ أو أرقام هواتف أو أسماء أو نسب خصم أو إحصائيات ما ذكرها العميل. إذا ما فيه سعر لا تكتب price.
- الأيقونات من هذي القائمة فقط (مرتبة حسب المجال، اختر الأنسب لنشاط العميل ولا تكرر نفس الأيقونة):
${iconGuide()}
- الألوان: إذا للعميل ألوان هوية استخدمها ووزّع الأدوار: bg خلفية، ink لون النص (تباين عالي مع bg)، accent لون مميز للتأكيد والأزرار، soft سطح البطاقات (قريب من bg). إذا ما فيه، اختر لوحة راقية تناسب المجال (مطاعم دافئة، طبي هادئ، فخامة داكن وذهبي، أطفال مبهج...) وتجنّب التدرجات البنفسجية والنيون والكليشيهات.
- الخط (font) اختر ما يناسب شخصية النشاط، من هذي المكتبة: عصري ونظيف (Cairo, Tajawal, Almarai, IBM Plex Sans Arabic, Readex Pro, Alexandria, Vazirmatn)، عناوين قوية وجريئة (Changa, Baloo Bhaijaan 2, Lalezar, Kufam)، كوفي هندسي (Reem Kufi, Noto Kufi Arabic)، فخم وتراثي (Amiri, Noto Naskh Arabic, El Messiri, Markazi Text)، مرح للأطفال (Marhey, Lemonada, Playpen Sans Arabic). خط واحد للتصميم كله، ونوّع بين العملاء. النص الطويل دائمًا بخط مقروء (عصري أو نسخ)، والخطوط الزخرفية للعنوان فقط وبحدّها.
- deco زخرفة الخلفية من: ${DECO_IDS.join(", ")}.
- frame إطار التصميم من: ${FRAME_IDS.join(", ")} (gold للفخامة، dashed ومرح للأطفال والدروس، none للبسيط).
- sticker (اختياري لكل شريحة) {kind, text} لمسة بالزاوية: ${STICKER_IDS.map((k) => `${k} ${STICKER_LABELS[k]}`).join("، ")}. النص قصير جداً (1-3 كلمات) وصحيح، ولا تخترع معلومة ما ذكرها العميل (مثل «أصلي 100%» أو «ضمان») إلا إذا تناسب كلامه.
- icons أسلوب الأيقونات: 3d (أيقونات ثلاثية الأبعاد احترافية بألوان الهوية، تنرسم بالذكاء الاصطناعي، الأفضل للتصاميم التسويقية العصرية إذا الصور مسموحة)، line (خطّية أنيقة، الافتراضي للستايل الراقي والبسيط)، duo (معبّاة بلون خفيف، عصرية)، emoji (أيقونات ملوّنة طبيعية، للستايل المبهج والزاهي والأطفال والأكل والعروض). إذا طلب العميل أيقونات طبيعية أو ملوّنة استخدم emoji.
- إذا طلب العميل ستايل معيّن (ألوان زاهية، فخم، بسيط، داكن...) نفّذه بالألوان والتخطيط والزخرفة والأيقونات.
- النصوص بلهجة مطلوبة وبإملاء صحيح، وجمل تسويقية قوية وقصيرة.
- الكاروسيل شريحة واحدة متصلة وليست تصاميم منفصلة: نفس الألوان والخط والزخرفة والإطار على كل الشرائح، ونفس نوع الستيكر (أو بدونه) على كل الشرائح، وصور الذكاء الاصطناعي بنفس الأسلوب والإضاءة والألوان. القصة متسلسلة: الغلاف يفتح الفكرة، كل شريحة تكمل اللي قبلها (نقاط مرقمة 1، 2، 3 بنفس التخطيط)، والخاتمة تقفل بدعوة. لا تستخدم أكثر من تخطيطين للشرائح الداخلية، وحافظ على نفس أسلوب العنوان والكيكر.

مهارات المصمم المحترف (طبّقها دائمًا):
1) الخطّاف: أول ما تنظر العين هو العنوان. اكتب عنوانًا يوقف الإبهام: سؤال يلمس مشكلة العميل، أو رقم/نتيجة، أو وعد واضح، أو فضول. ممنوع العناوين العامة مثل «خدماتنا» و«أهلاً بكم».
2) هرمية بصرية من ثلاث درجات فقط: عنوان ضخم، سطر داعم، تفاصيل صغيرة. كل ما زاد العنصر عن ذلك زاد الزحام. إن لم يخدم العنصر الرسالة احذفه.
3) المساحة البيضاء: اترك هوامش واسعة (لا نص ملاصق للحافة) ولا تملأ كل زاوية. الفخامة تأتي من الفراغ.
4) التباين والقراءة: النص الأساسي بتباين لا يقل عن 7:1 مع الخلفية، والنص المميز بلون accent يجب أن يبقى مقروءًا على الخلفية نفسها. لا نص رمادي فاتح على أبيض، ولا ذهبي باهت على كريمي.
5) نظام لون محدد: لون أساسي + لون مميز واحد + محايد. لا أكثر من لونين مميزين. الألوان الداكنة تعطي فخامة، والفاتحة تعطي نظافة، والزاهية تعطي طاقة؛ اربط الاختيار بنشاط العميل وجمهوره.
6) الحروف العربية: لا تباعد حروف (letterSpacing) أبدًا، ولا تمطيط، ولا تكبير الحروف اللاتينية بالإجبار. سطر العنوان لا يزيد عن 3 أسطر. لا تقطع الكلمات. الأرقام والأسعار واضحة وبارزة.
7) الكاروسيل قصة: الشريحة 1 خطّاف قوي (وعد أو سؤال) + دعوة للسحب، الشرائح الوسطى فكرة واحدة لكل شريحة بنفس البنية والترقيم، قبل الأخيرة دليل أو نتيجة أو مثال، الأخيرة دعوة واضحة لخطوة واحدة (احفظ، تواصل، احجز) مع اسم الحساب. من 5 إلى 8 شرائح للمحتوى التعليمي، و3 إلى 5 للعروض.
8) البوست الواحد: رسالة واحدة وزر/دعوة واحدة. العرض يحتاج رقمًا ومدة؛ الإعلان عن دورة يحتاج تاريخًا ومنفعة واضحة؛ المنتج يحتاج صورة وسعرًا.
9) الاتساق: نفس الألوان والخط والزخرفة والزوايا والإطار في كل الشرائح، وأبرز عنصر في نفس المكان تقريبًا حتى يتتبع القارئ العين بسهولة.
10) الصدق: لا تكتب ادعاءات (الأفضل، رقم 1، ضمان، خصم) إلا إن ذكرها العميل. مصداقية العميل أهم من أي جملة لامعة.
11) اللهجة: اكتب بالمستوى الذي طلبه العميل، قصيرًا وحيويًا، بدون حشو، وبإملاء سليم.
12) قبل أن تُسلّم: اسأل نفسك: هل أفهم الرسالة خلال ثلاث ثوانٍ؟ هل يصلح هذا التصميم لنشاط العميل بالتحديد وليس لأي نشاط؟ هل فيه عنصر زائد؟

التخطيطات (layout) وما يستخدمه كل واحد:
${LAYOUT_IDS.map((id) => `- ${id}: ${LAYOUTS[id].hint}. الحقول: ${LAYOUTS[id].uses.join(", ")}`).join("\n")}

الحقول:
kicker (سطر صغير فوق العنوان)، sticker، title، highlight، body، items [{icon,text}]، meta [{icon,text}]، date {day (رقم), month, weekday}، price {value (رقم فقط), old, currency (مثل د.ك), note}، stat {value (مثل 30% أو 2x), label}، badge (شارة قصيرة)، cta (2-3 كلمات)، person {name, role}، photo، imagePrompt، caption.
note (صندوق مميّز بخلفية وإطار، للشهادات والضمانات والميزة اللي تجذب العميل) {text (جملة وحدة واضحة), at: "bl" أسفل اليسار | "br" أسفل اليمين | "bc" بالوسط, look: "royal" ملكي ذهبي | "soft" | "solid"}. إذا طلب العميل إضافة جملة بإطار أو بوكس أو خلفية أو «اطار ملكي» استخدم note ولا تحطها بالحقول العادية. حافظ على علامات الألوان {{#hex|كلمة}} إذا موجودة بالنص كما هي.

الصور (photo):
- "upload:N" لاستخدام صورة العميل رقم N (شوفها وحطها بالتخطيط المناسب).
- "scene:N" مع imagePrompt إنجليزي: صورة إعلانية احترافية لمنتج العميل رقم N نفسه (عباية، علبة، عطر، جهاز...) بمشهد يناسب المجال، والمنتج يبقى مثل ما هو بالضبط. استخدمها لما صورة العميل منتج مصوّر بشكل عادي وتحتاج لمسة احترافية.
- "ai" مع imagePrompt إنجليزي تفصيلي لصورة فوتوغرافية احترافية بدون أي نص أو كتابة، تناسب الموضوع والتخطيط.
- إذا العميل رفع صورة منتج، اكتب وصف المنتج ومزاياه بشكل تسويقي (body وitems) من المعلومات والصورة، بدون اختراع مواصفات ما تبين.
- null إذا التصميم أقوى بدون صورة.` + "\n\n" + RULES_DESIGN_2026;

type Body = {
  tool?: string; info?: string; count?: number; aspect?: DAspect; dialect?: string; photos?: string[]; person?: string;
  useBrand?: boolean; colors?: { bg: string; ink: string; accent: string; soft: string }; bgMode?: "shapes" | "ai"; aiImages?: boolean; industry?: string; ref?: DImg | null; likeWork?: string; jobId?: string; spec?: DesignSpec; instruction?: string; index?: number; prompt?: string;
};
type Raw = Partial<DesignSpec> & Record<string, unknown> & { slides?: (Record<string, unknown> & { photo?: unknown; person?: Record<string, unknown> | null })[] };

async function siteText(url?: string | null) {
  if (!url || !/^https?:\/\//.test(url)) return "";
  try {
    const r = await safeFetch(url, { headers: { "user-agent": "Mozilla/5.0 ShaheenBot" } });
    if (!r?.ok || !(r.headers.get("content-type") ?? "").includes("text/html")) return "";
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
  if (!["export", "save", "stock", "stockadd", "cutout", "subs", "translate"].includes(action)) { const bad = await guardContent(user.id, body, `design/${action}`); if (bad) return bad; }

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
    const count = kind === "bcard" || kind === "invite" ? (Number(body.count) === 1 ? 1 : 2) : kind === "carousel" ? Math.min(10, Math.max(3, Number(body.count) || 5)) : kind === "ads" ? Math.min(4, Math.max(1, Number(body.count) || 2)) : 1;
    const aspect: DAspect = kind === "bcard" ? "card" : kind === "invite" ? "inv" : ASPECTS.includes(body.aspect as DAspect) ? (body.aspect as DAspect) : "4:5";
    const photos = (body.photos ?? []).filter(mine).slice(0, 6);
    const person = mine(body.person) ? body.person! : null;

    const { data: job, error } = await admin.from("jobs")
      .insert({ user_id: user.id, tool_id: toolId, title: info.slice(0, 80), status: "draft", progress: 5, input: { info, count, aspect, kind, photos, person } })
      .select("id").single();
    if (error || !job) return NextResponse.json({ error: "تعذّر إنشاء الطلب." }, { status: 500 });
    const cost = (kind === "post" || kind === "bcard" || kind === "invite" ? 1 : count) * tool.credit_cost;
    const denied = await charge(job.id, cost);
    if (denied) { await admin.from("jobs").delete().eq("id", job.id); return denied; }

    try {
      const { data: kit } = body.useBrand === false ? { data: null } : await admin.from("brand_kits").select("*").eq("user_id", user.id).maybeSingle();
      const site = await siteText(kit?.website);
      const images: { url: string; label: string }[] = [];
      for (const [i, p] of photos.entries()) images.push({ url: await sign("uploads", p), label: `صورة العميل upload:${i}` });
      if (person) images.push({ url: await sign("uploads", person), label: "صورة الشخص (المدرب أو صاحب النشاط) — تنحط تلقائياً في person" });
      for (const p of ((kit?.style_refs ?? []) as string[]).slice(0, 6)) images.push({ url: await sign("uploads", p), label: "مرجع ستايل: بوست سابق يحبه العميل. تعلّم منه الأسلوب والألوان والإحساس (لا تنسخه حرفياً)" });

      // «سوّ مثله»: the chosen showcase work is the style to copy (layout, colors, feel), the content stays the customer's
      const like = await loadLike(body.likeWork);
      if (like) for (const [i, u] of like.images.entries()) images.push({ url: u, label: `مرجع الأسلوب المطلوب${like.images.length > 1 ? ` (${i + 1}/${like.images.length})` : ""}: ${likeText(like)}` });
      const want = kind === "invite"
        ? `دعوة مناسبة ${count === 2 ? "بوجهين (وجه وصفحة تفاصيل)" : "بوجه واحد فقط"}. المقاس 5×7 إنش عمودي.`
        : kind === "bcard"
        ? `بطاقة عمل ${count === 2 ? "بوجهين (وجه وظهر)" : "بوجه واحد فقط"}. المقاس 90×50 مم أفقي.`
        : kind === "carousel"
        ? `كاروسيل من ${count} شرائح: الأولى cover، الأخيرة cta، والوسط فكرة وحدة لكل شريحة (point غالباً، ويمكن quote أو minimal أو bento للتنويع). نفس الألوان والخط لكل الشرائح. caption عام للكاروسيل.`
        : kind === "ads"
          ? `${count} تصاميم إعلانية مختلفة لنفس المنتج، كل واحد بزاوية تسويقية مختلفة (عرض، فائدة، دليل اجتماعي، ندرة...) وبتخطيط مختلف. كل تصميم له caption خاص.`
          : `تصميم بوست واحد. اختر أنسب تخطيط للمحتوى، وحط caption.`;
      // the field: chosen, or read from what the customer wrote; its design pack picks this job's look
      const ind = industryById(body.industry) ?? industryById(await guessIndustry(info));
      const dpack = designPack(ind?.id);
      const dpick = dpack && ind ? designBrief(dpack, ind.label) : null;
      const bgAi = body.bgMode === "ai" && kind === "carousel" && body.aiImages !== false;
      const raw = await claudeVisionJson<Raw>(kind === "invite" ? INVITE_SYSTEM : kind === "bcard" ? BCARD_SYSTEM : SYSTEM,
        `${want}\nالمقاس: ${aspect}\nلهجة النصوص: ${DIALECT[String(body.dialect)] ?? DIALECT.gulf}\n` +
        `الصور المولّدة بالذكاء الاصطناعي: ${body.aiImages === false ? "ممنوعة (استخدم صور العميل أو بدون صورة)" : "مسموحة إذا تفيد التصميم"}\n` +
        (kit ? `هوية العميل: الاسم ${kit.business_name || "غير محدد"}، الألوان ${(kit.colors ?? []).join(", ") || "غير محددة"}، الخط ${kit.font || "اختر أنت"}، الحساب ${kit.handle || kit.instagram || "غير محدد"}${kit.website ? `، الموقع ${kit.website}` : ""}\n` : "") +
        (site ? `من موقع العميل (لتعرف نشاطه وأسلوب كلامه):\n${site}\n` : "") +
        (ind ? `${industryBrief(ind)}\n${dpick?.text ?? ""}\n` : "") +
        `${await trendsFor(ind?.id, kind === "ads" ? "ads" : kind === "carousel" ? "carousel" : kind === "bcard" ? "bcard" : kind === "invite" ? "invite" : "post")}\n` +
        `\nمعلومات العميل:\n${info}\n\n` +
        `أعد JSON: { "font", "deco", "frame", "icons", "colors": {"bg","ink","accent","soft"}, "brand": {"name","handle"}, "caption", ${bgAi ? '"bgStyle": "English, حتى 40 كلمة: أسلوب خلفية واحد موحّد لكل الشرائح (أجواء تجريدية راقية بألوان هوية العميل ومناسبة لمجاله، بدون نص أو أشخاص)", ' : ""}"slides": [ {layout, ...الحقول, "sticker", "photo", "imagePrompt", "caption"} ] }`,
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
      let spec = safeColors(normaliseDesign({ ...raw, ...(cleanColors(body.colors) ? { colors: cleanColors(body.colors) as NonNullable<ReturnType<typeof cleanColors>> } : {}), brand, aspect, deco: raw.deco ?? dpick?.pick.deco, frame: ((raw as { frame?: string }).frame ?? dpick?.pick.frame) as DesignSpec["frame"], industry: ind?.id }, { kind, aspect }));
      await admin.from("jobs").update({ progress: 60 }).eq("id", job.id);

      const gen = await Promise.allSettled(aiWanted.map(async ({ i, ref }) => {
        const p = String(spec.slides[i].imagePrompt);
        if (!ref) return aiPhoto(toolId, job.id, p, aspect);
        return aiPhoto(toolId, job.id, `Professional advertising photo of the exact same product from the reference image (keep its shape, label, logo, colors and details unchanged). Scene: ${p}`, aspect, [await sign("uploads", ref)]);
      }));
      gen.forEach((g, n) => { if (g.status === "fulfilled") spec.slides[aiWanted[n].i].photo = g.value; else console.error("design ai photo", g.reason); });
      // «خلفيات بالذكاء الاصطناعي»: one background per slide; the first sets the scene, the rest continue it (same reference) so the slides read as one picture
      if (bgAi) {
        const style = String((raw as { bgStyle?: unknown }).bgStyle ?? "").slice(0, 320) || `Soft atmospheric abstract background in the colours ${spec.colors.bg} and ${spec.colors.accent}`;
        const n = spec.slides.length;
        const mkBg = (i: number, ref?: string) => aiPhoto(toolId, job.id, `${style}. A full-bleed ${aspect} background for slide ${i + 1} of ${n} of an Instagram carousel. Abstract and atmospheric, no text, no people, no logos, soft and low-contrast, with a calm empty area in the centre for text.${ref ? " Continue the exact same scene, colours, lighting and style as the reference image, as if the camera moved on to the next part of one long panoramic picture." : ""}`, aspect, ref ? [ref] : []);
        let ref: string | undefined;
        try { const first = await mkBg(0); spec.slides[0].bg = first; ref = await sign("results", first.path); } catch (e) { console.error("design ai bg 0", e); }
        const rest = spec.slides.map((_, i) => i).slice(1);
        for (let k = 0; k < rest.length; k += 3) {
          const part = await Promise.allSettled(rest.slice(k, k + 3).map((i) => mkBg(i, ref)));
          part.forEach((g, m) => { if (g.status === "fulfilled") spec.slides[rest[k + m]].bg = g.value; else console.error("design ai bg", g.reason); });
        }
      }
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

      // «first» = what the AI chose, kept to learn what customers change (trends lab)
      await admin.from("jobs").update({ progress: 100, input: { info, count, aspect, kind, photos, person, first: snapshot(spec as unknown as Record<string, unknown>), spec: { ...spec, slides: spec.slides.map((s) => s) } } }).eq("id", job.id);
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
        return { ...s, pos: s.pos ?? old?.pos, hide: s.hide ?? old?.hide, col: s.col ?? old?.col, note: s.note !== undefined && (raw.slides?.[i] as { note?: unknown } | undefined)?.note !== undefined ? s.note : old?.note ?? null, photo: r?.photo === "keep" || r?.photo === undefined ? old?.photo ?? null : null, person: s.person ? { ...s.person, photo: old?.person?.photo ?? null } : null };
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
