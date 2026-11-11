"use client";
import { useActionState, useState } from "react";
import { resetPlatform } from "./actions";
import { L, LT } from "@/lib/i18n/ui";

export type Counts = { customers: number; jobs: number; moves: number; leads: number; notes: number; holders: number; balance: number };
type Opt = { key: string; title: string; desc: string };
type Group = { id: string; title: string; hint: string; tone: "navy" | "red"; opts: Opt[] };

export function ResetForm({ phrase, counts }: { phrase: string; counts: Counts }) {
  const [state, action, pending] = useActionState(resetPlatform, undefined);
  const [pick, setPick] = useState<Record<string, boolean>>({});
  const [sure, setSure] = useState(false);
  const [text, setText] = useState("");
  const n = (x: number) => x.toLocaleString("en");

  const groups: Group[] = [
    {
      id: "counters", tone: "navy", title: L("1. عدّادات لوحة «نظرة عامة»"),
      hint: L("يرجع العدّاد صفر ويبدأ يعدّ من الآن. البيانات نفسها ما بتنمسح."),
      opts: [
        { key: "c_subs", title: L("المشتركون النشطون"), desc: L("يعدّ الاشتراكات من الآن.") },
        { key: "c_revenue", title: L("الإيراد الشهري"), desc: L("يحسب الإيراد من الآن.") },
        { key: "c_accounts", title: L("كل الحسابات"), desc: L("يعدّ الحسابات الجديدة من الآن.") },
        { key: "c_spent", title: L("ريش مستهلكة هذا الشهر"), desc: L("يعدّ الصرف من الآن.") },
        { key: "c_jobs", title: L("طلبات هذا الشهر"), desc: L("يعدّ الطلبات من الآن.") },
        { key: "c_failed", title: L("طلبات فاشلة هذا الشهر"), desc: L("يعدّ الفاشلة من الآن.") },
      ],
    },
    {
      id: "credits", tone: "red", title: L("2. الريش"),
      hint: L("الخياران منفصلين: السجل شي، والرصيد اللي مع العميل شي ثاني."),
      opts: [
        { key: "history", title: L("سجل حركات الريش (الداخل والطالع)"), desc: LT(`يمسح ${n(counts.moves)} حركة من السجل: الصرف والشحن والاسترجاع والهدايا. رصيد كل عميل بيظل مثل ما هو.`, `Deletes ${n(counts.moves)} entries from the log: spending, top-ups, refunds and gifts. Every customer's balance stays the same.`) },
        { key: "balances", title: L("أرصدة العملاء"), desc: LT(`يرجّع رصيد ${n(counts.holders)} حساب صفر (مجموعهم ${n(counts.balance)} ريشة). بينسجّل كـ«تصفير من الإدارة» بسجل كل عميل، وما بيوصلهم إشعار.`, `Sets the balance of ${n(counts.holders)} accounts to zero (${n(counts.balance)} credits in total). Logged as «Reset by admin» in each customer's history, with no notification.`) },
      ],
    },
    {
      id: "data", tone: "red", title: L("3. البيانات والحسابات"),
      hint: L("حذف نهائي. الباقات والأسعار والأدوات ومحتوى الموقع وحسابات المدراء بتظل دائماً."),
      opts: [
        { key: "jobs", title: L("الأعمال والملفات"), desc: LT(`يمسح ${n(counts.jobs)} عمل مع الصور والفيديوهات المرفوعة والنتائج.`, `Deletes ${n(counts.jobs)} works with their uploaded images, videos and results.`) },
        { key: "customers", title: L("حسابات العملاء"), desc: LT(`يحذف ${n(counts.customers)} حساب عميل نهائياً مع كل اللي إلهم.`, `Permanently deletes ${n(counts.customers)} customer accounts with everything they own.`) },
        { key: "leads", title: L("طلبات الإدارة الكاملة"), desc: LT(`يمسح ${n(counts.leads)} طلب من نموذج باقة الإدارة الكاملة.`, `Deletes ${n(counts.leads)} requests from the managed-service form.`) },
        { key: "notes", title: L("الإشعارات"), desc: LT(`يمسح ${n(counts.notes)} إشعار عند كل العملاء.`, `Deletes ${n(counts.notes)} notifications for all customers.`) },
      ],
    },
    {
      id: "admin", tone: "navy", title: L("4. لوحة الإدارة"),
      hint: "",
      opts: [{ key: "changelog", title: L("قائمة آخر التعديلات"), desc: L("يفضّي صفحة «آخر التعديلات». التحديثات الجاية بتطلع فيها من جديد.") }],
    },
  ];
  const all = groups.flatMap((g) => g.opts);
  const chosen = all.filter((o) => pick[o.key]);
  const ready = chosen.length > 0 && sure && text.trim().toUpperCase() === phrase.toUpperCase();
  const toggleGroup = (g: Group, v: boolean) => setPick({ ...pick, ...Object.fromEntries(g.opts.map((o) => [o.key, v])) });

  return (
    <form action={action} className="flex flex-col gap-4">
      {groups.map((g) => {
        const allOn = g.opts.every((o) => pick[o.key]);
        return (
          <fieldset key={g.id} className="card flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <legend className={`text-lg font-bold ${g.tone === "red" ? "text-red-800" : "text-navy-900"}`}>{g.title}</legend>
              {g.opts.length > 1 && <button type="button" onClick={() => toggleGroup(g, !allOn)} className="text-sm font-semibold text-navy-700 underline">{allOn ? L("إلغاء التحديد") : L("تحديد الكل")}</button>}
            </div>
            {g.hint && <p className="-mt-1 text-[13px] text-subtle">{g.hint}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {g.opts.map((o) => (
                <label key={o.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${pick[o.key] ? (g.tone === "red" ? "border-red-300 bg-red-50/70" : "border-navy-700/40 bg-tint") : "border-line bg-white hover:border-field"}`}>
                  <input type="checkbox" name={o.key} checked={!!pick[o.key]} onChange={(e) => setPick({ ...pick, [o.key]: e.target.checked })} className={`mt-1 h-5 w-5 shrink-0 ${g.tone === "red" ? "accent-red-700" : "accent-[#0B2A4A]"}`} />
                  <span className="flex flex-col gap-0.5"><span className="font-bold text-navy-900">{o.title}</span><span className="text-[13px] leading-6 text-subtle">{o.desc}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-red-200 bg-red-50/60 p-5">
        <div>
          <p className="font-bold text-red-900">{L("راح يتصفّر (")}{chosen.length}):</p>
          <p className="text-sm leading-7 text-navy-900">{chosen.length ? chosen.map((o) => o.title).join(" · ") : L("ما اخترت شي للحين.")}</p>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-[15px] font-semibold text-red-900">
          <input type="checkbox" name="sure" checked={sure} onChange={(e) => setSure(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-red-700" />
          {L("أفهم إن الحذف نهائي، وما فيه أي طريقة لإرجاع اللي انحذف.")}
        </label>
        <label htmlFor="reset-confirm" className="text-sm font-semibold">{L("للتأكيد اكتب:")} <strong className="text-red-700">{phrase}</strong></label>
        <input id="reset-confirm" name="confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className="field max-w-xs bg-white" />
        {state?.ok && <p role="status" className="text-sm font-semibold text-emerald-700">{state.ok}</p>}
        {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
        <button disabled={!ready || pending} className="btn self-start bg-red-700 px-6 py-3 font-bold text-white hover:bg-red-800 disabled:opacity-40">
          {pending ? L("جارٍ التصفير… لا تسكّر الصفحة") : LT(`صفّر ${chosen.length ? `(${chosen.length})` : ""}`, `Reset ${chosen.length ? `(${chosen.length})` : ""}`)}
        </button>
      </div>
    </form>
  );
}
