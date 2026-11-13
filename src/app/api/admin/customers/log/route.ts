import { newBook, styledSheet, kwDate, FMT, xlsxResponse } from "@/lib/server/xlsx";
import { requireAdmin } from "@/lib/server/auth";
import { getL, serverT } from "@/lib/server/lang";
import { customerLog, GROUPS } from "@/lib/server/customerLog";
import { archivedLog, REASON_AR } from "@/lib/server/archive";

export const dynamic = "force-dynamic";

/** «تنزيل Excel» of one customer's full history (right-to-left sheet). */
export async function GET(req: Request) {
  if (!(await requireAdmin("customers"))) return new Response("غير مصرّح", { status: 403 });
  const sp = new URL(req.url).searchParams;
  const id = sp.get("id") ?? "", archId = sp.get("archived") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(archId || id)) return new Response("bad id", { status: 400 });
  const T = await serverT();
  const arch = archId ? await archivedLog(archId) : null;
  const { profile, items } = arch ?? await customerLog(id, T, await getL());
  if (!profile) return new Response("not found", { status: 404 });

  const wb = newBook();
  const a = arch?.archived;
  const status = a ? `${T(REASON_AR[a.reason][0], REASON_AR[a.reason][1])} · ${new Date(a.closed_at).toLocaleDateString("en-GB", { timeZone: "Asia/Kuwait" })}${a.note ? ` · ${a.note}` : ""}` : "";
  const ws = styledSheet(wb, T("السجل", "History"), {
    title: `${T("السجل الكامل", "Full history")}: ${profile.full_name || profile.email || ""}`,
    subtitle: [profile.email, profile.phone, `${T("الرصيد", "Balance")}: ${profile.credits}`, `${T("تاريخ التسجيل", "Joined")}: ${String(profile.created_at).slice(0, 10)}`, status].filter(Boolean).join("   ·   "),
    columns: [
      { header: T("الوقت", "Time"), key: "t", width: 18, fmt: FMT.datetime }, { header: T("النوع", "Type"), key: "g", width: 16, align: "center" },
      { header: T("الحدث", "Event"), key: "e", width: 38 }, { header: T("التفاصيل", "Details"), key: "d", width: 46 }, { header: T("المبلغ", "Amount"), key: "a", width: 14, align: "center" },
    ],
  });
  const groupName = (k: string) => { const g = GROUPS.find((x) => x.key === k); return g ? T(g.ar, g.en) : k; };
  const tone: Record<string, string> = { good: "FF2E7D32", bad: "FFC62828", warn: "FFB26A00" };
  for (const i of items) {
    const r = ws.add({ t: kwDate(i.at), g: groupName(i.group), e: i.title, d: i.detail, a: i.amount ?? "" });
    if (i.tone) for (const k of ["d", "a"]) r.getCell(k).font = { name: "Arial", size: 11, bold: k === "a", color: { argb: tone[i.tone] } };
  }
  ws.finish();
  const safe = (profile.full_name || profile.email || "customer").replace(/[^\p{L}\p{N}@._-]+/gu, "-").slice(0, 40);
  return xlsxResponse(wb, "shaheen-customer-log.xlsx", `سجل-${safe}.xlsx`);
}
