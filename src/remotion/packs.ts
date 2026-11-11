/**
 * Industry packs: each field (from the same list as the post designer) gets its own library of scenes, motion,
 * looks and ready video recipes. The AI uses only the chosen field's pack. Bump `version` when a pack grows.
 */
import { INDUSTRIES } from "@/design/industries";
import type { BoardStyle, CaptionStyle, Grade, GraphicKind, Layout, TitleStyle, Transition } from "./montage";
import type { IllusStyle } from "./styles";

export type Recipe = { name: string; flow: string };            // a ready video idea: the order of scenes
export type Pack = {
  id: string; version: number; updated: string;
  signature: GraphicKind[];   // scenes made for this field
  scenes: GraphicKind[];      // everything the AI may use (signature + shared)
  transitions: Transition[]; grades: Grade[]; captions: CaptionStyle[]; titles: TitleStyle[];
  boards: BoardStyle[]; illus: IllusStyle[]; layouts: Layout[];
  music: string; tone: string; ideas: string[]; recipes: Recipe[];
};

const SHARED: GraphicKind[] = ["headline", "icon", "arrow", "scene", "text3d", "burst", "contact"];
const uniq = <T,>(a: T[]) => [...new Set(a)];

type Draft = Omit<Pack, "id" | "scenes" | "version" | "updated"> & { version?: number; updated?: string };
const P = (d: Draft) => d;

// Shared looks per group (each field below can override)
const EDU = { transitions: ["slide", "whip", "zoom", "dip"] as Transition[], grades: ["natural", "vivid"] as Grade[], captions: ["highlight", "karaoke", "box"] as CaptionStyle[], titles: ["kinetic", "marker", "typewriter", "editorial"] as TitleStyle[], layouts: ["split", "dynamic", "circle", "card"] as Layout[] };
const FOOD = { transitions: ["whip", "zoom", "slide", "flash"] as Transition[], grades: ["pop", "vivid", "warm", "sunset"] as Grade[], captions: ["outline", "pop", "highlight"] as CaptionStyle[], titles: ["kinetic", "pill", "lower", "marker"] as TitleStyle[], layouts: ["full", "dynamic", "corner"] as Layout[] };
const CARS = { transitions: ["shake", "whip", "glitch", "zoom"] as Transition[], grades: ["reels", "cinematic", "cool"] as Grade[], captions: ["outline", "pop", "box"] as CaptionStyle[], titles: ["kinetic", "lower", "pill"] as TitleStyle[], layouts: ["full", "dynamic", "corner"] as Layout[] };
const LUX = { transitions: ["dip", "blur", "slide"] as Transition[], grades: ["luxury", "cinematic", "warm"] as Grade[], captions: ["minimal", "box"] as CaptionStyle[], titles: ["editorial", "typewriter", "lower"] as TitleStyle[], layouts: ["full", "card"] as Layout[] };
const HEALTH = { transitions: ["slide", "dip", "zoom"] as Transition[], grades: ["natural", "vivid", "cool"] as Grade[], captions: ["box", "highlight", "karaoke"] as CaptionStyle[], titles: ["editorial", "kinetic", "lower"] as TitleStyle[], layouts: ["card", "split", "dynamic", "full"] as Layout[] };
const SHOP = { transitions: ["whip", "zoom", "flash", "slide"] as Transition[], grades: ["pop", "reels", "vivid"] as Grade[], captions: ["highlight", "pop", "outline"] as CaptionStyle[], titles: ["kinetic", "pill", "lower"] as TitleStyle[], layouts: ["full", "dynamic", "corner"] as Layout[] };
const SERV = { transitions: ["slide", "whip", "dip", "zoom"] as Transition[], grades: ["natural", "vivid", "cinematic"] as Grade[], captions: ["box", "highlight", "karaoke"] as CaptionStyle[], titles: ["editorial", "kinetic", "lower"] as TitleStyle[], layouts: ["full", "card", "dynamic"] as Layout[] };

