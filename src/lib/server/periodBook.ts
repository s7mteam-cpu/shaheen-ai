import "server-only";
import { periodReport, CATEGORY, toKwd } from "@/lib/server/finance";
import { newBook, styledSheet, dayDate, FMT } from "@/lib/server/xlsx";

/** The accounting-cycle workbook (used by «تقرير Excel للدورة» and frozen into the closing report). */
export async function periodWorkbook(name: string, from: string, to: string, closed?: { at: string; by: string | null }) {
  const r = await periodReport(from, to);
  const wb = newBook();
  const stamp = closed ? `   ·   🔒 دورة مقفلة بتاريخ ${new Date(closed.at).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait", dateStyle: "long", timeStyle: "short" })}${closed.by ? ` بواسطة ${closed.by}` : ""}` : "   ·   الدورة مفتوحة (الأرقام قابلة للتغيير)";
  const sub = `من ${from} إلى ${to}   ·   سعر الدولار: ${r.rate} د.ك${stamp}`;
  const cur = (c: string) => (c === "KWD" ? "د.ك" : c === "USD" ? "$" : c);

  // 1) summary with live formulas over the detail sheets
  const s = styledSheet(wb, "ملخص الدورة", { title: `${name}: صافي الربح`, subtitle: sub, columns: [
    { header: "البند", key: "k", width: 34 }, { header: "المبلغ (د.ك)", key: "v", width: 20, fmt: FMT.kd }, { header: "ملاحظة", key: "n", width: 40 },
  ] });
  const rev = s.add({ k: "الإيرادات", n: `عدد الدفعات: ${r.income.length}` });
  rev.getCell("v").value = { formula: "SUMIFS('الإيرادات'!G4:G100000,'الإيرادات'!A4:A100000,\"<>\")" }; // dated rows only (not the totals row)
  const catRows: number[] = [];
  for (const c of Object.keys(CATEGORY)) {
    const row = s.add({ k: `   مصروفات: ${CATEGORY[c]}` });
    row.getCell("v").value = { formula: `SUMIFS('المصروفات'!F4:F100000,'المصروفات'!C4:C100000,"${CATEGORY[c]}")` };
    catRows.push(row.number);
  }
  const tot = s.add({ k: "مجموع المصروفات", n: `عدد البنود: ${r.expenses.length}` });
  tot.getCell("v").value = { formula: `SUM(B${catRows[0]}:B${catRows[catRows.length - 1]})` };
  const net = s.add({ k: "صافي الربح", n: "الإيرادات − المصروفات" });
  net.getCell("v").value = { formula: `B${rev.number}-B${tot.number}` };
  const mg = s.add({ k: "هامش الربح", n: "صافي الربح ÷ الإيرادات" });
  mg.getCell("v").value = { formula: `IF(B${rev.number}=0,0,B${net.number}/B${rev.number})` }; mg.getCell("v").numFmt = "0.0%";
  const wd = s.add({ k: "مسحوبات الشركاء خلال الدورة", n: "ليست مصروفات: تُخصم من الأرباح" });
  wd.getCell("v").value = { formula: `SUMIFS('المسحوبات والإيداعات'!E4:E100000,'المسحوبات والإيداعات'!C4:C100000,"سحب")` };
  const cap = s.add({ k: "إيداعات الشركاء خلال الدورة", n: "رأس مال أو تمويل" });
  cap.getCell("v").value = { formula: `SUMIFS('المسحوبات والإيداعات'!E4:E100000,'المسحوبات والإيداعات'!C4:C100000,"إيداع")` };
  const left = s.add({ k: "المتبقي في الشركة من أرباح الدورة", n: "صافي الربح − المسحوبات" });
  left.getCell("v").value = { formula: `B${net.number}-B${wd.number}` };
  for (const row of [rev, tot, net, left]) { row.getCell("k").font = { name: "Arial", size: 12, bold: true }; row.getCell("v").font = { name: "Arial", size: 12, bold: true }; }
  s.ws.addConditionalFormatting({ ref: `B${net.number}:B${left.number}`, rules: [
    { type: "cellIs", operator: "lessThan", formulae: ["0"], priority: 1, style: { font: { color: { argb: "FFC62828" }, bold: true } } },
    { type: "cellIs", operator: "greaterThan", formulae: ["0"], priority: 2, style: { font: { color: { argb: "FF2E7D32" }, bold: true } } },
  ] });
  s.finish();
  const NET = `'ملخص الدورة'!$B$${net.number}`;

  // 2) partners split (suggested share = net × %; still owed = share − withdrawals)
  const p = styledSheet(wb, "الشركاء", { title: `${name}: توزيع الربح على الشركاء`, subtitle: "النسب استرشادية والقرار النهائي للإدارة، وعند تعديل أي نسبة تُحدَّث الحصص تلقائياً.", columns: [
    { header: "الشريك", key: "n", width: 22 }, { header: "النسبة %", key: "pct", width: 11, fmt: "0.##" }, { header: "الحصة المقترحة من صافي الربح", key: "sh", width: 18, fmt: FMT.kd },
    { header: "المسحوبات خلال الدورة", key: "w", width: 16, fmt: FMT.kd }, { header: "المستحق المتبقي", key: "rem", width: 16, fmt: FMT.kd }, { header: "الإيداعات خلال الدورة", key: "c", width: 16, fmt: FMT.kd },
    { header: "الهاتف", key: "ph", width: 16, align: "left" }, { header: "البريد الإلكتروني", key: "em", width: 26, align: "left" },
  ] });
  for (const x of r.partners) {
    const row = p.add({ n: x.name, pct: x.is_active ? Number(x.share_percent) : 0, ph: x.phone ?? "", em: x.email ?? "" });
    const n = row.number;
    row.getCell("sh").value = { formula: `${NET}*B${n}/100` };
    row.getCell("w").value = { formula: `SUMIFS('المسحوبات والإيداعات'!E4:E100000,'المسحوبات والإيداعات'!B4:B100000,A${n},'المسحوبات والإيداعات'!C4:C100000,"سحب")` };
    row.getCell("c").value = { formula: `SUMIFS('المسحوبات والإيداعات'!E4:E100000,'المسحوبات والإيداعات'!B4:B100000,A${n},'المسحوبات والإيداعات'!C4:C100000,"إيداع")` };
    row.getCell("rem").value = { formula: `C${n}-D${n}` };
    row.getCell("pct").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1F4FD8" } };
  }
  p.finish(r.partners.length ? { n: "المجموع", pct: { formula: `SUM(B${p.FIRST}:B${p.lastRow()})` }, sh: { formula: `SUM(C${p.FIRST}:C${p.lastRow()})` }, w: { formula: `SUM(D${p.FIRST}:D${p.lastRow()})` }, rem: { formula: `SUM(E${p.FIRST}:E${p.lastRow()})` }, c: { formula: `SUM(F${p.FIRST}:F${p.lastRow()})` } } : undefined);

  // 3) detail sheets
  const i = styledSheet(wb, "الإيرادات", { title: `${name}: الإيرادات`, subtitle: sub, tab: "FF2E7D32", columns: [
    { header: "التاريخ", key: "d", width: 14, fmt: FMT.date }, { header: "الوصف", key: "desc", width: 28 }, { header: "العميل", key: "cust", width: 22 },
    { header: "الطريقة", key: "m", width: 12, align: "center" }, { header: "المبلغ", key: "a", width: 13, fmt: FMT.dec }, { header: "العملة", key: "cur", width: 9, align: "center" }, { header: "بالدينار", key: "k", width: 16, fmt: FMT.kd },
  ] });
  for (const x of r.income) i.add({ d: dayDate(x.received_on), desc: x.description, cust: x.customer_name ?? "—", m: x.method ?? "—", a: Number(x.amount), cur: cur(x.currency), k: toKwd(x.amount, x.currency, r.rate) });
  i.finish(r.income.length ? { desc: "المجموع", k: { formula: `SUM(G${i.FIRST}:G${i.lastRow()})` } } : undefined);

  const e = styledSheet(wb, "المصروفات", { title: `${name}: المصروفات`, subtitle: sub, tab: "FFC62828", columns: [
    { header: "التاريخ", key: "d", width: 14, fmt: FMT.date }, { header: "الجهة", key: "v", width: 24 }, { header: "النوع", key: "c", width: 20, align: "center" },
    { header: "المبلغ", key: "a", width: 13, fmt: FMT.dec }, { header: "العملة", key: "cur", width: 9, align: "center" }, { header: "بالدينار", key: "k", width: 16, fmt: FMT.kd }, { header: "ملاحظة", key: "note", width: 30 },
  ] });
  for (const x of r.expenses) e.add({ d: dayDate(x.spent_on), v: x.vendor, c: CATEGORY[x.category] ?? x.category, a: Number(x.amount), cur: cur(x.currency), k: toKwd(x.amount, x.currency, r.rate), note: x.note ?? "" });
  e.finish(r.expenses.length ? { v: "المجموع", k: { formula: `SUM(F${e.FIRST}:F${e.lastRow()})` } } : undefined);

  const pname = (id: string) => r.partners.find((x) => x.id === id)?.name ?? "—";
  const m = styledSheet(wb, "المسحوبات والإيداعات", { title: `${name}: سحوبات وإيداعات الشركاء`, subtitle: sub, columns: [
    { header: "التاريخ", key: "d", width: 14, fmt: FMT.date }, { header: "الشريك", key: "p", width: 22 }, { header: "النوع", key: "k", width: 10, align: "center" },
    { header: "المبلغ", key: "a", width: 13, fmt: FMT.dec }, { header: "بالدينار", key: "kwd", width: 16, fmt: FMT.kd }, { header: "ملاحظة", key: "note", width: 30 }, { header: "المُدخِل", key: "by", width: 24, align: "left" },
  ] });
  for (const x of r.moves) m.add({ d: dayDate(x.moved_on), p: pname(x.partner_id), k: x.kind === "withdrawal" ? "سحب" : "إيداع", a: Number(x.amount), kwd: toKwd(x.amount, x.currency, r.rate), note: x.note ?? "", by: x.created_by ?? "" });
  m.finish();

  const em = styledSheet(wb, "الموظفين", { title: `${name}: المدفوع للموظفين`, subtitle: sub, columns: [
    { header: "الموظف", key: "n", width: 24 }, { header: "الوظيفة", key: "j", width: 18 }, { header: "الراتب المتفق عليه", key: "sal", width: 18, fmt: FMT.dec },
    { header: "عدد الدفعات", key: "c", width: 12, fmt: FMT.num }, { header: "المدفوع خلال الدورة", key: "p", width: 18, fmt: FMT.kd },
  ] });
  for (const x of r.employees) em.add({ n: x.name, j: x.job_title ?? "—", sal: x.salary == null ? null : Number(x.salary), c: x.payments, p: x.paid });
  em.finish(r.employees.length ? { n: "المجموع", p: { formula: `SUM(E${em.FIRST}:E${em.lastRow()})` } } : undefined);

  return { wb, report: r };
}
