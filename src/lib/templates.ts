import { ILLUS_STYLES } from "@/remotion/styles";

export type TemplateRow = { id: string; style: string; title: string; seconds: number; aspect: string; thumb_url: string | null; sort_order: number; is_published: boolean; source: string };
export type Skeleton = { scenes: { kind: string; dur: number }[]; colors?: { accent?: string; bg?: string }; font?: string; board?: string; illus?: string };

/** Sample ideas the auto-generator builds templates from (one template per style × idea). More ideas = more templates. */
export const TEMPLATE_IDEAS: { title: string; idea: string }[] = [
  { title: "إطلاق منتج جديد", idea: "إعلان لإطلاق منتج جديد في متجر عطور، يبرز أهم ميزتين وسعر الإطلاق ودعوة للطلب" },
  { title: "عرض وخصم", idea: "إعلان عرض الويكند بمطعم: خصم 30% على الوجبات العائلية لمدة 3 أيام فقط" },
  { title: "تعريف بالنشاط", idea: "فيديو تعريفي بمشروع صغير: من نحن، وش نقدّم، ليش نختلف، وكيف تتواصل معنا" },
  { title: "نصائح سريعة", idea: "3 نصائح سريعة للعناية بالبشرة في الصيف من مركز تجميل" },
  { title: "افتتاح فرع جديد", idea: "إعلان افتتاح فرع جديد لمقهى مع هدية للأوائل وموقع وموعد الافتتاح" },
  { title: "أرقام وإنجازات", idea: "فيديو يعرض أرقام شركة: عدد العملاء، سنوات الخبرة، نسبة الرضا، وعدد المشاريع" },
  { title: "خطوات الطلب", idea: "كيف تطلب من متجرنا بـ 4 خطوات بسيطة: اختر، ادفع، نجهّز، نوصّل" },
  { title: "مقارنة قبل وبعد", idea: "مقارنة بين الطريقة التقليدية وخدمتنا الحديثة في تنظيف المنازل" },
  { title: "تهنئة مناسبة", idea: "تهنئة من شركة لعملائها بمناسبة العيد مع عرض خاص ودعوة للزيارة" },
  { title: "شهادات العملاء", idea: "فيديو يعرض آراء العملاء وتقييماتهم لخدمة توصيل سريعة" },
];
export const styleLabel = (k: string) => ILLUS_STYLES.find((x) => x[0] === k)?.[1] ?? k;
