import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY, financeSettings, postRecurring, toKwd, type Expense, type Income, type Recurring } from "@/lib/server/finance";
import { ExpenseForm, IncomeForm, RecurringForm, SyncClaudeButton } from "./FinanceForms";
import { deleteExpense, deleteIncome, deleteRecurring, saveRate, toggleRecurring } from "./actions";
import { getL, serverT } from "@/lib/server/lang";
import { L } from "@/lib/i18n/ui";

export const dynamic = "force-dynamic";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const kdIn = (cur: string) => (n: number) => `${n.toLocaleString("en", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${cur}`;

export default async function Finance({ searchParams }: { searchParams: Promise<{ tab?: string; year?: string; cat?: string }> }) {
  const T = await serverT();
  const L = await getL();
  const kd = kdIn(L("د.ك"));
  const money = (n: number, c: string) => (c === "KWD" ? kd(n) : `$${Number(n).toLocaleString("en", { maximumFractionDigits: 2 })}`);
  await guardPage("finance");
  const { tab = "summary", year: y, cat } = await searchParams;
  const year = Number(y) > 2000 ? Number(y) : new Date().getFullYear();
  await postRecurring().catch(() => {});
  const admin = createAdminClient();
  const { usd_kwd: rate } = await financeSettings();
  const from = `${year}-01-01`, to = `${year}-12-31`;
  const [exRes, inRes, recRes] = await Promise.all([
    admin.from("expenses").select("id,spent_on,vendor,category,amount,currency,note,receipt_path,source,period").gte("spent_on", from).lte("spent_on", to).order("spent_on", { ascending: false }),
    admin.from("income").select("id,received_on,source,description,customer_name,amount,currency,method,note").gte("received_on", from).lte("received_on", to).order("received_on", { ascending: false }),
    admin.from("recurring_expenses").select("*").order("created_at"),
  ]);
  const notReady = !!(exRes.error || inRes.error || recRes.error);
  const expenses = (exRes.data ?? []) as Expense[];
  const income = (inRes.data ?? []) as Income[];
  const recurring = (recRes.data ?? []) as Recurring[];

  const months = MONTHS.map((name0, i) => {
    const name = L(name0);
    const m = `${year}-${String(i + 1).padStart(2, "0")}`;
    const inc = income.filter((x) => x.received_on.startsWith(m)).reduce((s, x) => s + toKwd(x.amount, x.currency, rate), 0);
    const exp = expenses.filter((x) => x.spent_on.startsWith(m)).reduce((s, x) => s + toKwd(x.amount, x.currency, rate), 0);
    return { name, inc, exp, net: inc - exp };
  });
  const totInc = months.reduce((s, m) => s + m.inc, 0), totExp = months.reduce((s, m) => s + m.exp, 0);
  const nowM = new Date().getFullYear() === year ? months[new Date().getMonth()] : null;
  const byCat = Object.keys(CATEGORY).map((c) => ({ c, v: expenses.filter((x) => x.category === c).reduce((s, x) => s + toKwd(x.amount, x.currency, rate), 0) }));
  const vendors = [...expenses.reduce((m, x) => m.set(x.vendor, (m.get(x.vendor) ?? 0) + toKwd(x.amount, x.currency, rate)), new Map<string, number>())].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const peak = Math.max(1, ...months.map((m) => Math.max(m.inc, m.exp)));
  const receipts = expenses.filter((x) => x.receipt_path).map((x) => x.receipt_path!) ;
  const signed = receipts.length ? (await admin.storage.from("uploads").createSignedUrls(receipts, 3600)).data ?? [] : [];
  const receiptUrl = (p: string | null) => (p ? signed.find((s) => s.path === p)?.signedUrl ?? undefined : undefined);
  const shownExpenses = cat && CATEGORY[cat] ? expenses.filter((x) => x.category === cat) : expenses;

  const tabs = [["summary", L("الملخص")], ["expenses", L("المصاريف")], ["recurring", L("المتكررة")], ["income", L("الإيرادات")]] as const;
  const href = (t: string, extra = "") => `/admin/finance?tab=${t}&year=${year}${extra}`;

  return (
    <div className="flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[26px] font-bold text-navy-900">{L("المالية")}</h1><p className="mt-1 text-sm text-subtle">{L("كل الإيرادات والمصاريف بمكان واحد، بالدينار الكويتي.")}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href(tab, "").replace(`year=${year}`, `year=${year - 1}`)} className="btn btn-outline px-3 py-2 text-sm">‹ {year - 1}</Link>
          <span className="rounded-xl bg-navy-800 px-4 py-2 font-latin font-bold text-white">{year}</span>
          <Link href={href(tab, "").replace(`year=${year}`, `year=${year + 1}`)} className="btn btn-outline px-3 py-2 text-sm">{year + 1} ›</Link>
          <a href={`/api/admin/finance/export?year=${year}`} className="btn btn-gold px-5 py-2 text-sm font-bold">{L("⬇ تحميل Excel")}</a>
        </div>
      </div>
      {notReady && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{L("لازم تشغّل ملف SQL الخاص بالتحديث v27 أول، عشان تشتغل صفحة المالية.")}</p>}

      <nav role="tablist" className="card flex gap-1 overflow-x-auto rounded-2xl p-1 sm:self-start">
        {tabs.map(([k, l]) => <Link key={k} role="tab" aria-selected={tab === k} href={href(k)} className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-[15px] font-semibold ${tab === k ? "bg-navy-800 text-white" : "text-navy-800 hover:bg-tint"}`}>{l}</Link>)}
      </nav>

      {tab === "summary" && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {[
              [L("إيرادات ") + year, kd(totInc), "text-emerald-700"],
              [L("مصاريف ") + year, kd(totExp), "text-red-700"],
              [L("صافي الربح ") + year, kd(totInc - totExp), totInc - totExp >= 0 ? "text-emerald-700" : "text-red-700"],
              ...(nowM ? [[L("صافي ") + nowM.name, kd(nowM.net), nowM.net >= 0 ? "text-emerald-700" : "text-red-700"]] : []),
            ].map(([l, v, c]) => (
              <div key={l} className="card flex flex-col gap-1.5 p-5"><span className="text-sm text-subtle">{l}</span><span className={`font-latin text-2xl font-bold ${c}`}>{v}</span></div>
            ))}
          </div>

          <section className="card overflow-x-auto p-5">
            <h2 className="mb-3 text-lg font-bold">{L("شهر بشهر")}</h2>
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-right text-[13px] text-subtle"><th className="p-2 font-semibold">{L("الشهر")}</th><th className="p-2 font-semibold">{L("الإيرادات")}</th><th className="p-2 font-semibold">{L("المصاريف")}</th><th className="p-2 font-semibold">{L("الصافي")}</th><th className="w-[34%] p-2"><span className="sr-only">{L("رسم")}</span></th></tr></thead>
              <tbody>{months.map((m) => (
                <tr key={m.name} className="border-t border-[#EDF1F6]">
                  <td className="p-2 font-semibold">{m.name}</td>
                  <td className="p-2 font-latin text-emerald-700">{m.inc ? kd(m.inc) : "—"}</td>
                  <td className="p-2 font-latin text-red-700">{m.exp ? kd(m.exp) : "—"}</td>
                  <td className={`p-2 font-latin font-bold ${m.net >= 0 ? "text-navy-900" : "text-red-700"}`}>{m.inc || m.exp ? kd(m.net) : "—"}</td>
                  <td className="p-2"><div className="flex flex-col gap-1"><span className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(m.inc / peak) * 100}%` }} /><span className="h-1.5 rounded-full bg-red-400" style={{ width: `${(m.exp / peak) * 100}%` }} /></div></td>
                </tr>
              ))}</tbody>
            </table>
            <p className="mt-2 text-[12px] text-subtle"><span className="me-1 inline-block h-2 w-3 rounded bg-emerald-500" />{L("الإيرادات")} <span className="me-1 ms-3 inline-block h-2 w-3 rounded bg-red-400" />{L("المصاريف")}</p>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="card flex flex-col gap-2 p-5">
              <h2 className="text-lg font-bold">{L("المصاريف حسب النوع")}</h2>
              {byCat.map(({ c, v }) => <Link key={c} href={href("expenses", `&cat=${c}`)} className="flex justify-between border-b border-[#EDF1F6] py-2 last:border-0 hover:text-navy-700"><span>{L(CATEGORY[c] ?? c)}</span><span className="font-latin font-bold">{kd(v)}</span></Link>)}
            </section>
            <section className="card flex flex-col gap-2 p-5">
              <h2 className="text-lg font-bold">{L("أكثر جهات بتصرف عليها")}</h2>
              {vendors.length ? vendors.map(([v, a]) => <div key={v} className="flex justify-between border-b border-[#EDF1F6] py-2 last:border-0"><span>{v}</span><span className="font-latin font-bold">{kd(a)}</span></div>) : <p className="text-sm text-subtle">{L("ما فيه مصاريف مسجّلة للحين.")}</p>}
            </section>
          </div>
          <form action={saveRate} className="card flex flex-wrap items-center gap-2 p-4 text-sm">
            <label htmlFor="rate" className="font-semibold">{L("سعر الدولار بالدينار:")}</label>
            <input id="rate" name="rate" defaultValue={rate} inputMode="decimal" dir="ltr" className="field w-28 py-2" />
            <button className="btn btn-outline px-4 py-2">{L("حفظ")}</button>
            <span className="text-subtle">{L("كل المبالغ بالدولار بتتحوّل للدينار بهالسعر.")}</span>
          </form>
        </>
      )}

      {tab === "expenses" && (
        <>
          <section className="card flex flex-col gap-3 p-5"><h2 className="text-lg font-bold">{L("إضافة مصروف")}</h2><ExpenseForm /></section>
          <section className="card flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">{L("Claude تلقائياً")}</h2><SyncClaudeButton /></div>
            <p className="text-[13px] leading-6 text-subtle">{L("بيسحب تكلفة Claude الحقيقية لكل شهر من Anthropic. بيحتاج مفتاح «Admin key» من Claude Console تحطه بإعدادات Vercel باسم ANTHROPIC_ADMIN_KEY. باقي الشركات (Gemini، ElevenLabs، Railway) سجّلها هنا أول كل شهر من فاتورتها.")}</p>
          </section>
          <section className="card overflow-x-auto p-2">
            <div className="flex flex-wrap gap-1.5 p-3">
              <Link href={href("expenses")} aria-pressed={!cat} className="chip">{L("الكل")}</Link>
              {Object.entries(CATEGORY).map(([k, l]) => <Link key={k} href={href("expenses", `&cat=${k}`)} aria-pressed={cat === k} className="chip">{l}</Link>)}
            </div>
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3 font-semibold">{L("التاريخ")}</th><th className="p-3 font-semibold">{L("الجهة")}</th><th className="p-3 font-semibold">{L("النوع")}</th><th className="p-3 font-semibold">{L("المبلغ")}</th><th className="p-3 font-semibold">{L("بالدينار")}</th><th className="p-3 font-semibold">{L("الفاتورة")}</th><th className="p-3"><span className="sr-only">{L("حذف")}</span></th></tr></thead>
              <tbody>
                {shownExpenses.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-subtle">{L("ما فيه مصاريف بهالسنة.")}</td></tr>}
                {shownExpenses.map((x) => (
                  <tr key={x.id} className="border-t border-[#EDF1F6]">
                    <td className="p-3 font-latin">{x.spent_on}</td>
                    <td className="p-3"><div className="font-semibold">{x.vendor}</div>{x.note && <div className="text-xs text-subtle">{x.note}</div>}{x.source !== "manual" && <div className="text-[11px] font-semibold text-navy-700">{x.source === "recurring" ? L("تلقائي (متكرر)") : L("تلقائي")}</div>}</td>
                    <td className="p-3">{L(CATEGORY[x.category] ?? x.category)}</td>
                    <td className="p-3 font-latin">{money(x.amount, x.currency)}</td>
                    <td className="p-3 font-latin font-semibold">{kd(toKwd(x.amount, x.currency, rate))}</td>
                    <td className="p-3">{receiptUrl(x.receipt_path) ? <a href={receiptUrl(x.receipt_path)} target="_blank" rel="noopener" className="font-semibold text-navy-700 underline">{L("عرض")}</a> : "—"}</td>
                    <td className="p-3"><form action={deleteExpense}><input type="hidden" name="id" value={x.id} /><button className="text-xs font-semibold text-red-700 underline">{L("حذف")}</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      {tab === "recurring" && (
        <>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-bold">{L("إضافة مصروف متكرر")}</h2>
            <p className="-mt-1 text-[13px] text-subtle">{L("تعرّفه مرة وحدة، وبينضاف لحاله لقائمة المصاريف كل شهر أو كل سنة بموعده.")}</p>
            <RecurringForm />
          </section>
          <section className="card flex flex-col p-2">
            {recurring.length === 0 && <p className="p-6 text-center text-subtle">{L("ما فيه مصاريف متكررة. أمثلة: Supabase Pro 25$ كل شهر، الدومين 12$ كل سنة.")}</p>}
            {recurring.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 border-b border-[#EDF1F6] p-3 last:border-0">
                <div className="min-w-[180px] flex-1"><div className="font-semibold">{r.vendor}</div><div className="text-xs text-subtle">{r.category === "yearly" ? T(`كل سنة بتاريخ ${r.day_of_month}/${r.month_of_year}`, `Yearly on ${r.day_of_month}/${r.month_of_year}`) : T(`كل شهر يوم ${r.day_of_month}`, `Monthly on day ${r.day_of_month}`)} {L("· من")} {r.starts_on}{r.note ? ` · ${r.note}` : ""}</div></div>
                <span className="font-latin font-bold">{money(r.amount, r.currency)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.is_active ? "bg-emerald-50 text-emerald-800" : "bg-canvas text-subtle"}`}>{r.is_active ? L("فعّال") : L("موقوف")}</span>
                <form action={toggleRecurring}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="on" value={r.is_active ? "0" : "1"} /><button className="text-sm font-semibold text-navy-700 underline">{r.is_active ? L("إيقاف") : L("تفعيل")}</button></form>
                <form action={deleteRecurring}><input type="hidden" name="id" value={r.id} /><button className="text-sm font-semibold text-red-700 underline">{L("حذف")}</button></form>
              </div>
            ))}
          </section>
        </>
      )}

      {tab === "income" && (
        <>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-bold">{L("إضافة إيراد")}</h2>
            <p className="-mt-1 text-[13px] text-subtle">{L("اشتراكات البطاقة بتنسجّل هنا لحالها أول ما تنربط بوابة الدفع. سجّل يدوياً أي دفعة ثانية، مثل باقة الإدارة الكاملة أو تحويل بنكي.")}</p>
            <IncomeForm />
          </section>
          <section className="card overflow-x-auto p-2">
            <table className="w-full min-w-[680px] text-sm">
              <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3 font-semibold">{L("التاريخ")}</th><th className="p-3 font-semibold">{L("الوصف")}</th><th className="p-3 font-semibold">{L("العميل")}</th><th className="p-3 font-semibold">{L("الطريقة")}</th><th className="p-3 font-semibold">{L("المبلغ")}</th><th className="p-3"><span className="sr-only">{L("حذف")}</span></th></tr></thead>
              <tbody>
                {income.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-subtle">{L("ما فيه إيرادات بهالسنة للحين.")}</td></tr>}
                {income.map((x) => (
                  <tr key={x.id} className="border-t border-[#EDF1F6]">
                    <td className="p-3 font-latin">{x.received_on}</td>
                    <td className="p-3"><div className="font-semibold">{x.description}</div>{x.source !== "manual" && <div className="text-[11px] font-semibold text-navy-700">{L("تلقائي من الدفع")}</div>}</td>
                    <td className="p-3">{x.customer_name ?? "—"}</td>
                    <td className="p-3">{x.method ?? "—"}</td>
                    <td className="p-3 font-latin font-bold text-emerald-700">{money(x.amount, x.currency)}</td>
                    <td className="p-3"><form action={deleteIncome}><input type="hidden" name="id" value={x.id} /><button className="text-xs font-semibold text-red-700 underline">{L("حذف")}</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
