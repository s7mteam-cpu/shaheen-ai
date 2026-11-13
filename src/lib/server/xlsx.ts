import "server-only";
import ExcelJS from "exceljs";

/**
 * One look for every Excel file Shaheen makes: right-to-left, a navy title bar, a date line, a gold header row
 * with filters, frozen header, borders, zebra rows, wrapped text, real dates and number formats, and A4
 * landscape printing that fits the page width.
 */
export const NAVY = "FF0B2A4A", GOLD = "FFC9A45C", ZEBRA = "FFF4F6F9", LINE = "FFD5DBE3", TOTAL = "FFF3E7CF";
export const FMT = { kd: '#,##0.000 "د.ك"', usd: '"$"#,##0.00', num: "#,##0", dec: "#,##0.000", date: "dd/mm/yyyy", datetime: "dd/mm/yyyy hh:mm" };
const KW_OFFSET = 3 * 3600_000;

/** A timestamp as a real Excel date in Kuwait time (Excel has no time zones). */
export const kwDate = (v: string | number | Date | null | undefined) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getTime() + KW_OFFSET);
};
/** A plain date (yyyy-mm-dd) as an Excel date. */
export const dayDate = (v: string | null | undefined) => (v ? new Date(`${String(v).slice(0, 10)}T00:00:00Z`) : null);

export type Col = { header: string; key: string; width: number; fmt?: string; align?: "right" | "center" | "left" };

export function newBook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "منصة شاهين"; wb.created = new Date();
  return wb;
}

export function styledSheet(wb: ExcelJS.Workbook, name: string, opt: { title: string; subtitle?: string; columns: Col[]; tab?: string }) {
  const cols = opt.columns;
  const ws = wb.addWorksheet(name.slice(0, 31), {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3, showGridLines: false }],
    properties: { tabColor: { argb: opt.tab ?? NAVY } },
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    headerFooter: { oddFooter: `&L&8منصة شاهين&R&8صفحة &P من &N` },
  });
  ws.columns = cols.map((c) => ({ key: c.key, width: c.width }));
  const font = (o: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> => ({ name: "Arial", size: 11, ...o });
  const last = ws.getColumn(cols.length).letter;

  ws.mergeCells(`A1:${last}1`);
  const t = ws.getCell("A1");
  t.value = opt.title; t.font = font({ size: 15, bold: true, color: { argb: "FFFFFFFF" } });
  t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  t.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(`A2:${last}2`);
  const s = ws.getCell("A2");
  s.value = opt.subtitle ?? `تاريخ إصدار الملف: ${new Date().toLocaleString("ar-KW", { timeZone: "Asia/Kuwait", dateStyle: "long", timeStyle: "short" })}`;
  s.font = font({ size: 10, color: { argb: "FF5B6573" } }); s.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
  ws.getRow(2).height = 20;

  const h = ws.getRow(3);
  cols.forEach((c, i) => {
    const cell = h.getCell(i + 1);
    cell.value = c.header; cell.font = font({ bold: true, color: { argb: "FFFFFFFF" } });
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: NAVY } } };
  });
  h.height = 26;

  const FIRST = 4;
  let n = 0;
  const border = { style: "thin" as const, color: { argb: LINE } };
  const add = (values: Record<string, unknown>) => {
    const r = ws.addRow(values);
    r.height = 22;
    cols.forEach((c, i) => {
      const cell = r.getCell(i + 1);
      cell.font = font();
      cell.border = { top: border, bottom: border, left: border, right: border };
      cell.alignment = { horizontal: c.align ?? (c.fmt ? "center" : "right"), vertical: "middle", wrapText: true };
      if (c.fmt) cell.numFmt = c.fmt;
      if (n % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ZEBRA } };
    });
    n++;
    return r;
  };
  /** Turns on filters over the data; optional bold totals row (values may be formulas). */
  const finish = (totals?: Record<string, ExcelJS.CellValue>) => {
    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + Math.max(n, 1), column: cols.length } };
    if (n === 0) {
      ws.mergeCells(`A4:${last}4`);
      const e = ws.getCell("A4"); e.value = "لا توجد بيانات."; e.font = font({ color: { argb: "FF8A94A3" } }); e.alignment = { horizontal: "center" };
    }
    if (totals) {
      const r = ws.addRow(totals);
      r.height = 24;
      cols.forEach((c, i) => {
        const cell = r.getCell(i + 1);
        cell.font = font({ bold: true }); if (c.fmt) cell.numFmt = c.fmt;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL } };
        cell.border = { top: { style: "medium", color: { argb: NAVY } } };
        cell.alignment = { horizontal: c.fmt ? "center" : "right", vertical: "middle" };
      });
      return r;
    }
  };
  return { ws, FIRST, add, finish, count: () => n, lastRow: () => FIRST + n - 1 };
}

export const xlsxResponse = async (wb: ExcelJS.Workbook, asciiName: string, arabicName: string) =>
  new Response(await wb.xlsx.writeBuffer(), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(arabicName)}`,
    },
  });
