import { newBook, styledSheet, kwDate, dayDate, FMT, xlsxResponse } from "@/lib/server/xlsx";
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

  const wb = newBook();
  const planName = (id: string | null) => plans?.find((p) => p.id === id)?.name ?? "—";

  // «الملخص» first; its formulas point at the data sheets (data starts at row 4 under the title, date and header rows)
  const sum = styledSheet(wb, "الملخص", { title: `الملخص المالي ${year}`, columns: [
    { header: "الشهر", key: "m", width: 16 }, { header: "الإيرادات", key: "i", width: 18, fmt: FMT.kd },
    { header: "المصروفات", key: "e", width: 18, fmt: FMT.kd }, { header: "صافي الربح", key: "n", width: 18, fmt: FMT.kd },
  ] });
  const e = styledSheet(wb, "المصروفات", { title: `المصروفات ${year}`, tab: "FFC62828", columns: [
    { header: "التاريخ", key: "d", width: 14, fmt: FMT.date }, { header: "الجهة", key: "v", width: 24 }, { header: "النوع", key: "c", width: 16, align: "center" },
    { header: "المبلغ", key: "a", width: 13, fmt: FMT.dec }, { header: "العملة", key: "cur", width: 9, align: "center" }, { header: "بالدينار", key: "k", width: 16, fmt: FMT.kd },
    { header: "المصدر", key: "src", width: 12, align: "center" }, { header: "ملاحظة", key: "note", width: 30 },
  ] });
  const n = styledSheet(wb, "الإيرادات", { title: `الإيرادات ${year}`, tab: "FF2E7D32", columns: [
    { header: "التاريخ", key: "d", width: 14, fmt: FMT.date }, { header: "الوصف", key: "desc", width: 28 }, { header: "العميل", key: "cust", width: 22 },
    { header: "الطريقة", key: "m", width: 12, align: "center" }, { header: "المبلغ", key: "a", width: 13, fmt: FMT.dec }, { header: "العملة", key: "cur", width: 9, align: "center" },
    { header: "المصدر", key: "src", width: 12, align: "center" }, { header: "بالدينار", key: "k", width: 16, fmt: FMT.kd },
  ] });
  const RATE = "'الملخص'!$B$18"; // filled below the months
  const cur = (c: string) => (c === "KWD" ? "د.ك" : c === "USD" ? "$" : c);
  expenses.forEach((x) => {
    const r = e.add({ d: dayDate(x.spent_on), v: x.vendor, c: CATEGORY[x.category] ?? x.category, a: Number(x.amount), cur: cur(x.currency), src: x.source === "manual" ? "يدوي" : "تلقائي", note: x.note ?? "" });
    r.getCell("k").value = { formula: x.currency === "KWD" ? `D${r.number}` : `D${r.number}*${RATE}` };
  });
  e.finish(expenses.length ? { v: "المجموع", k: { formula: `SUM(F${e.FIRST}:F${e.lastRow()})` } } : undefined);
  income.forEach((x) => {
    const r = n.add({ d: dayDate(x.received_on), desc: x.description, cust: x.customer_name ?? "—", m: x.method ?? "—", a: Number(x.amount), cur: cur(x.currency), src: x.source === "manual" ? "يدوي" : "تلقائي" });
    r.getCell("k").value = { formula: x.currency === "KWD" ? `E${r.number}` : `E${r.number}*${RATE}` };
  });
  n.finish(income.length ? { desc: "المجموع", k: { formula: `SUM(H${n.FIRST}:H${n.lastRow()})` } } : undefined);

  // summary: live formulas, so edits in Excel recalculate
  const ER = `'المصروفات'!$A$${e.FIRST}:$A$5000`, EK = `'المصروفات'!$F$${e.FIRST}:$F$5000`;
  const IR = `'الإيرادات'!$A$${n.FIRST}:$A$5000`, IK = `'الإيرادات'!$H$${n.FIRST}:$H$5000`;
  MONTHS.forEach((name, i) => {
    const from = `DATE(${year},${i + 1},1)`, to = `DATE(${year},${i + 2},1)`;
    const r = sum.add({ m: name });
    r.getCell("i").value = { formula: `SUMIFS(${IK},${IR},">="&${from},${IR},"<"&${to})` };
    r.getCell("e").value = { formula: `SUMIFS(${EK},${ER},">="&${from},${ER},"<"&${to})` };
    r.getCell("n").value = { formula: `B${r.number}-C${r.number}` };
  });
  sum.finish({ m: `مجموع ${year}`, i: { formula: `SUM(B${sum.FIRST}:B${sum.lastRow()})` }, e: { formula: `SUM(C${sum.FIRST}:C${sum.lastRow()})` }, n: { formula: `SUM(D${sum.FIRST}:D${sum.lastRow()})` } });
  const rateRow = sum.ws.getRow(18);
  rateRow.getCell(1).value = "سعر الدولار بالدينار"; rateRow.getCell(1).font = { name: "Arial", bold: true };
  rateRow.getCell(2).value = rate; rateRow.getCell(2).numFmt = "0.000"; rateRow.getCell(2).font = { name: "Arial", bold: true, color: { argb: "FF1F4FD8" } };
  rateRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8E1" } };
  sum.ws.getRow(19).getCell(1).value = "تُحوَّل المبالغ بالدولار إلى الدينار بهذا السعر. عند تعديل الرقم الأزرق أو أي مبلغ في الأوراق الأخرى يُحدَّث الملخص تلقائياً.";
  sum.ws.getRow(19).getCell(1).font = { name: "Arial", size: 10, color: { argb: "FF5B6573" } };
  sum.ws.mergeCells("A19:D19");
  // conditional colour on the net column
  sum.ws.addConditionalFormatting({ ref: `D${sum.FIRST}:D${sum.FIRST + 12}`, rules: [
    { type: "cellIs", operator: "lessThan", formulae: ["0"], priority: 1, style: { font: { color: { argb: "FFC62828" }, bold: true } } },
    { type: "cellIs", operator: "greaterThan", formulae: ["0"], priority: 2, style: { font: { color: { argb: "FF2E7D32" }, bold: true } } },
  ] });

  // customers (with WhatsApp numbers)
  const users = (people ?? []).filter((x) => x.role === "user");
  const c = styledSheet(wb, "العملاء", { title: `العملاء (${users.length})`, columns: [
    { header: "الاسم", key: "n", width: 22 }, { header: "البريد", key: "e", width: 30, align: "left" }, { header: "رقم الواتساب", key: "p", width: 18, align: "left" },
    { header: "الباقة", key: "plan", width: 16, align: "center" }, { header: "الرصيد (ريشة)", key: "cr", width: 14, fmt: FMT.num }, { header: "تاريخ التسجيل", key: "d", width: 15, fmt: FMT.date },
  ] });
  for (const p of users) c.add({ n: p.full_name ?? "—", e: p.email ?? "", p: p.phone ?? "", plan: planName(p.plan_id), cr: p.credits ?? 0, d: kwDate(p.created_at) });
  c.finish();

  return xlsxResponse(wb, `shaheen-finance-${year}.xlsx`, `شاهين-المالية-${year}.xlsx`);
}
