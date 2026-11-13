import "server-only";
import type ExcelJS from "exceljs";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAll } from "@/lib/server/allData";
import { backupBook } from "@/lib/server/backupBook";
import { sheetsApi, sheetsCreds, SheetsError } from "@/lib/server/googleSheets";
import { ZEBRA } from "@/lib/server/xlsx";

/**
 * «ربط Google Sheets»: the owner's Google Sheets file mirrors «ملف البيانات» (the same sheets, columns, formulas,
 * colours and right-to-left layout as the Excel download).
 * - Any change in the database marks the file «needs update» (a database trigger, migration 0034).
 * - The next page view anywhere on the site (at most every 2 minutes), the daily cron, or «مزامنة الآن» rewrites it.
 * - Only Shaheen's own tabs are touched. Tabs the owner adds himself are never changed or deleted.
 */
const KEY = "sheets";
export type SheetsConfig = {
  id?: string; title?: string; dirty?: boolean; last_sync?: string | null; last_error?: string | null; last_fail?: string | null;
  running_at?: string | null; tabs?: number; rows?: number; took_ms?: number; linked_by?: string; linked_at?: string;
};

export async function readSheetsConfig(): Promise<SheetsConfig | null> {
  const { data } = await createAdminClient().from("admin_secrets").select("value").eq("key", KEY).maybeSingle();
  return (data?.value as SheetsConfig | undefined) ?? null;
}
export async function writeSheetsConfig(v: SheetsConfig | null) {
  const admin = createAdminClient();
  if (!v) return void (await admin.from("admin_secrets").delete().eq("key", KEY));
  await admin.from("admin_secrets").upsert({ key: KEY, value: v, updated_at: new Date().toISOString() });
}

// ───────────── ExcelJS → Google Sheets ─────────────
type Color = { red: number; green: number; blue: number };
const rgb = (argb?: string): Color | undefined => {
  if (!argb || !/^[0-9A-F]{8}$/i.test(argb)) return undefined;
  const n = (i: number) => parseInt(argb.slice(i, i + 2), 16) / 255;
  return { red: n(2), green: n(4), blue: n(6) };
};
/** Excel stores dates as days since 1899-12-30; our Kuwait-time dates are already shifted to UTC. */
const serial = (d: Date) => d.getTime() / 86_400_000 + 25569;
/** Excel ranges like B4:B100000 → B4:B (Google Sheets refuses rows past the end of the sheet). */
const fixFormula = (f: string) => f.replace(/(\$?[A-Z]{1,3}\$?\d+):(\$?[A-Z]{1,3})\$?100000\b/g, "$1:$2");

function value(v: ExcelJS.CellValue): Record<string, unknown> | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? { numberValue: v } : undefined;
  if (typeof v === "boolean") return { boolValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : { numberValue: serial(v) };
  const o = v as unknown as Record<string, unknown>;
  if (typeof o.formula === "string") return { formulaValue: "=" + fixFormula(o.formula) };
  if (Array.isArray(o.richText)) return { stringValue: (o.richText as { text: string }[]).map((x) => x.text).join("") };
  if (typeof o.text === "string") return { stringValue: o.text };
  if (o.error) return { stringValue: String(o.error) };
  return { stringValue: String(v) };
}

