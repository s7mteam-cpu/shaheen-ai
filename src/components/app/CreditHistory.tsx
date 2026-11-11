import { createClient } from "@/lib/supabase/server";
import { getTools } from "@/lib/data";

export type Row = {
  id: number; amount: number; reason: string; job_id: string | null; created_at: string; ref?: string | null;
  jobs: { tool_id: string; title: string | null } | null;
};

const REASON: Record<string, string> = {
  subscription: "تجديد الباقة",
  renewal_reset: "انتهاء ريش الشهر اللحينبق",
  refund: "استرجاع — ما نجح العمل",
  admin: "ريش من فريق شاهين",
  referral: "مكافأة دعوة صديق",
};

const day = (d: string) => new Date(d).toLocaleDateString("ar-KW", { day: "numeric", month: "long", year: "numeric" });
const time = (d: string) => new Date(d).toLocaleTimeString("ar-KW", { hour: "numeric", minute: "2-digit" });

/** "مصاريف الريش": where every ريشة went, newest first. */
export async function CreditHistory({ balance }: { balance: number }) {
  const supabase = await createClient();
  const [{ data }, tools] = await Promise.all([
    supabase.from("credit_ledger").select("id,amount,reason,job_id,created_at,ref,jobs(tool_id,title)").order("created_at", { ascending: false }).limit(300),
    getTools(true),
  ]);
  return <CreditHistoryView rows={(data ?? []) as unknown as Row[]} tools={tools} balance={balance} />;
}

export function CreditHistoryView({ rows, tools, balance }: { rows: Row[]; tools: { id: string; name: string }[]; balance: number }) {
  const toolName = (id?: string) => tools.find((t) => t.id === id)?.name ?? "أداة";

  // the first spend on a job is the job itself; later spends on the same job are edits
  const firstSpend = new Map<string, number>();
  for (const r of [...rows].reverse()) if (r.reason === "spend" && r.job_id && !firstSpend.has(r.job_id)) firstSpend.set(r.job_id, r.id);

  // this period = since the last plan renewal, otherwise since the start of the month
  const lastRenewal = rows.find((r) => r.reason === "subscription")?.created_at;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const since = lastRenewal ? new Date(lastRenewal) : monthStart;
  const period = rows.filter((r) => new Date(r.created_at) >= since);
  const spent = period.filter((r) => r.reason === "spend").reduce((s, r) => s - r.amount, 0)
    - period.filter((r) => r.reason === "refund").reduce((s, r) => s + r.amount, 0);
  const refunded = new Set(rows.filter((r) => r.reason === "refund").map((r) => r.job_id));
  const works = period.filter((r) => r.reason === "spend" && r.job_id && firstSpend.get(r.job_id) === r.id && !refunded.has(r.job_id)).length;

  const byTool = new Map<string, number>();
  for (const r of period) {
    if ((r.reason === "spend" || r.reason === "refund") && r.jobs) byTool.set(r.jobs.tool_id, (byTool.get(r.jobs.tool_id) ?? 0) - r.amount);
  }
  const breakdown = [...byTool].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const top = breakdown[0]?.[1] ?? 1;

  const groups: { day: string; items: Row[] }[] = [];
  for (const r of rows) {
    const d = day(r.created_at);
    if (groups.at(-1)?.day !== d) groups.push({ day: d, items: [] });
    groups.at(-1)!.items.push(r);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          [`صرفت ${lastRenewal ? "من آخر تجديد" : "هذا الشهر"}`, spent.toLocaleString("en"), "ريشة"],
          ["رصيدك الحالي", balance.toLocaleString("en"), "ريشة"],
          ["أعمال جديدة", works.toLocaleString("en"), "عمل"],
        ].map(([label, v, unit], i) => (
          <div key={label} className={`flex flex-col gap-1 rounded-3xl p-6 ${i === 0 ? "bg-navy-800 text-white" : "card"}`}>
            <span className={`text-sm ${i === 0 ? "text-white/75" : "text-muted"}`}>{label}</span>
            <span className="flex items-baseline gap-1.5"><b className={`font-latin text-4xl ${i === 0 ? "text-gold-500" : "text-navy-900"}`}>{v}</b><span className="text-sm">{unit}</span></span>
          </div>
        ))}
      </div>

      {breakdown.length > 0 && (
        <section className="card flex flex-col gap-3.5 p-6">
          <h2 className="text-lg font-bold">على شنو صرفت {lastRenewal ? "من آخر تجديد" : "هذا الشهر"}</h2>
          {breakdown.map(([id, v]) => (
            <div key={id} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[15px]"><span className="font-semibold text-navy-900">{toolName(id)}</span><span className="font-latin font-bold">{v.toLocaleString("en")} <span className="font-sans text-sm font-normal text-muted">ريشة</span></span></div>
              <div className="h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.max(4, (v / top) * 100)}%` }} /></div>
            </div>
          ))}
        </section>
      )}

      <section className="card flex flex-col p-6">
        <h2 className="mb-2 text-lg font-bold">كل الحركات</h2>
        {groups.length === 0 && <p className="py-6 text-center text-muted">ما فيه حركات للحين. أول ما تستخدم أي أداة بتشوف مصاريفك هنا.</p>}
        {groups.map((g) => (
          <div key={g.day} className="flex flex-col">
            <h3 className="mt-3 border-b border-line pb-2 text-[13px] font-semibold text-subtle">{g.day}</h3>
            {g.items.map((r) => {
              const isEdit = r.reason === "spend" && r.job_id && firstSpend.get(r.job_id) !== r.id;
              const label = r.reason === "spend"
                ? `${isEdit ? "تعديل: " : ""}${toolName(r.jobs?.tool_id)}`
                : r.reason === "refund" ? (r.jobs ? `${REASON.refund} (${toolName(r.jobs.tool_id)})` : "استرجاع ريش") : r.reason === "renewal_reset" && r.ref?.startsWith("admin-reset") ? "تصفير الرصيد من الإدارة" : REASON[r.reason] ?? r.reason;
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 border-b border-line/60 py-3 last:border-0">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] font-semibold text-navy-900">{label}</span>
                    <span className="truncate text-[13px] text-subtle">{r.jobs?.title ? `${r.jobs.title} · ` : ""}{time(r.created_at)}</span>
                  </div>
                  <span dir="ltr" className={`shrink-0 font-latin text-[17px] font-bold ${r.amount > 0 ? "text-emerald-700" : "text-navy-900"}`}>{r.amount > 0 ? "+" : "−"}{Math.abs(r.amount).toLocaleString("en")}</span>
                </div>
              );
            })}
          </div>
        ))}
      </section>
    </div>
  );
}