const DRAFTS: Record<string, Draft> = {
  // ---------- تعليم وتدريب ----------
  education: P({ ...EDU, signature: ["definition", "steps", "quiz", "mindmap", "timeline", "table", "compare", "checklist"], boards: ["notebook", "grid", "blueprint", "soft", "dots"], illus: ["corporate", "flat", "doodle", "blueprint"],
    music: "calm curious study music, light piano and plucks", tone: "واضح ومرتّب، فكرة وحدة بكل مشهد",
    ideas: ["المصطلحات definition مع marker", "الخطوات steps", "اختبار سريع quiz بالنهاية", "خريطة الموضوع mindmap بالبداية"],
    recipes: [{ name: "شرح درس", flow: "headline سؤال ← definition ← steps ← compare ← quiz ← arrow" }, { name: "إعلان دورة", flow: "headline ← checklist (وش بتتعلم) ← specs (المدة والأيام) ← price ← appointment ← contact" }, { name: "نتائج الطلاب", flow: "headline ← counter ← bars ← testimonial ← arrow" }, { name: "خريطة منهج", flow: "mindmap ← timeline ← table ← arrow" }] }),
  coach: P({ ...EDU, transitions: ["whip", "shake", "zoom", "slide"], grades: ["reels", "cinematic", "vivid"], captions: ["pop", "outline", "highlight"], signature: ["quote", "steps", "pyramid", "compare", "counter", "line", "testimonial"], boards: ["night", "soft", "sunrise"], illus: ["neon", "cinematic", "corporate"],
    music: "motivational cinematic build-up, deep drums", tone: "قوي وتحفيزي بدون مبالغة",
    ideas: ["الجملة الذهبية quote", "هرم الأولويات pyramid", "النمو line", "العادة الغلط مقابل الصح compare"],
    recipes: [{ name: "نصيحة تحفيزية", flow: "headline صادم ← compare ← steps ← quote ← arrow" }, { name: "إعلان ورشة", flow: "headline ← checklist ← specs ← countdown ← appointment ← contact" }, { name: "قصة نجاح عميل", flow: "scene ← line ← counter ← testimonial ← arrow" }] }),
  teacher: P({ ...EDU, signature: ["equation", "plot", "geometry", "fraction", "fillblank", "truefalse", "vocab", "quiz"], boards: ["chalk", "notebook", "grid", "pastel"], illus: ["doodle", "watercolor", "flat"],
    music: "gentle playful study music", tone: "دافئ ومطمّن للأهالي، بسيط للطالب",
    ideas: ["الحساب equation خطوة خطوة", "الكسور fraction", "الدوال plot", "الهندسة geometry", "كلمات اللغة vocab", "تمرين fillblank بالنهاية"],
    recipes: [{ name: "درس رياضيات", flow: "headline سؤال ← equation ← fraction أو geometry ← fillblank ← burst" }, { name: "درس لغة", flow: "vocab ← vocab ← quiz ← truefalse ← arrow" }, { name: "إعلان دروس خصوصية", flow: "headline ← checklist (المواد) ← specs (المراحل) ← price ← appointment ← contact" }] }),
  kids: P({ ...EDU, transitions: ["spin", "zoom", "whip"], grades: ["pop", "vivid"], captions: ["pop", "highlight"], titles: ["kinetic", "pill"], signature: ["icon", "counter", "quiz", "confetti", "burst", "dotgrid", "truefalse"], boards: ["pastel", "dots", "sunrise"], illus: ["clay", "watercolor", "gulf-cartoon"],
    music: "cheerful playful kids music, ukulele and xylophone", tone: "مبهج ولطيف، جمل قصيرة جداً",
    ideas: ["أيقونات كبيرة لكل كلمة", "احتفال confetti لما يجاوب صح", "أسئلة سهلة quiz"],
    recipes: [{ name: "درس للأطفال", flow: "scene ← icon ← counter ← quiz ← confetti" }, { name: "إعلان مخيم", flow: "scene ← checklist ← specs ← price ← contact" }] }),
  // ---------- أكل وشرب ----------
  restaurant: P({ ...FOOD, signature: ["menu", "price", "offer", "rating", "delivery", "hours", "countdown"], boards: ["night", "sunrise", "paper"], illus: ["cinematic", "flat", "gulf-cartoon"],
    music: "upbeat appetizing groove, warm funky bass", tone: "شهي ومغري، يوصف الطعم والريحة",
    ideas: ["الطبق scene أو لقطة قريبة", "العرض offer أو price", "التقييم rating", "التوصيل delivery", "الموقع والساعات contact و hours"],
    recipes: [{ name: "عرض اليوم", flow: "headline ← scene الطبق ← price ← countdown ← delivery ← contact" }, { name: "المنيو", flow: "headline ← menu ← menu ← rating ← contact" }, { name: "طبق جديد", flow: "text3d ← scene ← checklist (المكونات) ← price ← arrow" }, { name: "آراء الزباين", flow: "rating ← testimonial ← testimonial ← hours ← contact" }] }),
  cafe: P({ ...FOOD, transitions: ["blur", "slide", "dip"], grades: ["warm", "sunset", "luxury"], captions: ["minimal", "highlight"], signature: ["menu", "price", "hours", "rating", "offer"], boards: ["paper", "sunrise", "sketch"], illus: ["watercolor", "flat", "doodle"],
    music: "cozy lofi coffee shop music", tone: "هادي وعصري",
    ideas: ["مشروب الموسم scene", "المنيو menu", "ساعات العمل hours"],
    recipes: [{ name: "مشروب الموسم", flow: "scene ← headline ← price ← hours ← contact" }, { name: "منيو الكافيه", flow: "menu ← rating ← contact" }] }),
  sweets: P({ ...FOOD, grades: ["sunset", "pop", "warm"], signature: ["menu", "price", "offer", "countdown", "appointment", "delivery"], boards: ["pastel", "paper", "sunrise"], illus: ["watercolor", "clay", "flat"],
    music: "sweet light pop music, bells", tone: "حلو ولطيف ومناسبات",
    ideas: ["بوكس المناسبات menu", "الطلب المسبق appointment", "التوصيل delivery"],
    recipes: [{ name: "بوكس العيد", flow: "scene ← menu ← price ← appointment ← delivery ← contact" }, { name: "عرض محدود", flow: "offer ← countdown ← contact" }] }),
  // ---------- سيارات وخدمات ----------
  tires: P({ ...CARS, signature: ["price", "offer", "specs", "delivery", "hours", "timer"], boards: ["night", "blueprint"], illus: ["cinematic", "flat"],
    music: "energetic trap beat", tone: "مباشر وسريع وموثوق",
    ideas: ["خدمة متنقلة delivery", "السرعة timer", "المقاسات specs"],
    recipes: [{ name: "خدمة متنقلة", flow: "headline ← timer ← delivery ← price ← contact" }, { name: "عرض تواير", flow: "offer ← specs ← price ← countdown ← contact" }] }),
  garage: P({ ...CARS, signature: ["checklist", "specs", "price", "appointment", "beforeafter", "timer"], boards: ["blueprint", "night", "grid"], illus: ["blueprint", "glass3d", "cinematic"],
    music: "rock driving beat", tone: "فني وموثوق",
    ideas: ["الفحص checklist", "قبل وبعد beforeafter", "الحجز appointment"],
    recipes: [{ name: "فحص قبل السفر", flow: "headline ← checklist ← price ← appointment ← contact" }, { name: "قبل وبعد", flow: "beforeafter ← testimonial ← contact" }] }),
  carwash: P({ ...CARS, transitions: ["whip", "zoom", "flash"], grades: ["pop", "reels", "cool"], signature: ["beforeafter", "price", "offer", "specs", "appointment", "rating"], boards: ["night", "blueprint"], illus: ["cinematic", "glass3d"],
    music: "energetic electronic beat", tone: "لمعة ونظافة وعناية",
    ideas: ["قبل وبعد beforeafter", "الباقات menu أو price", "الضمان icon shield"],
    recipes: [{ name: "تلميع نانو", flow: "beforeafter ← specs ← price ← appointment ← contact" }, { name: "باقات الغسيل", flow: "menu ← offer ← contact" }] }),
  // ---------- بناء وعقار ----------
  contracting: P({ ...SERV, grades: ["cinematic", "natural"], signature: ["timeline", "specs", "counter", "beforeafter", "steps", "testimonial"], boards: ["blueprint", "grid", "night"], illus: ["blueprint", "cinematic", "flat"],
    music: "confident corporate build-up", tone: "قوي ومهني، خبرة والتزام بالمواعيد",
    ideas: ["مراحل التنفيذ timeline", "سنوات الخبرة counter", "قبل وبعد beforeafter"],
    recipes: [{ name: "مشروع منجز", flow: "scene ← timeline ← beforeafter ← testimonial ← contact" }, { name: "خدماتنا", flow: "headline ← steps ← counter ← contact" }] }),
  realestate: P({ ...LUX, signature: ["specs", "price", "globe", "appointment", "contact", "counter"], boards: ["night", "soft", "paper"], illus: ["cinematic", "glass3d", "terrain"],
    music: "elegant cinematic real estate music", tone: "فخم وواثق",
    ideas: ["المواصفات specs (غرف، مساحة، حمامات)", "السعر price", "الموقع contact مع pin", "المعاينة appointment"],
    recipes: [{ name: "عقار للبيع", flow: "scene ← specs ← price ← appointment ← contact" }, { name: "مشروع سكني", flow: "text3d ← specs ← timeline ← contact" }] }),
  interior: P({ ...LUX, signature: ["beforeafter", "steps", "price", "appointment", "testimonial"], boards: ["paper", "soft", "sketch"], illus: ["watercolor", "flat", "cinematic"],
    music: "calm elegant ambient", tone: "راقي وهادي",
    ideas: ["قبل وبعد beforeafter", "مراحل التصميم steps"],
    recipes: [{ name: "تحويل مجلس", flow: "beforeafter ← steps ← testimonial ← appointment ← contact" }] }),
  // ---------- جمال وأزياء ----------
  abaya: P({ ...LUX, signature: ["price", "offer", "specs", "countdown", "delivery"], boards: ["paper", "soft", "night"], illus: ["watercolor", "flat"],
    music: "chic fashion runway beat", tone: "أنيق وفخم، يوصف القماش والتفصيل",
    ideas: ["تفاصيل القماش specs", "الكمية المحدودة countdown"],
    recipes: [{ name: "تشكيلة جديدة", flow: "scene ← specs ← price ← countdown ← contact" }] }),
  salon: P({ ...LUX, transitions: ["blur", "slide", "dip"], signature: ["beforeafter", "menu", "price", "appointment", "rating", "offer"], boards: ["pastel", "soft", "sunrise"], illus: ["watercolor", "flat"],
    music: "elegant soft pop, airy", tone: "ناعم وأنثوي ومريح",
    ideas: ["قبل وبعد beforeafter", "قائمة الخدمات menu", "حجز appointment"],
    recipes: [{ name: "باكج العروس", flow: "scene ← menu ← price ← appointment ← contact" }, { name: "قبل وبعد", flow: "beforeafter ← rating ← appointment" }] }),
  perfume: P({ ...LUX, signature: ["price", "offer", "countdown", "quote", "specs"], boards: ["night", "paper"], illus: ["cinematic", "glow", "glass3d"],
    music: "luxurious oriental ambient with oud", tone: "فاخر وشاعري",
    ideas: ["المكونات specs (الأصل، التولة)", "كمية محدودة countdown"],
    recipes: [{ name: "عطر جديد", flow: "scene ← quote ← specs ← price ← countdown ← contact" }] }),
  jewelry: P({ ...LUX, signature: ["price", "specs", "offer", "countdown"], boards: ["night", "soft"], illus: ["cinematic", "glow"],
    music: "luxury minimal piano", tone: "فخامة هادئة",
    ideas: ["العيار والوزن specs", "السعر price"],
    recipes: [{ name: "قطعة جديدة", flow: "scene ← specs ← price ← contact" }] }),
  // ---------- صحة ورياضة ----------
  clinic: P({ ...HEALTH, signature: ["checklist", "compare", "truefalse", "steps", "appointment", "beforeafter", "donut", "testimonial"], boards: ["soft", "dots", "paper"], illus: ["corporate", "flat", "watercolor"],
    music: "calm reassuring ambient", tone: "مطمّن وعلمي وبسيط، بدون تخويف",
    ideas: ["خرافة وحقيقة truefalse", "خطوات العلاج steps", "الحجز appointment", "قبل وبعد beforeafter"],
    recipes: [{ name: "نصيحة طبية", flow: "headline سؤال ← truefalse ← checklist ← appointment ← contact" }, { name: "عرض العيادة", flow: "offer ← price ← appointment ← contact" }, { name: "قبل وبعد", flow: "beforeafter ← testimonial ← appointment" }] }),
  gym: P({ ...HEALTH, transitions: ["shake", "whip", "zoom", "glitch"], grades: ["reels", "pop", "cinematic"], captions: ["pop", "outline"], titles: ["kinetic", "pill"], layouts: ["dynamic", "full", "corner"], signature: ["counter", "timer", "steps", "line", "beforeafter", "price", "offer"], boards: ["night", "soft"], illus: ["neon", "cinematic"],
    music: "high energy workout trap beat", tone: "طاقة وحماس",
    ideas: ["العدّات counter", "مدة التمرين timer", "التحول beforeafter", "الاشتراك price"],
    recipes: [{ name: "تمرين اليوم", flow: "headline ← steps ← timer ← counter ← arrow" }, { name: "عرض اشتراك", flow: "offer ← specs ← price ← countdown ← contact" }, { name: "قصة تحول", flow: "beforeafter ← line ← testimonial ← contact" }] }),
  nutrition: P({ ...HEALTH, signature: ["bars", "donut", "compare", "checklist", "menu", "price", "truefalse"], boards: ["soft", "paper", "dots"], illus: ["watercolor", "flat"],
    music: "fresh light acoustic pop", tone: "صحي وخفيف ومحفّز",
    ideas: ["السعرات bars", "النسب donut", "الخرافات truefalse", "منيو الاشتراك menu"],
    recipes: [{ name: "معلومة غذائية", flow: "headline ← bars ← donut ← truefalse ← arrow" }, { name: "اشتراك وجبات", flow: "menu ← price ← delivery ← contact" }] }),
  // ---------- متاجر وتقنية ----------
  store: P({ ...SHOP, signature: ["price", "offer", "countdown", "delivery", "rating", "testimonial", "specs"], boards: ["soft", "night", "dots"], illus: ["flat", "glass3d", "clay"],
    music: "upbeat catchy commercial pop", tone: "مباشر وعروض واضحة",
    ideas: ["الخصم offer", "السعر price", "العرض ينتهي countdown", "التوصيل delivery", "التقييم rating"],
    recipes: [{ name: "عرض خصم", flow: "offer ← price ← countdown ← delivery ← arrow" }, { name: "منتج جديد", flow: "text3d ← specs ← price ← rating ← arrow" }, { name: "آراء العملاء", flow: "rating ← testimonial ← testimonial ← arrow" }] }),
  electronics: P({ ...SHOP, transitions: ["glitch", "whip", "zoom"], grades: ["cool", "reels", "cinematic"], signature: ["specs", "price", "offer", "compare", "cube", "countdown"], boards: ["night", "blueprint"], illus: ["glass3d", "neon", "cinematic"],
    music: "modern tech electronic beat", tone: "تقني وعصري",
    ideas: ["المواصفات specs", "مقارنة compare", "مكعب cube للمزايا"],
    recipes: [{ name: "جهاز جديد", flow: "text3d ← cube ← specs ← price ← arrow" }, { name: "مقارنة", flow: "compare ← table ← price ← arrow" }] }),
  tech: P({ ...SHOP, transitions: ["glitch", "slide", "whip"], grades: ["cool", "cinematic"], captions: ["highlight", "box"], layouts: ["split", "dynamic", "full"], signature: ["flow", "steps", "mindmap", "line", "counter", "cube", "globe", "dotgrid"], boards: ["night", "blueprint", "grid"], illus: ["glass3d", "neon", "corporate"],
    music: "minimal synth tech pulse", tone: "ذكي وواضح",
    ideas: ["سير العمل flow", "النمو line", "انتشار عالمي globe"],
    recipes: [{ name: "كيف يشتغل", flow: "headline ← flow ← steps ← counter ← arrow" }, { name: "إطلاق تطبيق", flow: "text3d ← cube ← specs ← globe ← arrow" }] }),
  // ---------- خدمات ----------
  cleaning: P({ ...SERV, signature: ["beforeafter", "checklist", "price", "appointment", "menu", "rating"], boards: ["soft", "dots"], illus: ["flat", "clay"],
    music: "fresh upbeat pop", tone: "نظيف وموثوق وسريع",
    ideas: ["قبل وبعد beforeafter", "اللي يشمله checklist", "الحجز appointment"],
    recipes: [{ name: "تنظيف شامل", flow: "beforeafter ← checklist ← price ← appointment ← contact" }] }),
  travel: P({ ...SERV, transitions: ["whip", "slide", "zoom"], grades: ["sunset", "vivid", "cinematic"], signature: ["globe", "timeline", "checklist", "price", "countdown", "specs"], boards: ["sunrise", "night"], illus: ["cinematic", "watercolor", "terrain"],
    music: "uplifting travel vlog music", tone: "حماسي وحالم",
    ideas: ["الوجهة globe", "برنامج الرحلة timeline", "الشامل checklist"],
    recipes: [{ name: "باكج رحلة", flow: "scene ← globe ← timeline ← checklist ← price ← countdown ← contact" }] }),
  law: P({ ...SERV, grades: ["cinematic", "natural"], captions: ["box", "minimal"], signature: ["checklist", "steps", "compare", "truefalse", "quote", "appointment"], boards: ["paper", "night"], illus: ["flat", "corporate"],
    music: "serious calm corporate", tone: "رصين وواضح",
    ideas: ["حقوقك checklist", "الإجراءات steps", "معلومة غلط truefalse"],
    recipes: [{ name: "معلومة قانونية", flow: "headline سؤال ← truefalse ← steps ← appointment ← contact" }] }),
  events: P({ ...LUX, signature: ["countdown", "menu", "price", "confetti", "testimonial", "appointment"], boards: ["sunrise", "paper", "night"], illus: ["watercolor", "glow", "cinematic"],
    music: "romantic elegant strings", tone: "فرح وأناقة",
    ideas: ["العد التنازلي للمناسبة countdown", "الباقات menu", "احتفال confetti"],
    recipes: [{ name: "باقات المناسبات", flow: "scene ← menu ← price ← appointment ← contact" }, { name: "دعوة", flow: "text3d ← countdown ← contact ← confetti" }] }),
  photography: P({ ...LUX, signature: ["beforeafter", "menu", "price", "appointment", "rating"], boards: ["night", "paper"], illus: ["cinematic", "flat"],
    music: "artistic chill beat", tone: "فني وبسيط",
    ideas: ["قبل وبعد التعديل beforeafter", "الباقات menu"],
    recipes: [{ name: "باقات التصوير", flow: "scene ← menu ← price ← appointment ← contact" }] }),
  other: P({ ...SERV, signature: ["steps", "checklist", "counter", "testimonial", "price", "offer"], boards: ["soft", "night", "paper"], illus: ["flat", "corporate", "gulf-cartoon"],
    music: "modern friendly corporate music", tone: "احترافي وواضح",
    ideas: ["الخدمات checklist", "الخطوات steps", "الأرقام counter"],
    recipes: [{ name: "تعريف بالنشاط", flow: "headline ← checklist ← counter ← testimonial ← contact" }, { name: "عرض", flow: "offer ← price ← countdown ← contact" }] }),
};


