import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { getL, serverT, getLang } from "@/lib/server/lang";
import { customerLog, GROUPS, type LogGroup } from "@/lib/server/customerLog";
import { archivedLog, previousClosed, REASON_AR } from "@/lib/server/archive";

export const dynamic = "force-dynamic";

/** «السجل الكامل» of one customer: work, credits, payments, sign-ins, admin actions and violations. */
export default async function CustomerLog({ searchParams }: { searchParams: Promise<{ id?: string; g?: string; archived?: string }> }) {
  await guardPage("customers");
  const T = await serverT();
  const L = await getL();
  const lang = await getLang();
  const { id = "", g = "", archived: archId = "" } = await searchParams;
  const arch = archId ? await archivedLog(archId) : null;
  const { profile, items } = arch ?? (/^[0-9a-f-]{36}$/.test(id) ? await customerLog(id, T, L) : { profile: null, items: [] });
  const previous = !arch && profile ? await previousClosed(profile.email, profile.phone).catch(() => []) : [];
  const self = arch ? `archived=${arch.archived.id}` : `id=${profile?.id ?? ""}`;
  if (!profile) return (
    <div className="card p-6"><p>{T("ما لقينا هالعميل (يمكن انحذف حسابه).", "Customer not found (the account may have been deleted).")}</p><Link href="/admin/customers" className="mt-3 inline-block font-semibold text-navy-700 underline">{T("← رجوع للعملاء", "← Back to customers")}</Link></div>
  );
  const group = GROUPS.some((x) => x.key === g) ? (g as LogGroup) : null;
  const shown = group ? items.filter((i) => i.group === group) : items;
  const count = (k: LogGroup) => items.filter((i) => i.group === k).length;
  const fmt = (s: string) => new Date(s).toLocaleString(lang === "en" ? "en-GB" : "ar-KW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuwait" });
  const tone = { good: "text-emerald-700", bad: "text-red-700", warn: "text-amber-700" } as const;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {arch ? <Link href="/admin/customers/closed" className="text-sm font-semibold text-navy-700">{T("← رجوع للحسابات المغلقة", "← Back to closed accounts")}</Link>
            : <Link href={`/admin/customers?id=${profile.id}#manage`} className="text-sm font-semibold text-navy-700">{T("← رجوع لإدارة العميل", "← Back to customer")}</Link>}
          <h1 className="mt-1 text-[26px] font-bold">{T("السجل الكامل", "Full history")}: {profile.full_name || profile.email}</h1>
          <p className="mt-1 text-sm text-subtle"><span dir="ltr" className="font-latin">{profile.email}</span>{profile.phone ? <> · <span dir="ltr" className="font-latin">{profile.phone}</span></> : null} · {T(arch ? "الرصيد عند الإغلاق" : "الرصيد", arch ? "Balance at closing" : "Balance")}: {profile.credits} {T("ريشة", "credits")}</p>
        </div>
        <a href={`/api/admin/customers/log?${self}`} className="btn btn-primary px-5 py-2.5">⬇ {T("تنزيل Excel", "Download Excel")}</a>
      </div>

      {arch && (
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-[14px] leading-7 text-navy-900">
          <p className="font-bold text-red-800">🔒 {T("حساب مغلق", "Closed account")} — {T(REASON_AR[arch.archived.reason][0], REASON_AR[arch.archived.reason][1])}</p>
          <p>{T("أُغلق", "Closed")}: {fmt(arch.archived.closed_at)}{arch.archived.closed_by ? <> · {T("بواسطة", "by")} <span dir="ltr">{arch.archived.closed_by}</span></> : null}</p>
          {arch.archived.note && <p>{T("السبب", "Reason")}: {arch.archived.note}</p>}
          <p className="text-subtle">{T("ينحذف هالسجل تلقائياً في", "This record is deleted automatically on")}: {fmt(arch.archived.purge_at)}</p>
        </div>
      )}
      {previous.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[14px] leading-7 text-amber-900">
          <p className="font-bold">⚠️ {T("هالعميل عنده حساب سابق مغلق بنفس البريد أو الرقم", "This customer had a closed account with the same email or phone")}</p>
          {previous.map((p) => <p key={p.id}><Link href={`/admin/customers/log?archived=${p.id}`} className="font-semibold underline">{T(REASON_AR[p.reason as keyof typeof REASON_AR]?.[0] ?? p.reason, REASON_AR[p.reason as keyof typeof REASON_AR]?.[1] ?? p.reason)} · {fmt(p.closed_at)}</Link>{p.note ? ` — ${p.note}` : ""}</p>)}
        </div>
      )}
      <nav className="flex flex-wrap gap-2">
        <Link href={`?${self}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${!group ? "bg-navy-900 text-white" : "bg-white text-navy-900 ring-1 ring-[#E3E8EF]"}`}>{T("الكل", "All")} ({items.length})</Link>
        {GROUPS.map((x) => (
          <Link key={x.key} href={`?${self}&g=${x.key}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${group === x.key ? "bg-navy-900 text-white" : "bg-white text-navy-900 ring-1 ring-[#E3E8EF]"}`}>{T(x.ar, x.en)} ({count(x.key)})</Link>
        ))}
      </nav>

      <section className="card p-2 sm:p-4">
        {shown.length === 0 ? <p className="p-4 text-sm text-subtle">{T("ما فيه شي هنا للحين.", "Nothing here yet.")}</p> : (
          <ol className="flex flex-col">
            {shown.map((i, n) => (
              <li key={n} className="flex items-start gap-3 border-b border-[#EDF1F6] px-2 py-3 last:border-0">
                <span className="mt-0.5 w-6 shrink-0 text-center text-lg">{i.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900">{i.title}</p>
                  {i.detail && <p className={`mt-0.5 break-words text-[13px] ${i.tone ? tone[i.tone] : "text-subtle"}`}>{i.detail}</p>}
                  <p className="mt-0.5 text-[12px] text-subtle">{fmt(i.at)}</p>
                </div>
                {i.amount && <span dir="ltr" className={`shrink-0 font-latin font-bold ${i.tone ? tone[i.tone] : ""}`}>{i.amount}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
      <p className="text-[12px] text-subtle">{T("إذا انحذف الحساب، ينحفظ هالسجل بـ«الحسابات المغلقة» 5 سنوات وبعدها ينحذف تلقائياً، حسب سياسة الخصوصية.", "If the account is deleted, this history is kept in «Closed accounts» for 5 years and then deleted automatically, as the Privacy Policy says.")}</p>
    </div>
  );
}
