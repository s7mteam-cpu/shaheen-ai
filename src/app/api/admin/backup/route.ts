import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/server/audit";
import { backupWorkbook } from "@/lib/server/backupBook";
import { loadAll } from "@/lib/server/allData";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * «تنزيل البيانات»: one zip with every table that matters (customers, credits, finance, texts, settings…)
 * plus the site's own pictures. Built on the server, saved privately in Storage, then handed back as a
 * 10-minute download link (a direct response would hit Vercel's 4.5 MB limit). Only the 3 newest are kept.
 * If the owner locked «تصفير المنصة» in «كلمات السر», the admin password is needed too.
 */
const FOLDER = "_admin_backups";

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

export async function POST() {
  const me = await requireAdmin("reset"); // includes the «كلمات السر» lock when the owner locked this section
  if (!me) return NextResponse.json({ error: "locked" }, { status: 403 });
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
  const name = `shaheen-data-${stamp}.zip`;
  const { error: upErr } = await admin.storage.from("results").upload(`${FOLDER}/${name}`, out, { contentType: "application/zip", upsert: true });
  if (upErr) return NextResponse.json({ error: `ما قدرنا نحفظ النسخة: ${upErr.message}` }, { status: 500 });

  // keep only the 3 newest backups
  const { data: old } = await admin.storage.from("results").list(FOLDER, { limit: 100, sortBy: { column: "name", order: "desc" } });
  const extra = (old ?? []).slice(3).map((o) => `${FOLDER}/${o.name}`);
  if (extra.length) await admin.storage.from("results").remove(extra);

  const { data: signed } = await admin.storage.from("results").createSignedUrl(`${FOLDER}/${name}`, 600, { download: name });
  await audit(me, "backup_download", undefined, `${(out.length / 1048576).toFixed(1)} MB`);
  return NextResponse.json({ url: signed?.signedUrl, size: out.length, summary });
}