// v1 completion: more recipes, motion and looks so every pack reaches the target.
type Extra = Partial<Pick<Pack, "signature" | "transitions" | "illus" | "boards" | "recipes">>;
const EXTRA: Record<string, Extra> = {
  kids: { transitions: ["slide"], recipes: [{ name: "تعلّم الأرقام", flow: "counter ← dotgrid ← quiz ← confetti" }] },
  cafe: { signature: ["countdown", "testimonial"], transitions: ["zoom"], recipes: [{ name: "عرض الصباح", flow: "headline ← offer ← countdown ← hours ← contact" }] },
  sweets: { recipes: [{ name: "آراء الزباين", flow: "rating ← testimonial ← menu ← contact" }] },
  tires: { illus: ["glass3d"], boards: ["grid"], recipes: [{ name: "اختيار التاير الصح", flow: "compare ← specs ← checklist ← contact" }] },
  garage: { recipes: [{ name: "علامات الخطر", flow: "headline ← truefalse ← checklist ← appointment ← contact" }] },
  carwash: { transitions: ["slide"], illus: ["flat"], boards: ["soft"], recipes: [{ name: "عرض الأسبوع", flow: "offer ← price ← countdown ← contact" }] },
  contracting: { recipes: [{ name: "أرقامنا", flow: "counter ← counter ← testimonial ← contact" }] },
  realestate: { transitions: ["zoom"], recipes: [{ name: "لماذا هالموقع", flow: "globe ← checklist ← specs ← contact" }] },
  interior: { signature: ["specs"], transitions: ["zoom"], recipes: [{ name: "باقات التصميم", flow: "menu ← price ← appointment ← contact" }, { name: "نصيحة ديكور", flow: "headline ← compare ← steps ← arrow" }] },
  abaya: { signature: ["rating"], transitions: ["zoom"], illus: ["cinematic"], recipes: [{ name: "عرض محدود", flow: "offer ← countdown ← delivery ← contact" }, { name: "آراء العميلات", flow: "rating ← testimonial ← contact" }] },
  salon: { transitions: ["zoom"], illus: ["clay"], recipes: [{ name: "عرض الأسبوع", flow: "offer ← menu ← countdown ← appointment" }] },
  perfume: { signature: ["rating"], transitions: ["zoom"], boards: ["sunrise"], recipes: [{ name: "كمية محدودة", flow: "text3d ← countdown ← price ← contact" }, { name: "آراء", flow: "rating ← testimonial ← contact" }] },
  jewelry: { signature: ["rating", "testimonial"], transitions: ["zoom"], illus: ["glass3d"], boards: ["paper"], recipes: [{ name: "عرض الذهب", flow: "offer ← price ← countdown ← contact" }, { name: "هدية مناسبة", flow: "scene ← specs ← price ← delivery" }] },
  clinic: { transitions: ["whip"] },
  gym: { illus: ["clay"], boards: ["sunrise"] },
  nutrition: { transitions: ["whip"], illus: ["clay"], recipes: [{ name: "قبل وبعد", flow: "beforeafter ← line ← testimonial ← contact" }] },
  electronics: { transitions: ["slide"], boards: ["grid"], recipes: [{ name: "عرض اليوم", flow: "offer ← price ← countdown ← delivery" }] },
  tech: { transitions: ["zoom"], recipes: [{ name: "قصة نمو", flow: "line ← counter ← globe ← testimonial ← arrow" }] },
  cleaning: { illus: ["corporate"], boards: ["sunrise"], recipes: [{ name: "باقات التنظيف", flow: "menu ← offer ← appointment ← contact" }, { name: "آراء العملاء", flow: "rating ← testimonial ← contact" }] },
  travel: { transitions: ["dip"], boards: ["paper"], recipes: [{ name: "وجهة الموسم", flow: "scene ← specs ← price ← contact" }, { name: "نصائح السفر", flow: "headline ← checklist ← steps ← arrow" }] },
  law: { illus: ["doodle"], boards: ["soft"], recipes: [{ name: "خطوات القضية", flow: "timeline ← steps ← appointment ← contact" }, { name: "حقوقك", flow: "headline ← checklist ← quote ← contact" }] },
  events: { transitions: ["zoom"], recipes: [{ name: "آراء العملاء", flow: "rating ← testimonial ← contact" }] },
  photography: { signature: ["countdown"], transitions: ["zoom"], illus: ["watercolor"], boards: ["soft"], recipes: [{ name: "عرض جلسات", flow: "offer ← menu ← countdown ← appointment" }, { name: "آراء", flow: "rating ← testimonial ← contact" }] },
  other: { recipes: [{ name: "أسئلة شائعة", flow: "headline ← truefalse ← checklist ← contact" }] },
};

