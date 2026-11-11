import { guardPage } from "@/lib/server/auth";
import Link from "next/link";
import { getContent } from "@/lib/data";
import { providerInfo, textProviders, toolProviders, type ProviderId } from "@/lib/providers/registry";
import { saveAi } from "../actions";

export const dynamic = "force-dynamic";

function Row({ title, hint, pName, mName, p, m }: { title: string; hint: string; pName: string; mName: string; p: string; m: string }) {
  return (
    <div className="grid gap-3 border-b border-[#EDF1F6] pb-5 last:border-0 md:grid-cols-2">
      <div className="md:col-span-2"><h3 className="font-bold">{title}</h3><p className="text-sm text-subtle">{hint}</p></div>
      <div className="flex flex-col gap-1.5"><label className="label">المزوّد</label>
        <select name={pName} defaultValue={p} className="field">{(Object.keys(textProviders) as ProviderId[]).map((x) => <option key={x} value={x}>{providerInfo[x].name}</option>)}</select></div>
      <div className="flex flex-col gap-1.5"><label className="label">النموذج</label>
        <input name={mName} defaultValue={m} dir="ltr" className="field text-right" placeholder={Object.entries(textProviders).map(([a, b]) => `${a}: ${b}`).join(" | ")} /></div>
    </div>
  );
}

export default async function AiAdmin() {
  await guardPage("ai");
  const { ai } = await getContent();
  const keys = Object.entries(providerInfo).filter(([id]) => id !== "gemini").map(([id, p]) => ({ id, ...p, ok: Boolean(process.env[p.env]) }));
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div><h1 className="text-[26px] font-bold text-navy-900">الذكاء الاصطناعي</h1><p className="mt-1 text-sm text-subtle">اختر مين يشغّل كل جزء. مزودو الصور والفيديو والصوت تختارهم لكل أداة من <Link href="/admin/tools" className="font-semibold text-navy-700">الأدوات والأسعار</Link>.</p></div>

      <form action={saveAi} className="card flex flex-col gap-5 p-6">
        <Row title="«كلّم شاهين» — المساعد الجانبي" hint="يرد على العملاء ويعرف حساباتهم." pName="chat_provider" mName="chat_model" p={ai.chat_provider} m={ai.chat_model} />
        <Row title="الكتابة — نصوص الإعلانات و«ألهمني»" hint="يكتب الزوايا التسويقية والنصوص والأفكار." pName="copy_provider" mName="copy_model" p={ai.copy_provider} m={ai.copy_model} />
        <button className="btn btn-primary self-start px-6 py-2.5">حفظ</button>
      </form>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold">مفاتيح المزودين</h2>
        <p className="text-sm text-subtle">المفاتيح تنحط في إعدادات الاستضافة (Vercel ← Environment Variables) — لأمانها ما تنحفظ في لوحة الإدارة.</p>
        <ul className="flex flex-col gap-2">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-4 py-3 text-sm">
              <span className="font-semibold">{k.name}</span>
              <span className="flex items-center gap-3"><code dir="ltr">{k.env}</code><span className={k.ok ? "font-bold text-emerald-700" : "font-bold text-red-700"}>{k.ok ? "موجود ✓" : "غير موجود"}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold">مين يقدر يشغّل كل أداة</h2>
        <ul className="flex flex-col gap-1.5 text-sm">
          {Object.entries(toolProviders).map(([tool, ps]) => <li key={tool} className="flex justify-between gap-3 border-b border-[#EDF1F6] py-2 last:border-0"><code dir="ltr">{tool}</code><span>{Object.keys(ps).map((p) => providerInfo[p as ProviderId].name.split(" (")[0]).join(" · ")}</span></li>)}
        </ul>
      </section>
    </div>
  );
}
