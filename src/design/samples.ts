import type { DesignSpec } from "./spec";

// Local previews only (design-demo page).
export const SAMPLE_POST: DesignSpec = {
  kind: "post", aspect: "4:5", font: "Cairo",
  colors: { bg: "#F3ECE2", ink: "#1E1B18", accent: "#B4532F", soft: "#FBF7F1" },
  brand: { name: "أكاديمية مدار", handle: "@madar.kw", showLogo: true },
  slides: [{
    layout: "classic", kicker: "صوّر منتجك بنفسك", title: "التصوير بالجوال", highlight: "للمشاريع الصغيرة",
    body: "من غير كاميرا ولا استوديو، صور منتجات تبيع على إنستغرام من أول يوم.", badge: "ورشة حضورية",
    items: [{ icon: "sun", text: "إضاءة طبيعية بدون معدات" }, { icon: "camera", text: "زوايا وتكوين يبيّن منتجك" }, { icon: "palette", text: "تعديل احترافي من الجوال" }],
    meta: [{ icon: "calendar", text: "الخميس 20 نوفمبر" }, { icon: "clock", text: "6 – 9 مساءً" }, { icon: "map-pin", text: "الشويخ، الكويت" }],
    price: { value: "25", old: "40", currency: "د.ك", note: "12 مقعد فقط · شامل الشهادة" }, cta: "سجّل الحين",
    date: { day: "20", month: "نوفمبر", weekday: "الخميس" }, person: { name: "سارة العلي", role: "مع المدرّبة" },
  }],
  caption: "",
};

export const SAMPLE_CAROUSEL: DesignSpec = {
  kind: "carousel", aspect: "4:5", font: "Cairo",
  colors: { bg: "#EAF4F2", ink: "#0F2D2A", accent: "#0F8B7E", soft: "#FFFFFF" },
  brand: { name: "عيادة نَفَس", handle: "@nafas.clinic", showLogo: true },
  slides: [
    { layout: "cover", kicker: "دليل سريع", title: "5 عادات صباحية", highlight: "تغيّر يومك", body: "خطوات بسيطة تاخذ 10 دقايق بس" },
    { layout: "point", kicker: "العادة الأولى", title: "اشرب ماي أول ما تصحى", body: "كوبين ماي يرجّعون نشاطك بعد ساعات النوم.", items: [{ icon: "droplet", text: "" }] },
    { layout: "point", kicker: "العادة الثانية", title: "5 دقايق حركة", body: "تمارين إطالة خفيفة تفتح الجسم.", items: [{ icon: "dumbbell", text: "" }, { icon: "check", text: "إطالة الرقبة" }, { icon: "check", text: "تمرين الظهر" }] },
    { layout: "quote", kicker: "نصيحة الأخصائية", body: "الاستمرار أهم من الكمال، ابدأ بعادة وحدة وثبّتها أسبوعين.", person: { name: "د. نورة الصالح", role: "أخصائية تغذية" }, title: " " },
    { layout: "cta", title: "احجز استشارتك", body: "خطة يومية تناسبك من فريقنا", cta: "احجز الحين", meta: [{ icon: "phone", text: "9999 8888" }] },
  ],
};

export const SAMPLE_ADS: DesignSpec = {
  kind: "ads", aspect: "4:5", font: "Tajawal",
  colors: { bg: "#111114", ink: "#F5F2EA", accent: "#E8B44C", soft: "#1D1D22" },
  brand: { name: "مشاوي الديرة", handle: "@aldeira.kw", showLogo: true },
  slides: [
    { layout: "offer", badge: "الويكند فقط", stat: { value: "30%", label: "خصم على المشاوي" }, title: "عزومتك علينا", body: "كل جمعة وسبت، للطلبات الداخلية والتوصيل.", meta: [{ icon: "truck", text: "توصيل مجاني" }], cta: "اطلب الحين" },
    { layout: "photo", kicker: "جديد المنيو", title: "مشاوي مشكّلة", highlight: "على الفحم", body: "كباب، شيش طاووق، وريش غنم مع خبز التنور.", price: { value: "6.5", currency: "د.ك" }, cta: "اطلب", badge: "يكفي 2" },
  ],
};