const H: Record<string, string> = { right: "RIGHT", center: "CENTER", left: "LEFT" };
function numberFormat(fmt?: string) {
  if (!fmt || fmt === "General") return undefined;
  const isDate = /(^|[^"])(d|yy)/i.test(fmt.replace(/"[^"]*"/g, ""));
  return { type: isDate ? (/h/i.test(fmt) ? "DATE_TIME" : "DATE") : "NUMBER", pattern: fmt };
}
function border(b?: Partial<ExcelJS.Border>) {
  if (!b?.style) return undefined;
  return { style: b.style === "medium" || b.style === "thick" ? "SOLID_MEDIUM" : "SOLID", colorStyle: { rgbColor: rgb(b.color?.argb) ?? { red: 0.84, green: 0.86, blue: 0.89 } } };
}
function format(cell: ExcelJS.Cell) {
  const f = cell.font ?? {}, a = cell.alignment ?? {}, fill = cell.fill as ExcelJS.FillPattern | undefined, b = cell.border ?? {};
  const bg = fill?.type === "pattern" && fill.pattern === "solid" ? rgb(fill.fgColor?.argb) : undefined;
  return {
    textFormat: { fontFamily: f.name ?? "Arial", fontSize: f.size ?? 11, bold: !!f.bold, foregroundColorStyle: { rgbColor: rgb(f.color?.argb) ?? { red: 0.1, green: 0.12, blue: 0.16 } } },
    horizontalAlignment: H[a.horizontal ?? "right"] ?? "RIGHT",
    verticalAlignment: "MIDDLE",
    wrapStrategy: a.wrapText ? "WRAP" : "OVERFLOW_CELL",
    ...(bg ? { backgroundColorStyle: { rgbColor: bg } } : {}),
    ...(numberFormat(cell.numFmt) ? { numberFormat: numberFormat(cell.numFmt) } : {}),
    borders: { top: border(b.top), bottom: border(b.bottom), left: border(b.left), right: border(b.right) },
  };
}
/** A data cell that looks like every other cell of its column (zebra rows come from Google's banding). */
const plain = (cell: ExcelJS.Cell, colFmt: string | undefined) => {
  const fill = cell.fill as ExcelJS.FillPattern | undefined;
  const bg = fill?.type === "pattern" && fill.pattern === "solid" ? fill.fgColor?.argb : undefined;
  return !cell.font?.bold && (!bg || bg === ZEBRA) && (cell.numFmt || undefined) === colFmt && cell.font?.color?.argb === undefined;
};
const a1 = (ref: string) => {
  const m = ref.match(/^([A-Z]+)(\d+)$/)!;
  const col = m[1].split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return { col, row: Number(m[2]) - 1 };
};

const PROTECT = "شاهين: هذه الورقة تتحدّث تلقائياً من المنصة";

type Meta = { properties: { sheetId: number; title: string }; bandedRanges?: { bandedRangeId: number }[]; protectedRanges?: { description?: string }[] };

export function sheetRequests(ws: ExcelJS.Worksheet, sheetId: number, index: number, meta: Meta | undefined) {
  const R = Math.max(ws.rowCount, 4), C = Math.max(ws.columnCount, 1), FIRST = 4;
  const whole = { sheetId };
  const req: Record<string, unknown>[] = [];
  for (const b of meta?.bandedRanges ?? []) req.push({ deleteBanding: { bandedRangeId: b.bandedRangeId } });
  req.push({ unmergeCells: { range: whole } }, { clearBasicFilter: { sheetId } }, { updateCells: { range: whole, fields: "userEnteredValue,userEnteredFormat" } });
  req.push({ updateSheetProperties: {
    properties: { sheetId, index, rightToLeft: true, tabColorStyle: { rgbColor: rgb((ws.properties.tabColor as { argb?: string } | undefined)?.argb) ?? rgb("FF0B2A4A") },
      gridProperties: { rowCount: R + 1, columnCount: C, frozenRowCount: 3, hideGridlines: true } },
    fields: "index,rightToLeft,tabColorStyle,gridProperties.rowCount,gridProperties.columnCount,gridProperties.frozenRowCount,gridProperties.hideGridlines",
  } });

  // values (typed, so phone numbers like +965… stay text and formulas stay formulas)
  const rows: { values: Record<string, unknown>[] }[] = [];
  for (let r = 1; r <= R; r++) {
    const row = ws.getRow(r);
    const values: Record<string, unknown>[] = [];
    for (let c = 1; c <= C; c++) { const cell = row.getCell(c); const v = cell.isMerged && cell.master.address !== cell.address ? undefined : value(cell.value); values.push(v ? { userEnteredValue: v } : {}); }
    rows.push({ values });
  }
  req.push({ updateCells: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0 }, rows, fields: "userEnteredValue" } });

  // column look for the data rows, then exact formats for the title, header and any special row (totals, highlights)
  const colFmt: (string | undefined)[] = [];
  for (let c = 1; c <= C; c++) colFmt[c] = ws.getRow(FIRST).getCell(c).numFmt || undefined;
  const lastData = R;
  for (let c = 1; c <= C; c++) {
    req.push({ repeatCell: { range: { sheetId, startRowIndex: FIRST - 1, endRowIndex: lastData, startColumnIndex: c - 1, endColumnIndex: c },
      cell: { userEnteredFormat: format(ws.getRow(FIRST).getCell(c)) }, fields: "userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,numberFormat,borders)" } });
  }
  let bandEnd = lastData;
  for (let r = 1; r <= R; r++) {
    const row = ws.getRow(r);
    let special = r < FIRST;
    for (let c = 1; c <= C && !special; c++) if (!plain(row.getCell(c), colFmt[c])) special = true;
    if (!special) continue;
    const values: Record<string, unknown>[] = [];
    for (let c = 1; c <= C; c++) values.push({ userEnteredFormat: format(row.getCell(c)) });
    req.push({ updateCells: { range: { sheetId, startRowIndex: r - 1, endRowIndex: r, startColumnIndex: 0, endColumnIndex: C }, rows: [{ values }], fields: "userEnteredFormat" } });
    if (r === R && r > FIRST) bandEnd = R - 1; // the totals row keeps its own colour
  }
  for (const m of ((ws.model as unknown as { merges?: string[] }).merges ?? [])) {
    const [s, e] = m.split(":"); const A = a1(s), B = a1(e ?? s);
    req.push({ mergeCells: { range: { sheetId, startRowIndex: A.row, endRowIndex: B.row + 1, startColumnIndex: A.col, endColumnIndex: B.col + 1 }, mergeType: "MERGE_ALL" } });
  }
  for (let c = 1; c <= C; c++) {
    const w = ws.getColumn(c).width ?? 14;
    req.push({ updateDimensionProperties: { range: { sheetId, dimension: "COLUMNS", startIndex: c - 1, endIndex: c }, properties: { pixelSize: Math.round(w * 7.5 + 12) }, fields: "pixelSize" } });
  }
  [40, 27, 35].forEach((px, i) => req.push({ updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 }, properties: { pixelSize: px }, fields: "pixelSize" } }));
  req.push({ updateDimensionProperties: { range: { sheetId, dimension: "ROWS", startIndex: 3, endIndex: R + 1 }, properties: { pixelSize: 29 }, fields: "pixelSize" } });
  const hasData = !(ws.getCell("A4").isMerged && String(ws.getCell("A4").value ?? "") === "لا توجد بيانات.");
  if (hasData && bandEnd >= FIRST) {
    req.push({ addBanding: { bandedRange: { range: { sheetId, startRowIndex: FIRST - 1, endRowIndex: bandEnd, startColumnIndex: 0, endColumnIndex: C },
      rowProperties: { firstBandColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } }, secondBandColorStyle: { rgbColor: rgb(ZEBRA) } } } } });
  }
  const af = ws.autoFilter as { from?: { row: number }; to?: { row: number } } | undefined;
  if (hasData && af?.from && af.to) req.push({ setBasicFilter: { filter: { range: { sheetId, startRowIndex: 2, endRowIndex: af.to.row, startColumnIndex: 0, endColumnIndex: C } } } });
  if (!(meta?.protectedRanges ?? []).some((p) => p.description === PROTECT)) {
    req.push({ addProtectedRange: { protectedRange: { range: whole, description: PROTECT, warningOnly: true } } });
  }
  return req;
}

