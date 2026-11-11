import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORY, financeSettings, postRecurring, type Expense, type Income } from "@/lib/server/finance";

export const dynamic = "force-dynamic";
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** «تحميل Excel»: summary, expenses, income and customers for one year, ready for an accountant. */
export async function GET(req: Request) {
  if (!(await requireAdmin("finance"))) return new Response("غير مصرّح", { status: 403 });
  const year = Number(new URL(req.url).searchParams.get("year")) || new Date().getFullYear();
  await postRecurring().catch(() => {});
  const admin = createAdminClient();
  const { usd_kwd: rate } = await financeSettings();
  const from = `${year}-01-01`, to = `${year}-12-31`;
  const [{ data: ex }, { data: inc }, { data: people }, { data: plans }] = await Promise.all([
    admin.from("expenses").select("*").gte("spent_on", from).lte("spent_on", to).order("spent_on"),
    admin.from("income").select("*").gte("received_on", from).lte("received_on", to).order("received_on"),
    admin.from("profiles").select("full_name,email,phone,plan_id,credits,role,created_at").order("created_at"),
    admin.from("plans").select("id,name"),
  ]);
  const expenses = (ex ?? []) as Expense[], income = (inc ?? []) as Income[];

  const wb = new ExcelJS.Workbook();
  wb.creator = "منصة شاهين";
  wb.created = new Date();
  const navy = "FF0B2A4A", gold = "FFC9A45C";
  const sheet = (name: string, cols: { header: string; key: string; width: number; fmt?: string }[]) => {
    const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
    ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width, style: { font: { name: "Arial", size: 11 }, ...(c.fmt ? { numFmt: c.fmt } : {}) } }));
    const h = ws.getRow(1);
    h.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: navy } };
    h.height = 22;
    return ws;
  };
  const KD = '#,##0.000 "د.ك"';

  // 1) Summary: live formulas over the other sheets, so edits in Excel recalculate.
  const s = sheet("الملخص", [
    { header: "الشهر", key: "m", width: 14 }, { header: "الإيرادات (د.ك)", key: "i", width: 18, fmt: KD },
    { header: "المصاريف (د.ك)", key: "e", width: 18, fmt: KD }, { header: "الصافي (د.ك)", key: "n", width: 18, fmt: KD },
  ]);
  MONTHS.forEach((name, i) => {
    const r = i + 2, mm = String(i + 1).padStart(2, "0");
    s.addRow({ m: name });
    s.getCell(`B${r}`).value = { formula: `SUMPRODUCT((LEFT('الإيرادات'!A2:A5000,7)="${year}-${mm}")*'الإيرادات'!H2:H5000)` };
    s.getCell(`C${r}`).value = { formula: `SUMPRODUCT((LEFT('المصاريف'!A2:A5000,7)="${year}-${mm}")*'المصاريف'!F2:F5000)` };
    s.getCell(`D${r}`).value = { formula: `B${r}-C${r}` };
  });
  const tot = s.addRow({ m: `مجموع ${year}` });
  tot.getCell("B").value = { formula: "SUM(B2:B13)" };
  tot.getCell("C").value = { formula: "SUM(C2:C13)" };
  tot.getCell("D").value = { formula: "SUM(D2:D13)" };
  tot.font = { name: "Arial", bold: true };
  tot.fill = { type: "pattern", pattern: "solid", fgColor: { argb: gold } };
  s.addRow({});
  s.addRow({ m: "سعر الدولار بالدينار", i: rate }).getCell("B").numFmt = "0.000";
  s.addRow({ m: "ملاحظة", i: "المبالغ بالدولار تحوّلت للدينار بهالسعر. غيّر الأرقام بالأوراق الثانية والملخص بيتحدّث لحاله." });

  // 2) Expenses
  const e = sheet("المصاريف", [
    { header: "التاريخ", key: "d", width: 12 }, { header: "الجهة", key: "v", width: 24 }, { header: "النوع", key: "c", width: 16 },
    { header: "المبلغ", key: "a", width: 12, fmt: "#,##0.000" }, { header: "العملة", key: "cur", width: 8 }, { header: "بالدينار", key: "k", width: 14, fmt: KD },
    { header: "المصدر", key: "src", width: 14 }, { header: "ملاحظة", key: "note", width: 30 },
  ]);
  expenses.forEach((x, i) => {
    const r = e.addRow({ d: x.spent_on, v: x.vendor, c: CATEGORY[x.category] ?? x.category, a: Number(x.amount), cur: x.currency, src: x.source === "manual" ? "يدوي" : "تلقائي", note: x.note ?? "" });
    r.getCell("k").value = x.currency === "KWD" ? { formula: `D${i + 2}` } : { formula: `D${i + 2}*'الملخص'!B16` };
  });

  // 3) Income
  const n = sheet("الإيرادات", [
    { header: "التاريخ", key: "d", width: 12 }, { header: "الوصف", key: "desc", width: 28 }, { header: "العميل", key: "cust", width: 22 },
    { header: "الطريقة", key: "m", width: 12 }, { header: "المبلغ", key: "a", width: 12, fmt: "#,##0.000" }, { header: "العملة", key: "cur", width: 8 },
    { header: "المصدر", key: "src", width: 12 }, { header: "بالدينار", key: "k", width: 14, fmt: KD },
  ]);
  income.forEach((x, i) => {
    const r = n.addRow({ d: x.received_on, desc: x.description, cust: x.customer_name ?? "", m: x.method ?? "", a: Number(x.amount), cur: x.currency, src: x.source === "manual" ? "يدوي" : "تلقائي" });
    r.getCell("k").value = x.currency === "KWD" ? { formula: `E${i + 2}` } : { formula: `E${i + 2}*'الملخص'!B16` };
  });

  // 4) Customers (with WhatsApp numbers)
  const planName = (id: string | null) => plans?.find((p) => p.id === id)?.name ?? "—";
  const c = sheet("العملاء", [
    { header: "الاسم", key: "n", width: 22 }, { header: "البريد", key: "e", width: 30 }, { header: "الواتساب", key: "p", width: 18 },
    { header: "الباقة", key: "plan", width: 16 }, { header: "الرصيد (ريشة)", key: "cr", width: 14 }, { header: "تاريخ التسجيل", key: "d", width: 14 },
  ]);
  for (const p of (people ?? []).filter((x) => x.role === "user")) c.addRow({ n: p.full_name ?? "", e: p.email ?? "", p: p.phone ?? "", plan: planName(p.plan_id), cr: p.credits ?? 0, d: String(p.created_at).slice(0, 10) });

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="shaheen-finance-${year}.xlsx"; filename*=UTF-8''${encodeURIComponent(`شاهين-المالية-${year}.xlsx`)}`,
    },
  });
}
