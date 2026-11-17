import { guardPage } from "@/lib/server/auth";
import { VeoTest } from "@/components/admin/VeoTest";

export const dynamic = "force-dynamic";

export default async function VeoPage() {
  await guardPage("ai");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[26px] font-bold text-navy-900">تجربة توليد الفيديو بالذكاء الاصطناعي (للإدارة فقط)</h1>
      <p className="max-w-2xl text-sm text-subtle">ولّد لقطة وحدة من وصفك (نموذج Gemini Omni) وشوف الجودة والوقت. كل ضغطة تكلّف فلوس حقيقية من حساب Google، فجرّب بحدود.</p>
      <VeoTest />
    </div>
  );
}