/** Rewrites Shaheen's tabs in the file. Throws SheetsError with a clear Arabic message. */
async function pushBook(id: string, wb: ExcelJS.Workbook) {
  const fields = "sheets(properties(sheetId,title),bandedRanges(bandedRangeId),protectedRanges(description))";
  let meta = (await sheetsApi<{ sheets: Meta[] }>(`${id}?fields=${encodeURIComponent(fields)}`)).sheets ?? [];
  const missing = wb.worksheets.filter((ws) => !meta.some((m) => m.properties.title === ws.name));
  if (missing.length) {
    await sheetsApi(`${id}:batchUpdate`, { method: "POST", body: { requests: missing.map((ws) => ({ addSheet: { properties: { title: ws.name, rightToLeft: true } } })) } });
    meta = (await sheetsApi<{ sheets: Meta[] }>(`${id}?fields=${encodeURIComponent(fields)}`)).sheets ?? [];
  }
  let rows = 0;
  for (const [i, ws] of wb.worksheets.entries()) {
    const m = meta.find((x) => x.properties.title === ws.name);
    if (!m) throw new SheetsError(`ما قدرنا نسوي ورقة «${ws.name}».`);
    await sheetsApi(`${id}:batchUpdate`, { method: "POST", body: { requests: sheetRequests(ws, m.properties.sheetId, i, m) } });
    rows += Math.max(ws.rowCount - 3, 0);
  }
  return { tabs: wb.worksheets.length, rows };
}

