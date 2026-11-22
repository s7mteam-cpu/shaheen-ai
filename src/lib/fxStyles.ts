/** «مونتاج مبتكر»: graphics styles drawn by code over the customer's own video. The ids must match worker/fxstyles.mjs. "desc" = «من وصفي». */
export const FX_STYLES = [
  { id: "paper", icon: "✂️", name: "قصاصات ورق", hint: "كولاج ورق ممزق وشريط لاصق" },
  { id: "news", icon: "📰", name: "قصاصات جرائد", hint: "عناوين على ورق جرائد وتمييز بقلم" },
  { id: "doc", icon: "🗺️", name: "وثائقي تحليلي", hint: "خرائط وأسهم ودوائر حمراء" },
  { id: "bold", icon: "💥", name: "ريلز جريء", hint: "كلمات ضخمة وأرقام وإيقاع سريع" },
  { id: "clean", icon: "🤍", name: "مينيمال أنيق", hint: "شريط اسم وبطاقات زجاجية هادئة" },
  { id: "sketch", icon: "✏️", name: "خربشات يدوية", hint: "أسهم ودوائر تنرسم بقلم" },
  { id: "comic", icon: "💬", name: "كوميكس", hint: "فقاعات ومؤثرات مرسومة" },
  { id: "neon", icon: "🌃", name: "نيون", hint: "كلمات وأشكال مضيئة" },
  { id: "tech", icon: "🛰️", name: "تقني HUD", hint: "بطاقات بيانات وخطوط استهداف" },
  { id: "luxe", icon: "👑", name: "فاخر ذهبي", hint: "خطوط ذهبية وزخارف راقية" },
  { id: "retro", icon: "📼", name: "ريترو VHS", hint: "ألوان السبعينات وتشويش خفيف" },
  { id: "pop", icon: "🎉", name: "مرح ملوّن", hint: "ستيكرات وكونفيتي وحركة مطاطية" },
  { id: "podcast", icon: "🎙️", name: "بودكاست", hint: "شريط اسم وبطاقات اقتباس" },
  { id: "edu", icon: "📚", name: "شرح تعليمي", hint: "نقاط مرقمة وتوضيحات" },
] as const;
export const FX_IDS: string[] = FX_STYLES.map((s) => s.id);
/** the longest video the tool takes, in seconds, and the lengths shown to the customer */
export const FX_MAX_SECONDS = 300;
