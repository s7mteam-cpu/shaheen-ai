/** Video playbook per field: how a pro editor styles a reel for education, restaurants, clinics… (shared with the worker as JSON). */
import data from "./playbook.json";

export type Domain = { id: string; label: string; keywords: string[]; layout: string; grade: string; captions: string; transition: string; titles: string[]; graphics: string[]; icons: string[]; music: string; tone: string; ideas: string[] };
export const PLAYBOOK = data as Domain[];

/** Compact Arabic guide for the AI editor. */
export function playbookText(list: Domain[] = PLAYBOOK) {
  return list.map((d) => `- ${d.id} | ${d.label} (${d.keywords.slice(0, 7).join("، ")}): layout ${d.layout}، grade ${d.grade}، ترجمة ${d.captions}، انتقال ${d.transition}، عناوين ${d.titles.join("/")}، مشاهد ${d.graphics.join("/")}، أيقونات ${d.icons.join("/")}، موسيقى: ${d.music || "بدون موسيقى"}. الأسلوب: ${d.tone}. أفكار: ${d.ideas.join("؛ ")}`).join("\n");
}

export const PLAYBOOK_RULES = `دليل المجالات (نقطة بداية مو قيد):
1) حدّد مجال الفيديو من الكلام ووصف العميل واسم النشاط، واختر الأقرب من القائمة (أو ادمج مجالين).
2) طبّق ستايل المجال (الشكل، الألوان، الترجمة، الانتقال، أنواع المشاهد، الموسيقى، النبرة) إلا إذا العميل طلب غير كذا — طلب العميل دايماً أهم.
3) كن مبدع مثل مونتير محترف: نوّع أنواع المشاهد والتأثيرات (marker, circle, underline, typewriter)، لا تكرر نفس نوع المشهد مرتين ورا بعض، واربط كل مشهد بمعنى الجملة (رقم ← counter، خطوات ← steps، مقارنة ← compare، وقت ← timer، نسبة ← donut، نمو ← line، أدوات ← flow، حكمة ← quote، دعوة ← arrow).
4) للمحتوى الديني: احترام كامل، بدون موسيقى وبدون إيموجي مرحة.`;
