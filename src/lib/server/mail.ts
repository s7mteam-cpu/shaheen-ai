import "server-only";

/**
 * Sends a mail from the platform's own address (set once in Vercel: MAIL_FROM, RESEND_API_KEY).
 * Staff never type a recipient: callers pass the customer's own profile email, so this can't be used to mail strangers.
 * Without the two settings nothing is sent and the caller is told so (the bell message still works).
 */
export function mailReady() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function sendMail(to: string, subject: string, body: string, link?: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mailReady()) return { ok: false, error: "not_configured" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "bad_address" };
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.shaheen-kw.com").replace(/\/$/, "");
  const url = link ? (link.startsWith("/") ? site + link : site) : site;
  const paras = body.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => `<p style="margin:0 0 12px;line-height:1.9;font-size:15px">${esc(l)}</p>`).join("");
  const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f4f6fa;padding:24px"><div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;color:#0A1E36"><div style="background:#0A1E36;padding:18px 24px;text-align:center"><img src="${site}/brand/eagle.png" width="64" height="64" alt="شاهين" style="display:inline-block;vertical-align:middle;border:0"><span style="display:inline-block;vertical-align:middle;margin-right:10px;color:#C9A45C;font-weight:800;font-size:22px">شاهين</span></div><div style="padding:24px">${paras}<p style="margin:18px 0 0"><a href="${esc(url)}" style="background:#0B2A4A;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;font-weight:700;display:inline-block">افتح حسابك</a></p></div></div></div>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject: subject.slice(0, 150), html, text: `${body}\n\n${url}`, ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return { ok: false, error: `provider_${r.status}` };
    return { ok: true };
  } catch {
    return { ok: false, error: "network" };
  }
}
