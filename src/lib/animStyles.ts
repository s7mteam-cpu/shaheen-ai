/** «ستايل الأنيميشن»: drawing styles the customer can pick for an innovative video. The same scene is drawn by code (SVG + CSS) in the chosen look.
 *  The ids must match worker/animstyles.mjs (the worker holds what each style means for the designer model). */
export const ANIM_STYLES = [
  { id: "flat", icon: "🟦", name: "فلات فيكتور", hint: "أشكال مسطحة نظيفة وألوان واضحة" },
  { id: "line", icon: "✏️", name: "خطوط بسيطة", hint: "رسم بخط واحد رفيع على خلفية هادية" },
  { id: "glow", icon: "✨", name: "رسم مضيء", hint: "خطوط ذهبية مضيئة على خلفية سوداء" },
  { id: "neon", icon: "🌃", name: "نيون", hint: "أنوار نيون وردية وزرقاء بليل المدينة" },
  { id: "holo", icon: "🧊", name: "هولوغرام", hint: "مجسمات شبكية زرقاء شفافة" },
  { id: "blueprint", icon: "📐", name: "مخطط هندسي", hint: "خطوط بيضاء على ورق أزرق" },
  { id: "chalk", icon: "🟩", name: "سبورة طباشير", hint: "رسم بالطباشير على سبورة خضراء" },
  { id: "whiteboard", icon: "🖊️", name: "سبورة بيضاء", hint: "رسم بالقلم ينرسم قدامك" },
  { id: "paper", icon: "✂️", name: "قص ورق", hint: "طبقات ورق ملوّن بظلال ناعمة" },
  { id: "comic", icon: "💥", name: "كوميكس", hint: "حدود سوداء سميكة ونقاط وفقاعات" },
  { id: "pixel", icon: "👾", name: "بكسل آرت", hint: "مربعات ألعاب الثمانينات" },
  { id: "iso", icon: "🏙️", name: "آيزومتريك", hint: "مجسمات ثلاثية بزاوية ثابتة" },
  { id: "water", icon: "🎨", name: "ألوان مائية", hint: "بقع لون ناعمة على ورق" },
  { id: "clay", icon: "🧸", name: "صلصال", hint: "أشكال منفوخة ناعمة كأنها معجون" },
  { id: "cel", icon: "🌸", name: "أنمي", hint: "تلوين مسطح بظل واحد وخطوط سرعة" },
  { id: "terminal", icon: "💻", name: "شاشة طرفية", hint: "حروف خضراء على شاشة سوداء" },
  { id: "thermal", icon: "🌡️", name: "كاميرا حرارية", hint: "بنفسجي وبرتقالي كأنها تصوير حراري" },
  { id: "parchment", icon: "📜", name: "ورق قديم", hint: "رسم حبر على ورق بردي" },
] as const;
export const ANIM_IDS: string[] = ANIM_STYLES.map((s) => s.id);
