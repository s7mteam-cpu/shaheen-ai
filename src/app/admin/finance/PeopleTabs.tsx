import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { periodReport, toKwd, financeSettings, PAY_KIND, type Period, type PartnerMove, type Employee } from "@/lib/server/finance";
import { serverT } from "@/lib/server/lang";
import { PeriodForm, PartnerForm, MoveForm, EmployeeForm, PayForm, ClosePeriodForm, ReopenForm } from "./PeopleForms";
import { deletePeriod, savePartner, deleteMove, saveEmployee } from "./actions";

const kd = (n: number) => `${n.toLocaleString("en", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} د.ك`;
const tone = (n: number) => (n >= 0 ? "text-emerald-700" : "text-red-700");
const Card = ({ l, v, c = "text-navy-900", sub }: { l: string; v: string; c?: string; sub?: string }) => (
  <div className="card flex flex-col gap-1 p-4"><span className="text-[13px] text-subtle">{l}</span><span className={`font-latin text-xl font-bold ${c}`}>{v}</span>{sub && <span className="text-[12px] text-subtle">{sub}</span>}</div>
);
const SqlNote = async () => { const T = await serverT(); return <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{T("شغّل ملف SQL الخاص بالتحديث v71 أول.", "Run the v71 SQL file first.")}</p>; };

