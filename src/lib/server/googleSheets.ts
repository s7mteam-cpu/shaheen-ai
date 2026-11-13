import "server-only";
import { createSign } from "crypto";

/**
 * Google Sheets through a service account — no extra packages.
 * The owner pastes the service account's JSON key into Vercel as GOOGLE_SHEETS_CREDENTIALS (plain JSON or base64).
 * The key never appears on any page; only the account's e-mail is shown, so the owner can share the file with it.
 */
type Creds = { client_email: string; private_key: string };

export function sheetsCreds(): Creds | null {
  const raw = (process.env.GOOGLE_SHEETS_CREDENTIALS ?? "").trim();
  if (!raw) return null;
  for (const text of [raw, (() => { try { return Buffer.from(raw, "base64").toString("utf8"); } catch { return ""; } })()]) {
    try {
      const j = JSON.parse(text) as Partial<Creds>;
      if (j.client_email && j.private_key) return { client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, "\n") };
    } catch { /* try the next form */ }
  }
  return null;
}

let cached: { token: string; until: number } | null = null;

async function accessToken(c: Creds): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = b64({ alg: "RS256", typ: "JWT" });
  const body = b64({ iss: c.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const sig = createSign("RSA-SHA256").update(`${head}.${body}`).sign(c.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${body}.${sig}` }),
    signal: AbortSignal.timeout(15000),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !j.access_token) throw new SheetsError(`مفتاح Google غير صالح (${j.error_description ?? j.error ?? res.status}). تأكد إنك نسخت ملف JSON كامل في Vercel.`);
  cached = { token: j.access_token, until: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return j.access_token;
}

export class SheetsError extends Error {}

/** One call to the Sheets API, with clear Arabic errors for the usual mistakes. */
export async function sheetsApi<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const c = sheetsCreds();
  if (!c) throw new SheetsError("مفتاح Google غير موجود في Vercel (GOOGLE_SHEETS_CREDENTIALS).");
  const token = await accessToken(c);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    method: init?.method ?? "GET",
    headers: { authorization: `Bearer ${token}`, ...(init?.body ? { "content-type": "application/json" } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  if (res.ok) return (await res.json()) as T;
  const j = (await res.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
  const msg = j.error?.message ?? String(res.status);
  if (res.status === 404) throw new SheetsError("ما لقينا ملف Google Sheets بهذا الرقم. تأكد من الرقم المنسوخ من الرابط.");
  if (res.status === 403 && /has not been used|disabled/i.test(msg)) throw new SheetsError("Google Sheets API غير مفعّل في مشروع Google Cloud. فعّله من «APIs & Services».");
  if (res.status === 403) throw new SheetsError(`الملف غير مشارَك مع حساب الخدمة. اضغط «مشاركة» في الملف وأضف ${c.client_email} كمحرر.`);
  if (res.status === 429) throw new SheetsError("Google طلب التمهّل (كثرة الطلبات). بنعيد المحاولة تلقائياً بعد شوي.");
  throw new SheetsError(`خطأ من Google: ${msg}`);
}

/** The spreadsheet id from a full link or the bare id. */
export function sheetIdFrom(input: string): string | null {
  const v = input.trim();
  const m = v.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/) ?? v.match(/^([a-zA-Z0-9_-]{20,})$/);
  return m ? m[1] : null;
}
