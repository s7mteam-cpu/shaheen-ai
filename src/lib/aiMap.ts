/** «مركز الذكاء الاصطناعي»: which built-in models every tool and background task calls (names as written in the code; the admin's «النماذج» choices are applied on top when shown). */
export type Uses = { model: string; what: string };

/** the models a tool calls BESIDES its own main model (the one picked in «الأدوات والأسعار») */
export const TOOL_AI: Record<string, Uses[]> = {
  image: [],
  "product-photo": [],
  post: [{ model: "claude-sonnet-5-5", what: "يكتب خطة التصميم والنصوص" }],
  carousel: [{ model: "claude-sonnet-5-5", what: "يكتب خطة الشرائح والنصوص" }],
  "ad-design": [{ model: "claude-sonnet-5-5", what: "يكتب خطة الإعلان والنصوص" }],
  invitations: [{ model: "claude-sonnet-5-5", what: "يكتب خطة الدعوة" }, { model: "gemini-3-pro-image-preview", what: "الصور (إذا مزوّد الصور Google)" }],
  "business-cards": [{ model: "claude-sonnet-5-5", what: "يكتب خطة الكرت" }],
  "free-post": [{ model: "post-writer", what: "يكتب التصميم كله من الصفر، و«عدّل بالذكاء الاصطناعي»" }],
  "free-deck": [{ model: "post-writer", what: "يكتب كل شرائح العرض من الصفر، و«عدّل بالذكاء الاصطناعي»" }],
  "free-cv": [{ model: "post-writer", what: "يكتب صفحة السيرة الذاتية من الصفر، و«عدّل بالذكاء الاصطناعي»" }],
  "free-card": [{ model: "post-writer", what: "يكتب وجهي بطاقة العمل من الصفر، و«عدّل بالذكاء الاصطناعي»" }],
  "free-ad": [{ model: "post-writer", what: "يكتب الإعلان كله من الصفر، و«عدّل بالذكاء الاصطناعي»" }],
  "free-invite": [{ model: "post-writer", what: "يكتب بطاقة الدعوة كلها من الصفر، و«عدّل بالذكاء الاصطناعي»" }],
  "free-carousel": [{ model: "post-writer", what: "يكتب كل الشرائح من الصفر، و«عدّل بالذكاء الاصطناعي»" }],
  "motion-video": [{ model: "claude-sonnet-5-5", what: "يكتب المشاهد والنص" }, { model: "eleven_v4", what: "التعليق الصوتي" }, { model: "gemini-3-pro-image-preview", what: "رسومات المشاهد (إذا مزوّد الصور Google)" }],
  "real-scenes": [{ model: "claude-sonnet-5-5", what: "يكتب النص ويختار اللقطات" }, { model: "eleven_v4", what: "التعليق الصوتي" }, { model: "gemini-omni-1.1-flash", what: "لقطات بالذكاء الاصطناعي (الخيار الأغلى)" }],
  "site-video": [{ model: "claude-sonnet-5-5", what: "يقرأ الموقع ويكتب الفيديو" }, { model: "eleven_v4", what: "التعليق الصوتي" }],
  "free-motion": [{ model: "claude-sonnet-5-5", what: "المخرج: الخطة والنص والمراجعة الفنية" }, { model: "gemini-4-neon", what: "يكتب كود الفيديو (المحرك الجديد، القوي)" }, { model: "gemini-3.8-flash", what: "يكتب كود الفيديو (المحرك الجديد، السريع)" }, { model: "claude-haiku-5-5", what: "تعبئة النصوص والتعليق" }, { model: "eleven_v4", what: "التعليق الصوتي" }],
  "free-montage": [{ model: "scribe_v1", what: "يفرّغ كلام الفيديو بتوقيت كل كلمة" }, { model: "claude-sonnet-5-5", what: "المخرج: يخطط العناصر وتوقيتها ويراجع" }, { model: "gemini-4-neon", what: "يكتب كود طبقة الغرافيكس" }],
  "anim-video": [{ model: "claude-sonnet-5-5", what: "المخرج: الخطة والنص والمراجعة الفنية" }, { model: "gemini-4-neon", what: "يكتب كود الفيديو (المحرك الجديد، القوي)" }, { model: "gemini-3.8-flash", what: "يكتب كود الفيديو (المحرك الجديد، السريع)" }, { model: "claude-haiku-5-5", what: "تعبئة النصوص والتعليق" }, { model: "eleven_v4", what: "التعليق الصوتي" }],
  "site-free": [{ model: "claude-sonnet-5-5", what: "المخرج: الخطة والنص والمراجعة الفنية" }, { model: "gemini-4-neon", what: "يكتب كود الفيديو (المحرك الجديد، القوي)" }, { model: "gemini-3.8-flash", what: "يكتب كود الفيديو (المحرك الجديد، السريع)" }, { model: "claude-haiku-5-5", what: "تعبئة النصوص والتعليق" }, { model: "eleven_v4", what: "التعليق الصوتي" }],
  "video-editing": [{ model: "scribe_v1", what: "يفرّغ كلام الفيديو" }, { model: "claude-sonnet-5-5", what: "يكتب خطة المونتاج" }, { model: "eleven_v4", what: "التعليق الصوتي" }, { model: "fal-ai/birefnet/v2", what: "إزالة خلفية الصور" }],
  "product-video": [],
  "avatar-video": [{ model: "eleven_v4", what: "صوت المتحدث" }],
  voice: [{ model: "claude-haiku-5-5", what: "يجهّز النص للنطق" }],
  nasheed: [],
  "quran-video": [],
  presentations: [{ model: "claude-sonnet-5-5", what: "يكتب الهيكل والشرائح" }, { model: "gemini-3-pro-image-preview", what: "صور الشرائح (إذا مزوّد الصور Google)" }],
  cv: [{ model: "claude-sonnet-5-5", what: "يكتب السيرة ويصقل النصوص" }],
  "brand-identity": [{ model: "claude-sonnet-5-5", what: "يكتب الهويات المقترحة" }, { model: "gemini-3-pro-image-preview", what: "رسمة الشعار (إذا مزوّد الصور Google)" }],
  "brand-plan": [{ model: "claude-haiku-5-5", what: "يكتب خطة المحتوى" }],
};