/** Checks that the file exists and is shared with the service account; returns its title. */
export async function testSheet(id: string) {
  const j = await sheetsApi<{ properties?: { title?: string } }>(`${id}?fields=properties.title`);
  return j.properties?.title ?? "";
}

/** One full sync. Never runs twice at the same time. */
export async function syncSheets(reason: "manual" | "auto" | "cron" | "linked"): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  const cfg = await readSheetsConfig();
  if (!cfg?.id) return { ok: false, skipped: "not linked" };
  if (!sheetsCreds()) { await writeSheetsConfig({ ...cfg, last_error: "مفتاح Google غير موجود في Vercel (GOOGLE_SHEETS_CREDENTIALS).", last_fail: new Date().toISOString() }); return { ok: false, error: "no credentials" }; }
  if (cfg.running_at && Date.now() - new Date(cfg.running_at).getTime() < 5 * 60_000) return { ok: false, skipped: "busy" };
  const started = Date.now();
  // dirty=false *before* reading the data: anything that changes during the sync marks it again
  await writeSheetsConfig({ ...cfg, running_at: new Date().toISOString(), dirty: false });
  try {
    const wb = await backupBook(await loadAll());
    const { tabs, rows } = await pushBook(cfg.id, wb);
    const now = (await readSheetsConfig()) ?? cfg;
    await writeSheetsConfig({ ...now, id: cfg.id, running_at: null, last_sync: new Date().toISOString(), last_error: null, last_fail: null, tabs, rows, took_ms: Date.now() - started });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof SheetsError ? e.message : `خطأ غير متوقع: ${String((e as Error)?.message ?? e).slice(0, 200)}`;
    const now = (await readSheetsConfig()) ?? cfg;
    await writeSheetsConfig({ ...now, id: cfg.id, running_at: null, dirty: true, last_error: msg, last_fail: new Date().toISOString() });
    console.error("sheets sync", reason, msg);
    return { ok: false, error: msg };
  }
}

let lastTick = 0;
/**
 * Called after page views (in the background, the visitor never waits). Syncs when something changed,
 * at most every 2 minutes, and waits 10 minutes after a failure.
 */
export async function sheetsTick() {
  if (!process.env.GOOGLE_SHEETS_CREDENTIALS || Date.now() - lastTick < 60_000) return;
  lastTick = Date.now();
  const cfg = await readSheetsConfig().catch(() => null);
  if (!cfg?.id || !cfg.dirty) return;
  const since = (t?: string | null) => (t ? Date.now() - new Date(t).getTime() : Infinity);
  if (since(cfg.last_sync) < 2 * 60_000 || since(cfg.last_fail) < 10 * 60_000 || since(cfg.running_at) < 5 * 60_000) return;
  await syncSheets("auto");
}
