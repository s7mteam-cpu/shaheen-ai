import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODEL_CATALOG, FAMILY_NAME, cleanModelMap, type ModelFamily } from "@/lib/models";
import { ModelsForm } from "./ModelsForm";

export const dynamic = "force-dynamic";
const ENV: Record<ModelFamily, string> = { claude: "ANTHROPIC_API_KEY", google: "GEMINI_API_KEY", elevenlabs: "ELEVENLABS_API_KEY", fal: "FAL_KEY" };
const SITE: Record<ModelFamily, string> = { claude: "https://docs.claude.com/en/docs/about-claude/models/overview", google: "https://ai.google.dev/gemini-api/docs/models", elevenlabs: "https://elevenlabs.io/docs/models", fal: "https://fal.ai/models" };

/** «النماذج»: every AI model the platform calls, and a box to point it at a newer one without uploading code. */
export default async function ModelsPage() {
  await guardPage("ai");
  const admin = createAdminClient();
  const [{ data }, { data: err }] = await Promise.all([
    admin.from("site_content").select("value").eq("key", "models").maybeSingle(),
    admin.from("site_content").select("value").eq("key", "models_last_error").maybeSingle(),
  ]);
  const map = cleanModelMap((data?.value as { map?: unknown } | null)?.map);
  const bad = (err?.value ?? null) as { at?: string; from?: string; to?: string; why?: string } | null;
  const groups = (Object.keys(FAMILY_NAME) as ModelFamily[]).map((family) => ({
    family, name: FAMILY_NAME[family], env: ENV[family], hasKey: Boolean(process.env[ENV[family]]),
    rows: MODEL_CATALOG.filter((m) => m.family === family).map((m) => ({ id: m.id, family: m.family, use: m.use, test: m.test, current: map[m.id] ?? "" })),
  }));
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-bold text-navy-900">النماذج</h1>
        <Link href="/admin/ai" className="chip">← الذكاء الاصطناعي</Link>
      </div>
      <div className="card flex flex-col gap-2 p-5 text-[14px] leading-7 text-ink">
        <p>هذي كل نماذج الذكاء الاصطناعي اللي يستخدمها الموقع والعامل. لما ينزل نموذج أحدث، اكتب اسمه بالخانة واحفظ: كل الأدوات اللي تستخدم النموذج القديم تتحول عليه خلال نص دقيقة، بدون رفع ملفات.</p>
        <ul className="list-disc pr-5 text-[13.5px] text-subtle">
          <li>الخانة الفاضية = النموذج الأصلي. والاسم لازم يكون من نفس المزوّد.</li>
          <li>نماذج النصوص (Claude و Gemini): اضغط «اختبر الاسم» قبل الحفظ. اختبار Claude يرسل طلب صغير جداً على حسابك، واختبار Google مجاني.</li>
          <li>نماذج الصور والفيديو والصوت ما تنختبر من هنا: احفظ، ثم جرّب الأداة نفسها مرة وحدة. لو ما اشتغلت رجّع الأصلي.</li>
          <li>النموذج الأحدث ممكن يكون أغلى أو أبطأ. شوف سعره بموقع المزوّد قبل التبديل.</li>
          <li>مزوّد كل أداة (fal أو Google…) تختاره من <Link href="/admin/tools" className="font-semibold text-navy-700 underline">الأدوات والأسعار</Link>، ومحرك «تصميم مبتكر» و«كلم شاهين» من <Link href="/admin/ai" className="font-semibold text-navy-700 underline">الذكاء الاصطناعي</Link>.</li>
        </ul>
        <p className="text-[13px] text-subtle">أسماء النماذج الرسمية: {(Object.keys(SITE) as ModelFamily[]).map((f, i) => <span key={f}>{i ? " · " : ""}<a href={SITE[f]} target="_blank" rel="noreferrer" className="font-semibold text-navy-700 underline">{FAMILY_NAME[f]}</a></span>)}</p>
      </div>
      {bad?.to && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">تنبيه: النموذج «{bad.to}» (بدل «{bad.from}») رفضه المزوّد{bad.at ? ` بتاريخ ${new Date(bad.at).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait" })}` : ""}، فاشتغل الأصلي مكانه. صحّح الاسم أو رجّع الأصلي.</p>}
      <ModelsForm groups={groups} />
    </div>
  );
}
