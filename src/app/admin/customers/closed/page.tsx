import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLang, serverT } from "@/lib/server/lang";
import { REASON_AR, KEEP_YEARS, type CloseReason } from "@/lib/server/archive";

export const dynamic = "force-dynamic";

type Row = { key: string; name: string; email: string; phone: string; status: string; tone: string; when?: string; whenLabel?: string; by?: string; note?: string; purge?: string; log: string; manage?: string };
const TABS = [
  { key: "deleted", ar: "محذوفة", en: "Deleted" },
  { key: "banned", ar: "محظورة", en: "Banned" },
  { key: "suspended", ar: "موقوفة", en: "Suspended" },
  { key: "cancelled", ar: "ملغية الاشتراك", en: "Cancelled plan" },
] as const;

/** «الحسابات المغلقة»: deleted and banned accounts (kept 5 years), plus live suspended and cancelled ones. */
export default async function Closed({ searchParams }: { searchParams: Promise<{ t?: string; q?: string }> }) {
  await guardPage("customers");
  const T = await serverT();
  const lang = await getLang();
  const { t = "deleted", q = "" } = await searchParams;
  const tab = TABS.find((x) => x.key === t)?.key ?? "deleted";
  const admin = createAdminClient();
  const fmt = (s?: string | null) => (s ? new Date(s).toLocaleDateString(lang === "en" ? "en-GB" : "ar-KW", { timeZone: "Asia/Kuwait" }) : "—");
  const term = q.trim().replace(/[,()*%]/g, "").slice(0, 60);
  const like = (cols: string[]) => cols.map((c) => `${c}.ilike.%${term}%`).join(",");

  const [{ data: archived, error: archErr }, { data: blocked }, { data: cleanup }] = await Promise.all([
    (() => { let x = admin.from("closed_accounts").select("id,full_name,email,phone,closed_at,reason,closed_by,note,purge_at").order("closed_at", { ascending: false }).limit(300);
      x = tab === "banned" ? x.eq("reason", "banned") : x.in("reason", ["self", "admin"]);
      return term ? x.or(like(["full_name", "email", "phone"])) : x; })(),
    admin.from("blocked_emails").select("email,reason,created_at"),
    admin.from("site_content").select("value").eq("key", "archive_cleanup").maybeSingle(),
  ]);
  const blockedSet = new Map((blocked ?? []).map((b) => [b.email.toLowerCase(), b]));
  const rows: Row[] = [];

  if (tab === "deleted" || tab === "banned") {
    for (const a of archived ?? []) {
      const r = REASON_AR[a.reason as CloseReason] ?? [a.reason, a.reason];
      rows.push({ key: a.id, name: a.full_name ?? "", email: a.email ?? "", phone: a.phone ?? "", status: T(r[0], r[1]), tone: a.reason === "banned" ? "bg-red-100 text-red-800" : a.reason === "admin" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700",
        when: fmt(a.closed_at), whenLabel: T("أُغلق", "Closed"), by: a.closed_by ?? "", note: a.note ?? "", purge: fmt(a.purge_at), log: `/admin/customers/log?archived=${a.id}` });
    }
  }
  if (tab !== "deleted") {
    let ids: string[] | null = null;
    if (tab === "cancelled") {
      const { data: subs } = await admin.from("subscriptions").select("user_id,status,cancel_at_period_end,current_period_end").order("updated_at", { ascending: false }).limit(2000);
      const latest = new Map<string, { status: string; cancel_at_period_end: boolean | null; current_period_end: string | null }>();
      for (const s of subs ?? []) if (!latest.has(s.user_id)) latest.set(s.user_id, s);
      ids = [...latest].filter(([, s]) => s.status === "canceled" || s.cancel_at_period_end).map(([id]) => id);
    }
    let x = admin.from("profiles").select("id,full_name,email,phone,is_suspended,created_at").eq("role", "user").limit(300);
    if (tab === "banned") x = x.in("email", [...blockedSet.keys()].length ? [...blockedSet.keys()] : ["-"]);
    if (tab === "suspended") x = x.eq("is_suspended", true);
    if (ids) x = x.in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    if (term) x = x.or(like(["full_name", "email", "phone"]));
    const { data: live } = await x;
    for (const p of live ?? []) {
      const b = blockedSet.get((p.email ?? "").toLowerCase());
      if (tab === "suspended" && b) continue; // shown under «محظورة»
      rows.push({ key: p.id, name: p.full_name ?? "", email: p.email ?? "", phone: p.phone ?? "",
        status: tab === "banned" ? T("محظور — الحساب موجود", "Banned — account still exists") : tab === "suspended" ? T("موقوف", "Suspended") : T("ملغي الاشتراك", "Plan cancelled"),
        tone: tab === "banned" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700",
        when: tab === "banned" ? fmt(b?.created_at) : undefined, whenLabel: T("انحظر", "Banned"), note: b?.reason ?? "", log: `/admin/customers/log?id=${p.id}`, manage: `/admin/customers?id=${p.id}#manage` });
    }
  }
  const c = cleanup?.value as { at?: string; removed?: number } | undefined;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/admin/customers" className="text-sm font-semibold text-navy-700">{T("← رجوع للعملاء", "← Back to customers")}</Link>
        <h1 className="mt-1 text-[26px] font-bold">{T("الحسابات المغلقة", "Closed accounts")}</h1>
        <p className="mt-1 text-sm text-subtle">{T(`الحسابات المحذوفة والمحظورة ينحفظ اسمها ورقمها وسبب إغلاقها وسجلها الكامل ${KEEP_YEARS} سنوات، وبعدها تنحذف تلقائياً (حسب سياسة الخصوصية). الأعمال والملفات ما تنحفظ.`, `Deleted and banned accounts keep their name, phone, closing reason and full history for ${KEEP_YEARS} years, then are deleted automatically (per the Privacy Policy). Works and files are not kept.`)}</p>
        <p className="mt-1 text-[13px] text-subtle">🧹 {c?.at ? T(`آخر تنظيف تلقائي: ${new Date(c.at).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait" })} — انحذف ${c.removed ?? 0} حساب`, `Last automatic cleanup: ${new Date(c.at).toLocaleString("en-GB", { timeZone: "Asia/Kuwait" })} — ${c.removed ?? 0} removed`) : T("التنظيف التلقائي يشتغل كل يوم الساعة 8 الصبح (بتوقيت الكويت).", "The automatic cleanup runs every day at 8 AM (Kuwait time).")}</p>
      </div>
      {archErr && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{T("شغّل ملف SQL الخاص بالتحديث v64 حتى يشتغل الأرشيف.", "Run the v64 SQL file to turn the archive on.")}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2">{TABS.map((x) => (
          <Link key={x.key} href={`?t=${x.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === x.key ? "bg-navy-900 text-white" : "bg-white text-navy-900 ring-1 ring-[#E3E8EF]"}`}>{T(x.ar, x.en)}</Link>
        ))}</nav>
        <form className="flex gap-2"><input type="hidden" name="t" value={tab} /><input name="q" defaultValue={q} placeholder={T("ابحث بالاسم أو البريد أو الرقم", "Search name, email or phone")} className="field w-60 py-2" /><button className="btn btn-outline px-4 py-2">{T("بحث", "Search")}</button></form>
      </div>

      {rows.length === 0 ? <p className="card p-6 text-sm text-subtle">{T("ما فيه حسابات هنا.", "No accounts here.")}</p> : (
        <ul className="grid gap-3 md:grid-cols-2">{rows.map((r) => (
          <li key={r.key} className="card flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="truncate font-bold text-navy-900">{r.name || "—"}</p><p dir="ltr" className="truncate text-left font-latin text-[13px] text-subtle">{r.email}</p>{r.phone && <p dir="ltr" className="text-left font-latin text-[13px] text-subtle">{r.phone}</p>}</div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${r.tone}`}>{r.status}</span>
            </div>
            <div className="text-[13px] leading-6 text-navy-900">
              {r.when && <p>{r.whenLabel}: {r.when}{r.by ? <> · {T("بواسطة", "by")} <span dir="ltr">{r.by}</span></> : null}</p>}
              {r.note && <p>{T("السبب", "Reason")}: {r.note}</p>}
              {r.purge && <p className="text-subtle">{T("ينحذف تلقائياً في", "Auto-deleted on")}: {r.purge}</p>}
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link href={r.log} className="btn btn-outline px-3 py-2 text-sm">📜 {T("السجل الكامل", "Full history")}</Link>
              {r.manage && <Link href={r.manage} className="btn btn-outline px-3 py-2 text-sm">{T("إدارة العميل", "Manage")}</Link>}
            </div>
          </li>
        ))}</ul>
      )}
    </div>
  );
}
