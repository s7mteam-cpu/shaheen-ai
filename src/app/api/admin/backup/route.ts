import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * «تنزيل البيانات»: one zip with every table that matters (customers, credits, finance, texts, settings…)
 * plus the site's own pictures. Built on the server, saved privately in Storage, then handed back as a
 * 10-minute download link (a direct response would hit Vercel's 4.5 MB limit). Only the 3 newest are kept.
 * If the owner locked «تصفير المنصة» in «كلمات السر», the admin password is needed too.
 */
const TABLES = [
  "profiles", "subscriptions", "credit_ledger", "jobs", "income", "expenses", "recurring_expenses", "tap_charges",
  "plans", "tools", "site_content", "gallery_items", "brand_kits", "leads", "admin_audit", "blocked_emails",
  "closed_accounts", "user_events", "support_access",
];
const FOLDER = "_admin_backups";

async function allRows(table: string) {
  const admin = createAdminClient();
  const rows: unknown[] = [];
  for (let from = 0; from < 200_000; from += 1000) {
    const { data, error } = await admin.from(table).select("*").range(from, from + 999);
    if (error) return { rows, error: error.message };
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return { rows };
}

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

const csvCell = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function POST() {
  const me = await requireAdmin("reset"); // includes the «كلمات السر» lock when the owner locked this section
  if (!me) return NextResponse.json({ error: "locked" }, { status: 403 });
  const admin = createAdminClient();
  const zip = new JSZip();
  const stamp = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kuwait" }).replace(/[: ]/g, "-").slice(0, 16);
  const summary: string[] = [];

  for (const t of TABLES) {
    const { rows, error } = await allRows(t);
    zip.file(`data/${t}.json`, JSON.stringify(rows, null, 1));
    summary.push(`${t}: ${rows.length}${error ? ` (تنبيه: ${error})` : ""}`);
    if (t === "profiles") {
      const head = ["الاسم", "البريد", "الهاتف", "الرصيد", "الباقة", "الدور", "تاريخ التسجيل"];
      const lines = (rows as Record<string, unknown>[]).map((p) => [p.full_name, p.email, p.phone, p.credits, p.plan_id, p.role, String(p.created_at ?? "").slice(0, 10)].map(csvCell).join(","));
      zip.file("العملاء.csv", "﻿" + [head.join(","), ...lines].join("\n")); // BOM so Excel shows Arabic
    }
  }

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
    "• data/  : كل جدول بملف JSON (للاسترجاع وقت الحاجة).",
    "• العملاء.csv : قائمة العملاء، تنفتح بـ Excel.",
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
