import "server-only";
import JSZip from "jszip";
import { createAdminClient } from "@/lib/supabase/admin";
import { backupWorkbook } from "@/lib/server/backupBook";
import { loadAll } from "@/lib/server/allData";

/**
 * «تنزيل البيانات»: one zip with every table that matters (customers, credits, finance, texts, settings…)
 * plus the site's own pictures, saved privately in Storage (results/_admin_backups). Only the 3 newest are kept.
 * Also made automatically right before «تصفير كامل».
 */
export const BACKUP_FOLDER = "_admin_backups";

async function listAll(bucket: string, prefix = ""): Promise<string[]> {
  const { data } = await createAdminClient().storage.from(bucket).list(prefix, { limit: 1000 });
  const out: string[] = [];
  for (const o of data ?? []) {
    const path = prefix ? `${prefix}/${o.name}` : o.name;
    if (o.id === null) out.push(...(await listAll(bucket, path))); // a folder
    else out.push(path);
  }
  return out;
}

export async function makeBackup(label = ""): Promise<{ error?: string; name?: string; size?: number; summary?: string[] }> {
  const admin = createAdminClient();
  const zip = new JSZip();
  const stamp = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kuwait" }).replace(/[: ]/g, "-").slice(0, 16);
  const summary: string[] = [];
  const all = await loadAll((t, n, error) => summary.push(`${t}: ${n}${error ? ` (تنبيه: ${error})` : ""}`));
  for (const [t, rows] of Object.entries(all)) zip.file(`restore-data/${t}.json`, JSON.stringify(rows, null, 1));
  zip.file("بيانات-شاهين.xlsx", await backupWorkbook(all));

  let files = 0, bytes = 0;
  for (const path of await listAll("site")) {
    const { data } = await admin.storage.from("site").download(path);
    if (!data) continue;
    const buf = Buffer.from(await data.arrayBuffer());
    zip.file(`site-media/${path}`, buf); files++; bytes += buf.length;
  }
  summary.push(`صور وملفات الموقع: ${files} (${(bytes / 1048576).toFixed(1)} MB)`);

  zip.file("اقرأني.txt", [
    "نسخة بيانات منصة شاهين", `التاريخ: ${stamp} (بتوقيت الكويت)`, "",
    "⚠️ هالملف فيه بيانات العملاء الشخصية (أسماء وإيميلات وأرقام). احفظه بمكان آمن، ولا ترسله لأحد.", "",
    "• بيانات-شاهين.xlsx : افتحه بـ Excel. فيه العملاء، المدفوعات، المصاريف، حركات الرصيد، الطلبات، طلبات التواصل، الحسابات المغلقة، وسجل الإدارة.",
    "• restore-data/ : نفس البيانات بصيغة تقنية (JSON)، للمبرمج لو احتجنا نرجّع الموقع. لا تعدّل فيها.",
    "• site-media/ : صور الموقع اللي رفعتها من الإدارة (البطاقات، المعرض، الفيديوهات).",
    "• كود الموقع مو هنا: نزّله من زر «تنزيل كود الموقع» (GitHub).", "",
    "المحتوى:", ...summary.map((s) => `  - ${s}`),
  ].join("\n"));

  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const name = `shaheen-data-${stamp}${label ? `-${label}` : ""}.zip`;
  const { error: upErr } = await admin.storage.from("results").upload(`${BACKUP_FOLDER}/${name}`, out, { contentType: "application/zip", upsert: true });
  if (upErr) return { error: `ما قدرنا نحفظ النسخة: ${upErr.message}` };

  // keep only the 3 newest backups
  const { data: old } = await admin.storage.from("results").list(BACKUP_FOLDER, { limit: 100, sortBy: { column: "name", order: "desc" } });
  // newest first by date; a pre-reset copy sorts with its date like any other
  const extra = (old ?? []).sort((x, y) => (y.created_at ?? y.name).localeCompare(x.created_at ?? x.name)).slice(3).map((o) => `${BACKUP_FOLDER}/${o.name}`);
  if (extra.length) await admin.storage.from("results").remove(extra);

  return { name, size: out.length, summary };
}

/** A 10-minute download link for one backup. */
export async function backupLink(name: string) {
  const { data } = await createAdminClient().storage.from("results").createSignedUrl(`${BACKUP_FOLDER}/${name}`, 600, { download: name });
  return data?.signedUrl ?? null;
}