export const PACKS: Pack[] = INDUSTRIES.map((ind) => {
  const base = DRAFTS[ind.id] ?? DRAFTS.other;
  const x = EXTRA[ind.id] ?? {};
  const d = { ...base, signature: uniq([...base.signature, ...(x.signature ?? [])]), transitions: uniq([...base.transitions, ...(x.transitions ?? [])]), illus: uniq([...base.illus, ...(x.illus ?? [])]), boards: uniq([...base.boards, ...(x.boards ?? [])]), recipes: [...base.recipes, ...(x.recipes ?? [])] };
  return { id: ind.id, version: d.version ?? 1, updated: d.updated ?? "2026-11-11", ...d, scenes: uniq([...d.signature, ...SHARED]) };
});
export const packById = (id?: string | null) => PACKS.find((p) => p.id === id);

/** What the AI is told: this field's library only. */
export function packBrief(p: Pack, label: string) {
  return `مجال العميل: ${label} (حزمة الإصدار ${p.version}).
استخدم فقط هذي المشاهد (graphics.kind): ${p.scenes.join(", ")} — والمشاهد الخاصة بالمجال (${p.signature.join(", ")}) هي الأهم.
الانتقالات المسموحة: ${p.transitions.join(", ")}. الألوان (grade): ${p.grades.join(", ")}. الترجمة: ${p.captions.join(", ")}. العناوين: ${p.titles.join(", ")}. الخلفيات (board): ${p.boards.join(", ")}. ستايلات الرسم (illus): ${p.illus.join(", ")}. الأشكال (layout): ${p.layouts.join(", ")}.
الموسيقى: ${p.music}. النبرة: ${p.tone}. أفكار: ${p.ideas.join("؛ ")}.
فيديوهات جاهزة (اختر الأنسب لطلب العميل أو امزج، ولا تكررها حرفياً لكل عميل): ${p.recipes.map((r) => `«${r.name}»: ${r.flow}`).join(" | ")}.`;
}

/** Counts for the admin report, and what a pack still lacks. */
export function packReport(p: Pack) {
  const gaps: string[] = [];
  if (p.signature.length < 6) gaps.push(`مشاهد خاصة قليلة (${p.signature.length}) — الهدف 6 أو أكثر`);
  if (p.recipes.length < 3) gaps.push(`فيديوهات جاهزة قليلة (${p.recipes.length}) — الهدف 3 أو أكثر`);
  if (p.transitions.length < 4) gaps.push(`انتقالات قليلة (${p.transitions.length})`);
  if (p.illus.length < 3) gaps.push(`ستايلات رسم قليلة (${p.illus.length})`);
  if (p.boards.length < 3) gaps.push(`خلفيات قليلة (${p.boards.length})`);
  return { scenes: p.scenes.length, signature: p.signature.length, transitions: p.transitions.length, grades: p.grades.length, captions: p.captions.length, boards: p.boards.length, illus: p.illus.length, recipes: p.recipes.length, gaps };
}