/** things that are not tools but call AI all the time */
export const BACKGROUND_AI: { name: string; model: string; what: string; where?: string }[] = [
  { name: "«كلم شاهين» (المساعد)", model: "chat", what: "يرد على العملاء والزوار", where: "تختاره من القسم 4 تحت" },
  { name: "الكتابة و«ألهمني»", model: "copy", what: "النصوص التسويقية والأفكار", where: "تختاره من القسم 4 تحت" },
  { name: "فحص المحتوى المخالف", model: "claude-haiku-5-5", what: "يفحص كل طلب قبل خصم الريش" },
  { name: "ترجمة الموقع للإنجليزي", model: "claude-haiku-5-5", what: "يترجم نصوص الأدمن تلقائياً" },
  { name: "معرفة مجال العميل", model: "claude-haiku-5-5", what: "يخمّن المجال من وصف الطلب" },
  { name: "تجهيز نص الصوت", model: "claude-haiku-5-5", what: "يكتب النص بإملاء ينطقه الصوت صح" },
  { name: "الترندات الأسبوعية", model: "claude-haiku-5-5", what: "يبحث عن ترندات المجالات (مع بحث الويب)" },
  { name: "تفريغ الكلام (المايك)", model: "scribe_v2", what: "يحوّل صوت العميل لنص في «كلم شاهين»" },
];

export const familyOfModel = (m: string): "claude" | "google" | "elevenlabs" | "fal" | null =>
  /^claude-|^post-writer$|^chat$|^copy$/.test(m) ? "claude" : /^(gemini|veo|imagen)-/.test(m) ? "google" : /^(eleven|scribe)_|^music$/.test(m) ? "elevenlabs" : /^fal-ai\//.test(m) ? "fal" : null;
