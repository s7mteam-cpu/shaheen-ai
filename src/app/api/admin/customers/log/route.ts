import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/server/auth";
import { getL, serverT } from "@/lib/server/lang";
import { customerLog, GROUPS } from "@/lib/server/customerLog";

export const dynamic = "force-dynamic";

/** «تنزيل Excel» of one customer's full history (right-to-left sheet). */
export async function GET(req: Request) {
  if (!(await requireAdmin("customers"))) return new Response("غير مصرّح", { status: 403 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("bad id", { status: 400 });
  const T = await serverT();
  const { profile, items } = await customerLog(id, T, await getL());
  if (!profile) return new Response("not found", { status: 404 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "منصة شاهين"; wb.created = new Date();
  const ws = wb.addWorksheet(T("السجل", "History"), { views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }] });
  ws.columns = [{ width: 20 }, { width: 18 }, { width: 40 }, { width: 50 }, { width: 14 }];
  const head = (r: ExcelJS.Row, fill?: string) => { r.font = { name: "Arial", bold: true, ...(fill ? { color: { argb: "FFFFFFFF" } } : {}) }; if (fill) r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }; };
  head(ws.addRow([T("العميل", "Customer"), profile.full_name ?? "", profile.email ?? "", profile.phone ?? ""]));
  head(ws.addRow([T("الرصيد الحالي", "Current balance"), profile.credits, T("تاريخ التسجيل", "Signed up"), String(profile.created_at).slice(0, 10)]));
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
