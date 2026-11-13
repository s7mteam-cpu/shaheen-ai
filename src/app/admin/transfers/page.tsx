import { createAdminClient } from "@/lib/supabase/admin";
import { guardPage } from "@/lib/server/auth";
import { countryOf } from "@/lib/countries";
import { allowedMonths, type TransferMethod } from "@/lib/server/transfers";
import { MethodForm, MonthsForm, Review } from "./Forms";

export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { subscribe: "اشتراك جديد", renew: "تجديد", managed: "باقة الإدارة الكاملة" };
const STATUS: Record<string, [string, string]> = { pending: ["تنتظر", "bg-amber-100 text-amber-900"], approved: ["مقبول ✓", "bg-green-100 text-green-900"], rejected: ["مرفوض", "bg-red-100 text-red-900"] };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait", dateStyle: "medium", timeStyle: "short" }) : "—");

/** «الدفع بالتحويل»: transfers waiting for approval, their history, and the methods offered to customers. */
export default async function Transfers() {
  await guardPage("transfers");
  const admin = createAdminClient();
  const [{ data: pending, error }, { data: history }, { data: methods }, months] = await Promise.all([
    admin.from("transfers").select("*").eq("status", "pending").order("created_at"),
    admin.from("transfers").select("*").neq("status", "pending").order("reviewed_at", { ascending: false }).limit(100),
    admin.from("transfer_methods").select("*").order("sort_order"),
    allowedMonths(),
  ]);
  if (error) return <p className="rounded-xl bg-amber-50 p-4 text-amber-900">شغّل ملف SQL الخاص بالتحديث v80 (v80-transfers.sql) بـ Supabase أول.</p>;
  const ids = [...new Set([...(pending ?? []), ...(history ?? [])].map((t) => t.user_id))];
  const { data: people } = ids.length ? await admin.from("profiles").select("id,full_name,email,phone,country").in("id", ids) : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id, p]));
  const { data: plans } = await admin.from("plans").select("id,name");
  const planName = (id: string | null) => plans?.find((p) => p.id === id)?.name ?? id ?? "";
  // a 30-minute private link to each pending receipt
  const links = new Map<string, string>();
  for (const t of pending ?? []) {
    if (!t.receipt_path) continue;
    const { data } = await admin.storage.from("results").createSignedUrl(t.receipt_path, 1800);
    if (data?.signedUrl) links.set(t.id, data.signedUrl);
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">الدفع بالتحويل</h1>
        <p className="mt-1 text-sm leading-7 text-subtle">العميل يحوّل (تحويل بنكي، شام كاش…) ويرفع الإيصال. تأكد إن المبلغ وصل حسابك، واضغط «قبول»: يتفعّل اشتراكه، وتنسجل الدفعة بالمالية و Google Sheets، ويوصله إشعار.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-navy-900">تنتظر الموافقة ({pending?.length ?? 0})</h2>
        {!pending?.length && <p className="card p-5 text-sm text-subtle">ما فيه تحويلات تنتظر. ✓</p>}
        {pending?.map((t) => {
          const p = who.get(t.user_id); const c = countryOf(p?.country ?? "KW");
          const url = links.get(t.id); const pdf = t.receipt_path?.endsWith(".pdf");
          return (
            <article key={t.id} className="card flex flex-col gap-4 p-5 sm:flex-row">
              <div className="flex flex-1 flex-col gap-1.5 text-sm leading-7">
                <b className="text-base text-navy-900">{p?.full_name || p?.email || "عميل"} <span className="font-normal">{c.flag}</span></b>
                <span className="text-subtle" dir="ltr">{p?.email}{p?.phone ? ` · ${p.phone}` : ""}</span>
                <span>{KIND[t.kind]}{t.plan_id ? `: ${planName(t.plan_id)}` : ""}{t.months > 1 ? ` — ${t.months} أشهر` : ""}</span>
                <span className="text-lg font-bold text-navy-900">{Number(t.amount).toLocaleString("en", { minimumFractionDigits: 3 })} د.ك</span>
                <span>الطريقة: <b>{t.method_name}</b></span>
                {t.paid_text && <span>العميل يقول حوّل: <b>{t.paid_text}</b></span>}
                {t.note && <span className="rounded-lg bg-tint px-3 py-1.5">«{t.note}»</span>}
                <span className="text-[12.5px] text-subtle">أُرسل: {when(t.created_at)}</span>
                <div className="mt-2"><Review id={t.id} /></div>
              </div>
              {url && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="block w-full shrink-0 sm:w-56">
                  {pdf ? <span className="btn btn-outline w-full py-6">📄 فتح الإيصال (PDF)</span>
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={url} alt="الإيصال" className="max-h-80 w-full rounded-xl border border-line object-contain" />}
                  <span className="mt-1 block text-center text-[12px] text-subtle">اضغط لتكبير الإيصال</span>
                </a>
              )}
            </article>
          );
        })}
      </section>

      <section className="card flex flex-col gap-4 p-5">
        <h2 className="text-lg font-bold text-navy-900">طرق التحويل</h2>
        <p className="text-[13px] leading-6 text-subtle">كل طريقة تظهر للعملاء من الدول اللي تختارها، وبس إذا كانت مفعّلة. وإذا صارت بطاقات دولة تشتغل بالدفع الإلكتروني، أوقف طريقتها بس.</p>
        {(methods as TransferMethod[] | null)?.map((m) => (
          <details key={m.id} className="rounded-xl border border-line p-4">
            <summary className="cursor-pointer font-bold text-navy-900">{m.name} <span className={`ms-2 rounded-full px-2 py-0.5 text-[12px] ${m.is_active ? "bg-green-100 text-green-900" : "bg-tint text-subtle"}`}>{m.is_active ? "مفعّلة" : "موقوفة"}</span> <span className="ms-1 text-[12.5px] font-normal text-subtle">{m.countries?.length ? m.countries.map((x) => countryOf(x).flag).join(" ") : "🌍 كل الدول"}</span></summary>
            <div className="mt-4"><MethodForm m={m} /></div>
          </details>
        ))}
        <details className="rounded-xl border-2 border-dashed border-line p-4">
          <summary className="cursor-pointer font-bold text-navy-900">+ إضافة طريقة جديدة</summary>
          <div className="mt-4"><MethodForm /></div>
        </details>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold text-navy-900">المدد اللي يقدر العميل يدفعها مرة وحدة</h2>
        <p className="text-[13px] leading-6 text-subtle">إذا دفع العميل أكثر من شهر، الريش تتجدد له كل شهر لحالها طول المدة.</p>
        <MonthsForm months={months} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-navy-900">آخر التحويلات</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="bg-tint text-navy-900">{["التاريخ", "العميل", "الطلب", "المبلغ", "الطريقة", "الحالة", "بواسطة"].map((h) => <th key={h} className="p-3 text-center font-bold">{h}</th>)}</tr></thead>
            <tbody>
              {!history?.length && <tr><td colSpan={7} className="p-5 text-center text-subtle">لا يوجد بعد.</td></tr>}
              {history?.map((t) => {
                const p = who.get(t.user_id); const [label, cls] = STATUS[t.status] ?? [t.status, ""];
                return (
                  <tr key={t.id} className="border-t border-line text-center">
                    <td className="p-3">{when(t.reviewed_at)}</td>
                    <td className="p-3">{countryOf(p?.country ?? "KW").flag} {p?.full_name || p?.email || "—"}</td>
                    <td className="p-3">{KIND[t.kind]}{t.months > 1 ? ` (${t.months} أشهر)` : ""}</td>
                    <td className="p-3 font-semibold">{Number(t.amount)} د.ك</td>
                    <td className="p-3">{t.method_name}</td>
                    <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${cls}`}>{label}</span>{t.reject_reason ? <span className="block text-[12px] text-subtle">{t.reject_reason}</span> : null}</td>
                    <td className="p-3 text-[12.5px]" dir="ltr">{t.reviewed_by ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
