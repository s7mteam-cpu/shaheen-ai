import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { costReport } from "@/lib/server/aiUsage";
import { PricesForm } from "./PricesForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "تكلفة كل طلب" };

const usd = (n: number) => (n >= 1 ? `$${n.toFixed(2)}` : n >= 0.01 ? `$${n.toFixed(3)}` : n > 0 ? `$${n.toFixed(4)}` : "$0");
const PROV: Record<string, string> = { claude: "Claude", google: "Gemini", elevenlabs: "ElevenLabs" };

/** «تكلفة كل طلب»: what every order cost at the AI providers (an estimate: noted tokens × the prices below), beside what the customer paid in feathers. */
export default async function CostsPage() {
  await guardPage("ai");
  const r = await costReport(30);
  const f = r.prices.feather_usd;
  const missing = [...new Set(r.jobs.flatMap((j) => j.unknown).concat(r.site.filter((s) => !s.known).map((s) => s.model)))].filter((m) => m && !/^eleven|^scribe/.test(m));
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/ai" className="text-sm font-semibold text-navy-700 underline">← مركز الذكاء الاصطناعي</Link>
        <h1 className="mt-2 text-[26px] font-bold text-navy-900">تكلفة كل طلب</h1>
        <p className="mt-1 text-sm text-subtle">كم كلّف كل طلب عند مزودي الذكاء الاصطناعي، وكم ريشة دفع العميل. الأرقام تقديرية (التوكنات المسجّلة × الأسعار تحت)، والفاتورة الحقيقية عند المزود ممكن تختلف شوي. آخر {r.days} يوم.</p>
      </div>
      {!r.ready && <p role="alert" className="card border-red-200 p-5 font-semibold text-red-700">الجدول مو موجود لسه. شغّل ملف SQL رقم 0065 بـ Supabase مرة واحدة.</p>}
      {r.ready && r.jobs.length === 0 && <p className="card p-5 text-muted">ما فيه طلبات مسجّلة لسه. التسجيل يبدأ من الطلبات الجديدة بعد هذا التحديث: جرّب أي أداة وارجع هنا.</p>}
      <PricesForm p={r.prices} missing={missing} />

      {r.tools.length > 0 && (
        <section aria-labelledby="by-tool" className="card flex flex-col gap-3 p-5">
          <h2 id="by-tool" className="text-lg font-bold text-navy-900">ملخص كل أداة (للتسعير)</h2>
          <p className="text-[13px] text-subtle">«تغطي» = كم مرة ريش الطلب تغطي أغلى تكلفة انسجّلت. أقل من 2× يعني السعر قريب من التكلفة ولازم ينرفع. المجموع التقديري للفترة: <b>{usd(r.total)}</b>.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-subtle"><th className="p-2 text-start">الأداة</th><th className="p-2 text-start">طلبات</th><th className="p-2 text-start">متوسط التكلفة</th><th className="p-2 text-start">أغلى طلب</th><th className="p-2 text-start">أغلى طلب بالريش</th><th className="p-2 text-start">متوسط المدفوع</th><th className="p-2 text-start">تغطي</th></tr></thead>
              <tbody>
                {r.tools.map((t) => {
                  const cover = t.max > 0 && t.avgCredits > 0 ? (t.avgCredits * f) / t.max : 0;
                  return (
                    <tr key={t.toolId} className="border-t border-line">
                      <td className="p-2 font-semibold text-navy-900">{t.name}{t.unknown && <span className="ms-2 text-[12px] font-semibold text-red-700">ناقص سعر</span>}</td>
                      <td className="p-2">{t.jobs}</td>
                      <td className="p-2" dir="ltr">{usd(t.avg)}</td>
                      <td className="p-2 font-semibold" dir="ltr">{usd(t.max)}</td>
                      <td className="p-2">{(t.max / f).toFixed(1)} ريشة</td>
                      <td className="p-2">{t.avgCredits ? `${t.avgCredits.toFixed(0)} ريشة` : "—"}</td>
                      <td className={`p-2 font-bold ${cover === 0 || t.unknown ? "text-subtle" : cover < 2 ? "text-red-700" : cover < 4 ? "text-[#9A7A35]" : "text-green-700"}`}>{t.unknown ? "؟ (ناقص سعر)" : cover ? `${cover.toFixed(1)}×` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {r.jobs.length > 0 && (
        <section aria-labelledby="by-job" className="card flex flex-col gap-3 p-5">
          <h2 id="by-job" className="text-lg font-bold text-navy-900">آخر الطلبات</h2>
          <ul className="flex flex-col divide-y divide-line">
            {r.jobs.map((j) => (
              <li key={j.jobId} className="flex flex-col gap-1.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-navy-900">{r.tools.find((t) => t.toolId === j.toolId)?.name ?? j.toolId} <span className="text-[13px] font-normal text-subtle">· {j.user || "—"} · {new Date(j.at).toLocaleString("ar", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kuwait" })}{j.status === "failed" ? " · فشل" : ""}{j.refunded ? " · رجعت الريش" : ""}</span></span>
                  <span className="flex items-center gap-3 text-sm"><b dir="ltr" className="text-navy-900">{usd(j.usd)}</b><span className="text-subtle">دفع {j.credits} ريشة</span></span>
                </div>
                <ul className="flex flex-wrap gap-2 text-[12.5px] text-muted">
                  {j.parts.map((p) => (
                    <li key={p.provider + p.model} className="rounded-lg bg-navy-900/5 px-2 py-1" dir="ltr">
                      {PROV[p.provider] ?? p.provider} · {p.model || "?"} · {p.provider === "elevenlabs" ? `${p.units} chars` : `${p.input.toLocaleString("en")} in / ${p.output.toLocaleString("en")} out`} · {p.calls}× · {p.known ? usd(p.usd) : "بدون سعر"}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.site.length > 0 && (
        <section aria-labelledby="by-site" className="card flex flex-col gap-3 p-5">
          <h2 id="by-site" className="text-lg font-bold text-navy-900">نداءات الموقع (مو مربوطة بطلب)</h2>
          <p className="text-[13px] text-subtle">نصوص يكتبها الموقع نفسه قبل ما ينفتح الطلب (خطط، نصوص، محادثة). ما تنحسب على طلب بعينه.</p>
          <ul className="flex flex-wrap gap-2 text-[13px] text-muted">
            {r.site.map((s) => <li key={s.source + s.model} className="rounded-lg bg-navy-900/5 px-2.5 py-1.5">{s.source} · <span dir="ltr">{s.model}</span> · {s.calls} نداء · <b dir="ltr">{s.known ? usd(s.usd) : "بدون سعر"}</b></li>)}
          </ul>
        </section>
      )}
      <p className="text-[13px] text-subtle">اللي ينسجّل الحين: Claude و Gemini (توكنات) وصوت ElevenLabs (حروف) بكل الطلبات اللي يشتغل عليها العامل، ونصوص Claude بالموقع. ما ينسجّل لسه: نماذج الصور والفيديو (fal وصور وفيديو Google) والموسيقى.</p>
    </div>
  );
}
