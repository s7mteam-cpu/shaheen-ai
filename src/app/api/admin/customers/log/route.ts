import ExcelJS from "exceljs";
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

  const wb = new ExcelJS.Workbook();
  wb.creator = "منصة شاهين"; wb.created = new Date();
  const ws = wb.addWorksheet(T("السجل", "History"), { views: [{ rightToLeft: true, state: "frozen", ySplit: arch ? (arch.archived.note ? 6 : 5) : 4 }] });
  ws.columns = [{ width: 20 }, { width: 18 }, { width: 40 }, { width: 50 }, { width: 14 }];
  const head = (r: ExcelJS.Row, fill?: string) => { r.font = { name: "Arial", bold: true, ...(fill ? { color: { argb: "FFFFFFFF" } } : {}) }; if (fill) r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }; };
  head(ws.addRow([T("العميل", "Customer"), profile.full_name ?? "", profile.email ?? "", profile.phone ?? ""]));
  head(ws.addRow([T("الرصيد الحالي", "Current balance"), profile.credits, T("تاريخ التسجيل", "Signed up"), String(profile.created_at).slice(0, 10)]));
  if (arch) {
    const a = arch.archived;
    head(ws.addRow([T("حالة الحساب", "Account status"), T(REASON_AR[a.reason][0], REASON_AR[a.reason][1]), T("تاريخ الإغلاق", "Closed on"), new Date(a.closed_at).toLocaleDateString("en-GB", { timeZone: "Asia/Kuwait" }), a.closed_by ?? ""]));
    if (a.note) head(ws.addRow([T("السبب", "Reason"), a.note]));
  }
  ws.addRow([]);
  head(ws.addRow([T("الوقت", "Time"), T("النوع", "Type"), T("الحدث", "Event"), T("التفاصيل", "Details"), T("المبلغ", "Amount")]), "FF0B2A4A");
  const groupName = (k: string) => { const g = GROUPS.find((x) => x.key === k); return g ? T(g.ar, g.en) : k; };
  for (const i of items) {
    const r = ws.addRow([new Date(i.at).toLocaleString("en-GB", { timeZone: "Asia/Kuwait", dateStyle: "short", timeStyle: "short" }), groupName(i.group), i.title, i.detail, i.amount ?? ""]);
    r.font = { name: "Arial", size: 11 };
  }
  const buf = await wb.xlsx.writeBuffer();
  const safe = (profile.full_name || profile.email || "customer").replace(/[^\p{L}\p{N}@._-]+/gu, "-").slice(0, 40);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="shaheen-customer-log.xlsx"; filename*=UTF-8''${encodeURIComponent(`سجل-${safe}.xlsx`)}`,
    },
  });
}
