import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIT_AR } from "@/lib/server/audit";

/** «السجل الكامل»: everything about one customer on one timeline, newest first. */
export type LogGroup = "work" | "credits" | "money" | "account" | "admin" | "violation";
export type LogItem = { at: string; group: LogGroup; icon: string; title: string; detail: string; amount?: string; tone?: "good" | "bad" | "warn" };

export const GROUPS: { key: LogGroup; ar: string; en: string }[] = [
  { key: "work", ar: "الأعمال", en: "Work" },
  { key: "credits", ar: "الرصيد", en: "Credits" },
  { key: "money", ar: "المدفوعات", en: "Payments" },
  { key: "account", ar: "الحساب والدخول", en: "Account & sign-ins" },
  { key: "admin", ar: "الإدارة", en: "Admin" },
  { key: "violation", ar: "المخالفات", en: "Violations" },
];

type T = (ar: string, en: string) => string;
const LIMIT = 1000;

export async function customerLog(userId: string, T: T, L: (s: string) => string) {
  const admin = createAdminClient();
  const [profile, jobs, ledger, income, audit, events, tools, subs] = await Promise.all([
    admin.from("profiles").select("id,full_name,email,phone,credits,plan_id,created_at").eq("id", userId).maybeSingle(),
    admin.from("jobs").select("id,tool_id,title,status,credits_charged,refunded,error,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("credit_ledger").select("amount,reason,ref,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("income").select("amount,currency,description,method,received_on,created_at").eq("customer_id", userId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("admin_audit").select("action,admin_email,note,created_at").eq("target_user", userId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("user_events").select("kind,detail,ip,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(LIMIT),
    admin.from("tools").select("id,name"),
    admin.from("subscriptions").select("plan_id,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
  ]);
  const toolName = (id: string) => L(tools.data?.find((t) => t.id === id)?.name ?? id);
  const REASON: Record<string, [string, string]> = {
    subscription: ["اشتراك", "Subscription"], renewal_reset: ["تصفير التجديد", "Renewal reset"], spend: ["استخدام", "Usage"],
    refund: ["استرجاع", "Refund"], admin: ["تعديل إداري", "Admin adjustment"], referral: ["دعوة", "Referral"],
  };
  const STATUS: Record<string, [string, string]> = { done: ["✓ نجح", "✓ Done"], failed: ["✗ فشل", "✗ Failed"], running: ["قيد التنفيذ", "Running"], queued: ["بالانتظار", "Queued"] };
  const items: LogItem[] = [];

  for (const j of jobs.data ?? []) {
    const st = STATUS[j.status] ?? [j.status, j.status];
    items.push({
      at: j.created_at, group: "work", icon: "🎬", title: `${toolName(j.tool_id)}${j.title ? ` — ${j.title}` : ""}`,
      detail: `${T(st[0], st[1])}${j.credits_charged ? ` · ${j.credits_charged} ${T("ريشة", "credits")}` : ""}${j.refunded ? ` · ${T("انرجعت الريش", "credits refunded")}` : ""}${j.status === "failed" && j.error ? ` · ${String(j.error).slice(0, 120)}` : ""}`,
      tone: j.status === "failed" ? "bad" : j.status === "done" ? "good" : undefined,
    });
  }
  for (const l of ledger.data ?? []) {
    const r = REASON[l.reason] ?? [l.reason, l.reason];
    items.push({ at: l.created_at, group: "credits", icon: l.amount < 0 ? "➖" : "➕", title: T(r[0], r[1]), detail: l.ref && !/^[0-9a-f-]{30,}$/.test(l.ref) ? String(l.ref).slice(0, 120) : "", amount: `${l.amount > 0 ? "+" : ""}${l.amount}`, tone: l.amount < 0 ? "bad" : "good" });
  }
  for (const m of income.data ?? []) {
    items.push({ at: m.created_at ?? m.received_on, group: "money", icon: "💳", title: m.description, detail: m.method ?? "", amount: `${Number(m.amount).toFixed(m.currency === "KWD" ? 3 : 2)} ${m.currency === "KWD" ? T("د.ك", "KWD") : "$"}`, tone: "good" });
  }
  for (const s of subs.data ?? []) {
    items.push({ at: s.created_at, group: "money", icon: "📅", title: T(`اشتراك ${s.plan_id ?? ""}`, `Subscription ${s.plan_id ?? ""}`), detail: s.status });
  }
  for (const a of audit.data ?? []) {
    items.push({ at: a.created_at, group: "admin", icon: "👤", title: L(AUDIT_AR[a.action] ?? a.action), detail: `${a.note ?? ""}${a.admin_email ? ` · ${a.admin_email}` : ""}`.replace(/^ · /, "") });
  }
  const EV: Record<string, [string, string, string, LogGroup, LogItem["tone"]]> = {
    login: ["🔑", "سجّل دخول", "Signed in", "account", undefined],
    login_failed: ["🔐", "محاولة دخول بكلمة مرور خاطئة", "Failed sign-in (wrong password)", "account", "warn"],
    password: ["🔒", "غيّر كلمة المرور", "Changed password", "account", undefined],
    brand_reset: ["↺", "صفّر هويته", "Reset brand kit", "account", undefined],
    violation: ["⚠️", "طلب محتوى مخالف انمنع", "Blocked content-policy request", "violation", "bad"],
  };
  for (const e of events.data ?? []) {
    const d = EV[e.kind] ?? ["•", e.kind, e.kind, "account", undefined];
    items.push({ at: e.created_at, group: d[3], icon: d[0], title: T(d[1], d[2]), detail: [e.detail, e.ip ? `IP ${e.ip}` : ""].filter(Boolean).join(" · "), tone: d[4] });
  }
  if (profile.data) items.push({ at: profile.data.created_at, group: "account", icon: "🌱", title: T("أنشأ حسابه", "Created the account"), detail: "" });

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return { profile: profile.data, items };
}