/** «الدورات والأرباح»: net profit of any period, and how it splits between the partners. */
export async function PeriodsTab({ pid, from, to }: { pid?: string; from?: string; to?: string }) {
  const T = await serverT();
  const { data: periods, error } = await createAdminClient().from("finance_periods").select("*").order("starts_on", { ascending: false });
  if (error) return <SqlNote />;
  const list = (periods ?? []) as (Period & { closed_at?: string | null; closed_by?: string | null; report_path?: string | null; reopen_log?: { at: string; by: string | null; reason: string; closed_at: string }[] })[];
  const fmtAt = (v: string) => new Date(v).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait", dateStyle: "medium", timeStyle: "short" });
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Kuwait" });
  const chosen = list.find((p) => p.id === pid);
  const ok = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
  const range = chosen ? { from: chosen.starts_on, to: chosen.ends_on, name: chosen.name } : ok(from) && ok(to) ? { from: from!, to: to!, name: T("فترة مخصصة", "Custom period") } : null;
  const r = range ? await periodReport(range.from, range.to) : null;
  const nets = await Promise.all(list.map(async (p) => (await periodReport(p.starts_on, p.ends_on)).net));
  const excel = range ? `/api/admin/finance/period?from=${range.from}&to=${range.to}&name=${encodeURIComponent(range.name)}` : "";

  return (
    <>
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">{T("احسب أي فترة", "Calculate any period")}</h2>
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="tab" value="periods" />
          <label className="flex flex-col gap-1 text-[13px] font-semibold">{T("من", "From")}<input name="from" type="date" defaultValue={range?.from} required className="field font-normal" /></label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold">{T("إلى", "To")}<input name="to" type="date" defaultValue={range?.to} required className="field font-normal" /></label>
          <button className="btn btn-primary px-5 py-2.5">{T("احسب", "Calculate")}</button>
        </form>
        <details className="mt-1"><summary className="cursor-pointer text-sm font-semibold text-navy-700">＋ {T("احفظها كدورة تشغيلية باسم", "Save it as a named cycle")}</summary><div className="mt-3"><PeriodForm /></div></details>
      </section>

      {list.length > 0 && (
        <section className="card overflow-x-auto p-2">
          <table className="w-full min-w-[620px] text-sm">
            <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3">{T("الدورة", "Cycle")}</th><th className="p-3">{T("من", "From")}</th><th className="p-3">{T("إلى", "To")}</th><th className="p-3">{T("صافي الربح", "Net profit")}</th><th className="p-3">{T("الحالة", "Status")}</th><th className="p-3" /></tr></thead>
            <tbody>{list.map((p, i) => (
              <tr key={p.id} className={`border-t border-[#EDF1F6] ${p.id === pid ? "bg-tint" : ""}`}>
                <td className="p-3"><Link href={`/admin/finance?tab=periods&pid=${p.id}`} className="font-semibold text-navy-800 underline">{p.name}</Link>{p.note && <div className="text-xs text-subtle">{p.note}</div>}</td>
                <td className="p-3 font-latin">{p.starts_on}</td><td className="p-3 font-latin">{p.ends_on}</td>
                <td className={`p-3 font-latin font-bold ${tone(nets[i])}`}>{kd(nets[i])}</td>
                <td className="p-3">{p.closed_at ? <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[12px] font-bold text-white">🔒 {T("مقفلة", "Closed")}</span> : <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-bold text-emerald-800">{T("مفتوحة", "Open")}</span>}</td>
                <td className="p-3">{p.closed_at ? <a href={`/api/admin/finance/period/closed?id=${p.id}`} className="text-xs font-semibold text-navy-700 underline">⬇ {T("تقرير الإقفال", "Closing report")}</a> : <form action={deletePeriod}><input type="hidden" name="id" value={p.id} /><button className="text-xs font-semibold text-red-700 underline">{T("حذف", "Delete")}</button></form>}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}

      {r && range && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><h2 className="text-xl font-bold text-navy-900">{range.name} {chosen?.closed_at && <span className="ms-2 rounded-full bg-navy-900 px-2.5 py-1 align-middle text-[12px] font-bold text-white">🔒 {T("مقفلة", "Closed")}</span>}</h2><p className="font-latin text-sm text-subtle">{range.from} → {range.to}</p></div>
            <div className="flex flex-wrap gap-2">
              {chosen?.closed_at && <a href={`/api/admin/finance/period/closed?id=${chosen.id}`} className="btn btn-primary px-5 py-2 text-sm font-bold">⬇ {T("تقرير الإقفال (الملف الثابت)", "Closing report (fixed file)")}</a>}
              <a href={excel} className="btn btn-gold px-5 py-2 text-sm font-bold">⬇ {T("تقرير Excel للدورة", "Cycle Excel report")}</a>
            </div>
          </div>
          {chosen && (chosen.closed_at ? (
            <div className="card flex flex-col gap-3 border-navy-200 p-4">
              <p className="text-[14px] text-navy-900">🔒 {T("انقفلت بتاريخ", "Closed on")} <b>{fmtAt(chosen.closed_at)}</b>{chosen.closed_by ? <> {T("بواسطة", "by")} <span dir="ltr">{chosen.closed_by}</span></> : null}. {T("ما فيه أي تعديل ممكن بتواريخها.", "No changes are possible inside its dates.")}</p>
              <details><summary className="cursor-pointer text-sm font-semibold text-navy-700">{T("إعادة فتح الدورة…", "Re-open the cycle…")}</summary><div className="mt-2"><ReopenForm id={chosen.id} /></div></details>
            </div>
          ) : chosen.ends_on < today ? <ClosePeriodForm id={chosen.id} /> : <p className="rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900">{T("الدورة ما خلصت للحين. تقدر تقفلها بعد آخر يوم فيها.", "This cycle hasn't ended yet. You can close it after its last day.")}</p>)}
          {chosen?.reopen_log && chosen.reopen_log.length > 0 && (
            <div className="card p-4 text-[13px]"><p className="mb-1 font-bold">{T("سجل إعادة الفتح", "Re-open log")}</p>
              {chosen.reopen_log.map((x, i) => <p key={i} className="border-b border-[#EDF1F6] py-1.5 last:border-0">{fmtAt(x.at)} · <span dir="ltr">{x.by}</span> · {x.reason} · <a href={`/api/admin/finance/period/closed?id=${chosen.id}&v=${i}`} className="font-semibold text-navy-700 underline">{T("تقرير الإقفال السابق", "Previous closing report")}</a></p>)}
            </div>
          )}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
            <Card l={T("الإيرادات", "Revenue")} v={kd(r.revenue)} c="text-emerald-700" sub={`${r.income.length} ${T("دفعة", "payments")}`} />
            <Card l={T("المصاريف", "Expenses")} v={kd(r.spent)} c="text-red-700" sub={`${r.expenses.length} ${T("مصروف", "items")}`} />
            <Card l={T("صافي الربح", "Net profit")} v={kd(r.net)} c={tone(r.net)} sub={`${T("هامش", "Margin")} ${(r.margin * 100).toFixed(1)}%`} />
            <Card l={T("سحوبات الشركاء بالفترة", "Partner withdrawals")} v={kd(r.partners.reduce((a, p) => a + p.withdrawn, 0))} />
            <Card l={T("الباقي بالشركة", "Left in the company")} v={kd(r.net - r.partners.reduce((a, p) => a + p.withdrawn, 0))} c={tone(r.net - r.partners.reduce((a, p) => a + p.withdrawn, 0))} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="card flex flex-col gap-1 p-5">
              <h3 className="mb-1 font-bold">{T("المصاريف حسب النوع", "Expenses by type")}</h3>
              {r.byCategory.length ? r.byCategory.map((c) => <div key={c.c} className="flex justify-between border-b border-[#EDF1F6] py-2 last:border-0"><span>{c.label}</span><span className="font-latin font-bold">{kd(c.v)}</span></div>) : <p className="text-sm text-subtle">{T("ما فيه مصاريف بهالفترة.", "No expenses in this period.")}</p>}
            </section>
            <section className="card overflow-x-auto p-5">
              <h3 className="mb-2 font-bold">{T("الشركاء", "Partners")}</h3>
              {r.partners.length === 0 ? <p className="text-sm text-subtle">{T("ما فيه شركاء مضافين. أضفهم من تبويب «الشركاء».", "No partners yet. Add them in «Partners».")}</p> : (
                <table className="w-full min-w-[460px] text-sm">
                  <thead><tr className="text-right text-[12px] text-subtle"><th className="p-2">{T("الشريك", "Partner")}</th><th className="p-2">%</th><th className="p-2">{T("نصيبه المقترح", "Suggested share")}</th><th className="p-2">{T("سحب", "Withdrew")}</th><th className="p-2">{T("الباقي له", "Still owed")}</th></tr></thead>
                  <tbody>{r.partners.map((p) => (
                    <tr key={p.id} className="border-t border-[#EDF1F6]"><td className="p-2 font-semibold">{p.name}</td><td className="p-2 font-latin">{Number(p.share_percent)}</td><td className={`p-2 font-latin ${tone(p.share)}`}>{kd(p.share)}</td><td className="p-2 font-latin">{kd(p.withdrawn)}</td><td className={`p-2 font-latin font-bold ${tone(p.remaining)}`}>{kd(p.remaining)}</td></tr>
                  ))}</tbody>
                </table>
              )}
              {r.partners.length > 0 && Math.round(r.shareTotal) !== 100 && <p className="mt-2 text-[12px] text-amber-800">{T(`مجموع النسب ${r.shareTotal}%، مو 100%. النسب اقتراح بس، والقرار لك.`, `Shares add up to ${r.shareTotal}%, not 100%. They are only a suggestion.`)}</p>}
            </section>
          </div>
          {r.employees.some((e) => e.paid > 0) && (
            <section className="card p-5"><h3 className="mb-2 font-bold">{T("المدفوع للموظفين بهالفترة", "Paid to employees in this period")}</h3>
              {r.employees.filter((e) => e.paid > 0).map((e) => <div key={e.id} className="flex justify-between border-b border-[#EDF1F6] py-2 last:border-0"><span>{e.name}</span><span className="font-latin font-bold">{kd(e.paid)}</span></div>)}
            </section>
          )}
        </section>
      )}
    </>
  );
}

/** «الشركاء»: partners, their optional share, and every withdrawal / deposit. */
export async function PartnersTab() {
  const T = await serverT();
  const all = await periodReport("2000-01-01", "2999-12-31");
  if (all.missing) return <SqlNote />;
  const { usd_kwd: rate } = await financeSettings();
  const { data: mv } = await createAdminClient().from("partner_moves").select("*").order("moved_on", { ascending: false }).limit(300);
  const moves = (mv ?? []) as PartnerMove[];
  const name = (id: string) => all.partners.find((p) => p.id === id)?.name ?? "—";
  return (
    <>
      <section className="card flex flex-col gap-3 p-5"><h2 className="text-lg font-bold">{T("إضافة شريك", "Add a partner")}</h2><PartnerForm /></section>
      {all.partners.length > 0 && (
        <section className="card overflow-x-auto p-2">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3">{T("الشريك", "Partner")}</th><th className="p-3">{T("النسبة %", "Share %")}</th><th className="p-3">{T("نشط", "Active")}</th><th className="p-3">{T("كل سحوباته", "All withdrawals")}</th><th className="p-3">{T("كل إيداعاته", "All deposits")}</th><th className="p-3" /></tr></thead>
            <tbody>{all.partners.map((p) => (
              <tr key={p.id} className="border-t border-[#EDF1F6]">
                <td className="p-3"><div className="font-semibold">{p.name}</div><div className="text-xs text-subtle" dir="ltr">{[p.phone, p.email].filter(Boolean).join(" · ")}</div></td>
                <td className="p-3" colSpan={2}>
                  <form action={savePartner} className="flex items-center gap-2"><input type="hidden" name="id" value={p.id} /><input type="hidden" name="name" value={p.name} />
                    <input name="share" defaultValue={Number(p.share_percent)} inputMode="decimal" dir="ltr" className="field w-20 py-1.5" aria-label="%" />
                    <input type="checkbox" name="is_active" defaultChecked={p.is_active} className="h-5 w-5" aria-label={T("نشط", "Active")} />
                    <button className="text-xs font-semibold text-navy-700 underline">{T("حفظ", "Save")}</button></form>
                </td>
                <td className="p-3 font-latin font-bold">{kd(p.everWithdrawn)}</td><td className="p-3 font-latin">{kd(p.everCapital)}</td><td />
              </tr>
            ))}</tbody>
          </table>
          {Math.round(all.shareTotal) !== 100 && <p className="p-3 text-[12px] text-amber-800">{T(`مجموع النسب ${all.shareTotal}%. النسب اختيارية، تستخدم بس لاقتراح النصيب بالدورات.`, `Shares add up to ${all.shareTotal}%. They are optional and only suggest shares in cycles.`)}</p>}
        </section>
      )}
      {all.partners.length > 0 && <section className="card flex flex-col gap-3 p-5"><h2 className="text-lg font-bold">{T("سحب أو إيداع", "Withdrawal or deposit")}</h2><p className="text-[13px] text-subtle">{T("السحب = الشريك أخذ فلوس من الشركة (من أرباحه)، وما ينحسب من المصاريف. الإيداع = الشريك حط فلوس بالشركة (رأس مال أو تمويل).", "A withdrawal is money a partner took out (from profit), not an expense. A deposit is money a partner put in (capital or funding).")}</p><MoveForm partners={all.partners.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name }))} /></section>}
      {moves.length > 0 && (
        <section className="card overflow-x-auto p-2">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3">{T("التاريخ", "Date")}</th><th className="p-3">{T("الشريك", "Partner")}</th><th className="p-3">{T("النوع", "Type")}</th><th className="p-3">{T("المبلغ", "Amount")}</th><th className="p-3">{T("ملاحظة", "Note")}</th><th className="p-3" /></tr></thead>
            <tbody>{moves.map((m) => (
              <tr key={m.id} className="border-t border-[#EDF1F6]">
                <td className="p-3 font-latin">{m.moved_on}</td><td className="p-3 font-semibold">{name(m.partner_id)}</td>
                <td className={`p-3 font-semibold ${m.kind === "withdrawal" ? "text-red-700" : "text-emerald-700"}`}>{m.kind === "withdrawal" ? T("سحب", "Withdrawal") : T("إيداع", "Deposit")}</td>
                <td className="p-3 font-latin">{kd(toKwd(m.amount, m.currency, rate))}{m.currency === "USD" ? ` ($${m.amount})` : ""}</td>
                <td className="p-3 text-subtle">{m.note ?? ""}</td>
                <td className="p-3"><form action={deleteMove}><input type="hidden" name="id" value={m.id} /><input type="hidden" name="label" value={`${name(m.partner_id)} ${m.amount} ${m.moved_on}`} /><button className="text-xs font-semibold text-red-700 underline">{T("حذف", "Delete")}</button></form></td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </>
  );
}

/** «الموظفين»: full details (civil ID masked on screen), agreed salary, and every payment (counted as an expense). */
export async function EmployeesTab() {
  const T = await serverT();
  const admin = createAdminClient();
  const [{ data: em, error }, { data: pays }] = await Promise.all([
    admin.from("employees").select("*").order("is_active", { ascending: false }).order("created_at"),
    admin.from("expenses").select("id,spent_on,vendor,amount,currency,note,employee_id,pay_kind").not("employee_id", "is", null).order("spent_on", { ascending: false }).limit(300),
  ]);
  if (error) return <SqlNote />;
  const { usd_kwd: rate } = await financeSettings();
  const list = (em ?? []) as Employee[];
  const payments = (pays ?? []) as { id: string; spent_on: string; vendor: string; amount: number; currency: string; note: string | null; employee_id: string; pay_kind: string | null }[];
  const paidTo = (id: string) => payments.filter((p) => p.employee_id === id).reduce((a, p) => a + toKwd(p.amount, p.currency, rate), 0);
  const mask = (c: string | null) => (c ? `•••• ${c.slice(-4)}` : "—");
  return (
    <>
      <section className="card flex flex-col gap-3 p-5"><h2 className="text-lg font-bold">{T("إضافة موظف", "Add an employee")}</h2><EmployeeForm /></section>
      {list.length > 0 && (
        <section className="flex flex-col gap-3">
          {list.map((e) => (
            <details key={e.id} className={`card p-4 ${e.is_active ? "" : "opacity-70"}`}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span><span className="font-bold text-navy-900">{e.name}</span>{e.job_title && <span className="text-subtle"> · {e.job_title}</span>}{!e.is_active && <span className="ms-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs">{T("انتهى", "Ended")}</span>}</span>
                <span className="text-sm"><span className="text-subtle">{T("الراتب", "Salary")}:</span> <span className="font-latin font-bold">{e.salary ? `${Number(e.salary)} ${e.salary_currency === "KWD" ? "د.ك" : "$"}` : "—"}</span> · <span className="text-subtle">{T("مجموع اللي استلمه", "Total paid")}:</span> <span className="font-latin font-bold">{kd(paidTo(e.id))}</span></span>
              </summary>
              <form action={saveEmployee} className="mt-4 grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="id" value={e.id} /><input type="hidden" name="name" value={e.name} />
                <label className="flex flex-col gap-1 text-[13px] font-semibold">{T("الوظيفة", "Job title")}<input name="job_title" defaultValue={e.job_title ?? ""} className="field font-normal" /></label>
                <label className="flex flex-col gap-1 text-[13px] font-semibold">{T("الهاتف", "Phone")}<input name="phone" defaultValue={e.phone ?? ""} dir="ltr" className="field text-right font-normal" /></label>
                <label className="flex flex-col gap-1 text-[13px] font-semibold">{T("الإيميل", "Email")}<input name="email" defaultValue={e.email ?? ""} dir="ltr" className="field text-right font-normal" /></label>
                <label className="flex flex-col gap-1 text-[13px] font-semibold sm:col-span-2">{T("العنوان", "Address")}<input name="address" defaultValue={e.address ?? ""} className="field font-normal" /></label>
                <label className="flex flex-col gap-1 text-[13px] font-semibold">{T("الرقم المدني", "Civil ID")} <span className="font-latin font-normal text-subtle">{mask(e.civil_id)}</span><input name="civil_id" placeholder={T("اكتب بس إذا تبي تغيّره", "Type only to change it")} inputMode="numeric" dir="ltr" autoComplete="off" className="field text-right font-normal" /></label>
                <label className="flex flex-col gap-1 text-[13px] font-semibold">{T("الراتب الشهري", "Monthly salary")}<input name="salary" defaultValue={e.salary ?? ""} inputMode="decimal" dir="ltr" className="field text-right font-normal" /></label>
                <label className="flex items-center gap-2 text-[13px] font-semibold"><input type="checkbox" name="is_active" defaultChecked={e.is_active} className="h-5 w-5" />{T("على رأس العمل", "Currently employed")}</label>
                <label className="flex flex-col gap-1 text-[13px] font-semibold">{T("تاريخ الانتهاء (لو انتهى)", "End date (if ended)")}<input name="ends_on" type="date" defaultValue={e.ends_on ?? ""} className="field font-normal" /></label>
                <div className="sm:col-span-3"><button className="btn btn-outline px-5 py-2 text-sm">{T("حفظ التعديلات", "Save changes")}</button>
                  <span className="ms-3 text-[12px] text-subtle">{T("تاريخ التعيين", "Started")}: <span className="font-latin">{e.starts_on ?? "—"}</span></span></div>
              </form>
            </details>
          ))}
        </section>
      )}
      {list.some((e) => e.is_active) && <section className="card flex flex-col gap-3 p-5"><h2 className="text-lg font-bold">{T("دفعة لموظف", "Pay an employee")}</h2><p className="text-[13px] text-subtle">{T("المبلغ تقرره أنت. كل دفعة تنحسب تلقائياً من المصاريف (رواتب ومستحقات)، فتدخل بصافي الربح.", "You decide the amount. Each payment is added to expenses (salaries) automatically, so it counts in net profit.")}</p><PayForm employees={list.filter((e) => e.is_active).map((e) => ({ id: e.id, name: e.name }))} /></section>}
      {payments.length > 0 && (
        <section className="card overflow-x-auto p-2">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="text-right text-[13px] text-subtle"><th className="p-3">{T("التاريخ", "Date")}</th><th className="p-3">{T("الموظف", "Employee")}</th><th className="p-3">{T("النوع", "Type")}</th><th className="p-3">{T("المبلغ", "Amount")}</th><th className="p-3">{T("ملاحظة", "Note")}</th></tr></thead>
            <tbody>{payments.map((p) => (
              <tr key={p.id} className="border-t border-[#EDF1F6]"><td className="p-3 font-latin">{p.spent_on}</td><td className="p-3 font-semibold">{p.vendor}</td><td className="p-3">{PAY_KIND[p.pay_kind ?? ""] ?? "—"}</td><td className="p-3 font-latin">{kd(toKwd(p.amount, p.currency, rate))}</td><td className="p-3 text-subtle">{p.note ?? ""}</td></tr>
            ))}</tbody>
          </table>
          <p className="p-3 text-[12px] text-subtle">{T("لحذف دفعة: احذفها من تبويب «المصاريف».", "To delete a payment, delete it in «Expenses».")}</p>
        </section>
      )}
    </>
  );
}
