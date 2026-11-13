"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { serverT } from "@/lib/server/lang";
import { sheetIdFrom, sheetsCreds, SheetsError } from "@/lib/server/googleSheets";
import { readSheetsConfig, syncSheets, testSheet, writeSheetsConfig } from "@/lib/server/sheetsSync";

type Res = { ok?: string; error?: string } | undefined;
const done = () => revalidatePath("/admin/sheets");

/** Link (or change) the Google Sheets file, check it's shared with the service account, then fill it. */
export async function linkSheet(_p: Res, form: FormData): Promise<Res> {
  const T = await serverT();
  const me = await requireAdmin("sheets");
  if (!me) return { error: T("هالخيار للمالك بس.", "Owner only.") };
  if (!sheetsCreds()) return { error: T("حط مفتاح Google في Vercel أول (الخطوة 3)، وسوّ Redeploy.", "Add the Google key in Vercel first (step 3), then redeploy.") };
  const id = sheetIdFrom(String(form.get("sheet") ?? ""));
  if (!id) return { error: T("الصق رابط ملف Google Sheets كامل (يبدأ بـ https://docs.google.com/spreadsheets/d/…).", "Paste the full Google Sheets link (https://docs.google.com/spreadsheets/d/…).") };
  let title = "";
  try { title = await testSheet(id); } catch (e) { return { error: e instanceof SheetsError ? e.message : String(e) }; }
  const old = await readSheetsConfig();
  await writeSheetsConfig({ id, title, dirty: true, linked_by: me.email ?? undefined, linked_at: new Date().toISOString(), last_sync: old?.id === id ? old.last_sync : null });
  await audit(me, "sheets_linked", undefined, title || id);
  const r = await syncSheets("linked");
  done();
  return r.ok ? { ok: T("انربط الملف وتعبّا ✓ افتحه وشوف.", "Linked and filled ✓ Open it and have a look.") }
    : { error: T(`انربط الملف بس التعبئة ما كملت: ${r.error ?? r.skipped}`, `Linked, but filling it failed: ${r.error ?? r.skipped}`) };
}

export async function syncNow(): Promise<Res> {
  const T = await serverT();
  const me = await requireAdmin("sheets");
  if (!me) return { error: T("هالخيار للمالك بس.", "Owner only.") };
  const r = await syncSheets("manual");
  await audit(me, "sheets_sync");
  done();
  if (r.skipped === "busy") return { error: T("فيه تحديث شغّال الحين، انتظر دقيقة.", "An update is already running, wait a minute.") };
  return r.ok ? { ok: T("تحدّث الملف ✓", "File updated ✓") } : { error: r.error ?? r.skipped };
}

export async function unlinkSheet(): Promise<Res> {
  const T = await serverT();
  const me = await requireAdmin("sheets");
  if (!me) return { error: T("هالخيار للمالك بس.", "Owner only.") };
  const old = await readSheetsConfig();
  await writeSheetsConfig(null);
  await audit(me, "sheets_unlinked", undefined, old?.title || old?.id);
  done();
  return { ok: T("انوقف الربط. الملف نفسه يظل عندك مثل ما هو.", "Unlinked. The file itself stays as it is.") };
}
