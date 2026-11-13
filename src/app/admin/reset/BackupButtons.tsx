"use client";
import { useState } from "react";
import { LT } from "@/lib/i18n/ui";

/** «تنزيل كود الموقع» (GitHub zip) and «تنزيل البيانات» (customers, finance, texts, site pictures). */
export function BackupButtons({ codeUrl }: { codeUrl: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  async function data() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/admin/backup", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (j.error === "locked") { setMsg({ error: LT("انتهت مدة فتح الصفحة. حدّث الصفحة واكتب كلمة السر.", "The page locked again. Refresh and enter the password.") }); return; }
      if (!r.ok || !j.url) { setMsg({ error: j.error || LT("صار خطأ، جرّب مرة ثانية.", "Something went wrong, try again.") }); return; }
      window.location.href = j.url;
      setMsg({ ok: LT(`النسخة جاهزة (${(j.size / 1048576).toFixed(1)} MB) وبدأ التنزيل.`, `Backup ready (${(j.size / 1048576).toFixed(1)} MB), download started.`) });
    } finally { setBusy(false); }
  }
  return (
    <section className="card flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-lg font-bold text-navy-900">💾 {LT("النسخ الاحتياطية", "Backups")}</h2>
        <p className="mt-1 text-[14px] leading-7 text-subtle">{LT("نزّل الاثنين كل شهر، وقبل أي تصفير، وحطهم بالفلاشة مع ملف الإكسل المحمي.", "Download both every month and before any reset, and keep them on the flash drive with the protected Excel file.")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <a href={codeUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1 rounded-2xl border border-[#E3E8EF] bg-white p-4 hover:border-navy-700">
          <span className="font-bold text-navy-900">⬇ {LT("تنزيل كود الموقع", "Download the site code")}</span>
          <span className="text-[13px] leading-6 text-subtle">{LT("من حسابك في GitHub (لازم تكون مسجّل دخول فيه). ما فيه بيانات عملاء.", "From your GitHub account (you must be signed in there). No customer data.")}</span>
        </a>
        <button type="button" onClick={data} disabled={busy} className="flex flex-col gap-1 rounded-2xl border border-red-200 bg-red-50/40 p-4 text-start hover:border-red-400 disabled:opacity-60">
          <span className="font-bold text-navy-900">⬇ {busy ? LT("جاري تجهيز النسخة… (ممكن دقيقة)", "Preparing… (may take a minute)") : LT("تنزيل البيانات", "Download the data")}</span>
          <span className="text-[13px] leading-6 text-subtle">{LT("العملاء وإيميلاتهم وأرقامهم، الريش والسجلات والمالية، نصوصك وإعداداتك، وصور الموقع. ⚠️ بيانات حساسة: احفظها بمكان آمن.", "Customers with emails and phones, credits, history and finance, your texts and settings, and the site pictures. ⚠️ Sensitive: keep it somewhere safe.")}</span>
        </button>
      </div>
      {msg?.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">{msg.error}</p>}
      {msg?.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{msg.ok}</p>}
    </section>
  );
}
