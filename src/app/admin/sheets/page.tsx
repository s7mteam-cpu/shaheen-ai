import { guardPage } from "@/lib/server/auth";
import { serverT } from "@/lib/server/lang";
import { sheetsCreds } from "@/lib/server/googleSheets";
import { readSheetsConfig } from "@/lib/server/sheetsSync";
import { LinkForm, SyncButtons } from "./Forms";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const when = (iso: string | null | undefined, en: boolean) =>
  iso ? new Date(iso).toLocaleString(en ? "en-GB" : "ar-KW", { timeZone: "Asia/Kuwait", dateStyle: "medium", timeStyle: "short" }) : "—";

/** «ربط Google Sheets»: one Google file that mirrors «ملف البيانات» and updates itself. */
export default async function SheetsPage() {
  await guardPage("sheets");
  const T = await serverT();
  const en = T("ar", "en") === "en";
  const creds = sheetsCreds();
  const cfg = await readSheetsConfig().catch(() => null);
  const url = cfg?.id ? `https://docs.google.com/spreadsheets/d/${cfg.id}/edit` : null;
  const step = (n: number, title: string, body: React.ReactNode, ok?: boolean) => (
    <li className="flex gap-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ok ? "bg-green-600 text-white" : "bg-navy-900 text-white"}`}>{ok ? "✓" : n}</span>
      <div className="flex flex-col gap-1"><b className="text-navy-900">{title}</b><div className="text-sm leading-7 text-muted">{body}</div></div>
    </li>
  );
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">{T("ربط Google Sheets", "Google Sheets link")}</h1>
        <p className="mt-1 text-sm leading-7 text-subtle">{T(
          "ملف واحد بحسابك في Google فيه نفس أوراق «ملف البيانات» (العملاء، المدفوعات، المصروفات، الشركاء، الدورات…) بنفس الأعمدة والمعادلات والألوان، ويتحدّث لحاله: أي تغيير بالمنصة ينزل فيه خلال دقايق. وتقدر تفتحه من جوالك أي وقت.",
          "One file in your Google account with the same sheets as the data file (customers, payments, expenses, partners, cycles…) with the same columns, formulas and colours. It updates itself: any change on the platform reaches it within minutes, and you can open it from your phone any time.")}</p>
      </div>

      {cfg?.id && (
        <section className="card flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-navy-900">{T("الملف المربوط", "Linked file")}</h2>
            {url && <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-outline px-4 py-2 text-sm">{T("فتح الملف ↗", "Open the file ↗")}</a>}
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-subtle">{T("اسم الملف", "File name")}</dt><dd className="font-semibold">{cfg.title || "—"}</dd></div>
            <div><dt className="text-subtle">{T("آخر تحديث", "Last update")}</dt><dd className="font-semibold">{when(cfg.last_sync, en)}{cfg.took_ms ? ` (${Math.round(cfg.took_ms / 1000)} ${T("ثانية", "s")})` : ""}</dd></div>
            <div><dt className="text-subtle">{T("المحتوى", "Contents")}</dt><dd className="font-semibold">{cfg.tabs ? T(`${cfg.tabs} ورقة، ${cfg.rows ?? 0} سطر`, `${cfg.tabs} sheets, ${cfg.rows ?? 0} rows`) : "—"}</dd></div>
            <div><dt className="text-subtle">{T("الحالة", "Status")}</dt><dd className="font-semibold">{cfg.running_at ? T("⏳ يتحدّث الحين…", "⏳ Updating now…") : cfg.last_error ? T("⚠️ فيه مشكلة", "⚠️ Problem") : cfg.dirty ? T("فيه تغييرات بتنزل خلال دقايق", "Changes will arrive within minutes") : T("✓ محدّث", "✓ Up to date")}</dd></div>
          </dl>
          {cfg.last_error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-7 text-red-800">{cfg.last_error}<br /><span className="text-red-700/80">{T(`آخر محاولة: ${when(cfg.last_fail, en)}. بنعيد المحاولة تلقائياً كل 10 دقايق.`, `Last try: ${when(cfg.last_fail, en)}. It retries every 10 minutes.`)}</span></p>}
          <SyncButtons />
        </section>
      )}

      <section className="card flex flex-col gap-4 p-5">
        <h2 className="text-lg font-bold text-navy-900">{cfg?.id ? T("خطوات الربط (للرجوع لها)", "Setup steps (for reference)") : T("خطوات الربط", "Setup steps")}</h2>
        <ol className="flex flex-col gap-4">
          {step(1, T("فعّل Google Sheets API", "Enable the Google Sheets API"), <>{T("ادخل ", "Open ")}<a href="https://console.cloud.google.com/apis/library/sheets.googleapis.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Google Cloud Console</a>{T(" (نفس المشروع اللي فيه تسجيل الدخول بـ Google)، واضغط Enable.", " (the same project as Google sign-in) and press Enable.")}</>)}
          {step(2, T("سوّ حساب خدمة ونزّل مفتاحه", "Create a service account and download its key"), <>{T("من ", "In ")}<a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Service Accounts</a>{T(": Create service account، سمّه shaheen-sheets، واضغط Done (بدون أي صلاحيات). بعدين افتحه ← Keys ← Add key ← Create new key ← JSON. بينزل عندك ملف.", ": Create service account, name it shaheen-sheets, press Done (no roles). Then open it → Keys → Add key → Create new key → JSON. A file downloads.")}</>)}
          {step(3, T("حط المفتاح في Vercel بنفسك", "Put the key in Vercel yourself"), <>{T("افتح الملف بالمفكرة وانسخ كل اللي فيه. في Vercel ← Settings ← Environment Variables: الاسم ", "Open the file in a text editor and copy everything. In Vercel → Settings → Environment Variables: name ")}<code dir="ltr" className="rounded bg-tint px-1.5 py-0.5 font-latin">GOOGLE_SHEETS_CREDENTIALS</code>{T("، والقيمة الصق اللي نسخته. احفظ، وسوّ Redeploy. لا ترسل الملف لأحد، ولا لكلود، واحفظه بالفلاشة.", ", value: paste it. Save, then Redeploy. Don't send the file to anyone (Claude included); keep it on your USB drive.")}</>, !!creds)}
          {step(4, T("شارك ملفك مع حساب الخدمة", "Share your file with the service account"), creds
            ? <>{T("بملف Google Sheets اضغط «مشاركة»، وأضف هذا الإيميل كـ «محرر»، وشيل علامة «إرسال إشعار»:", "In your Google Sheets file press Share, add this e-mail as Editor, and untick Notify:")}<code dir="ltr" className="mt-1 block select-all break-all rounded-lg bg-tint px-3 py-2 font-latin text-[13px] text-navy-900">{creds.client_email}</code></>
            : T("بعد الخطوة 3 يطلع لك هنا الإيميل اللي تشارك معه الملف.", "After step 3, the e-mail to share the file with appears here."))}
          {step(5, T("الصق رابط الملف هنا", "Paste the file link here"), creds ? <LinkForm current={cfg?.id} /> : T("بعد الخطوة 3.", "After step 3."), !!cfg?.last_sync)}
        </ol>
      </section>

      <section className="rounded-2xl bg-amber-50 p-5 text-sm leading-7 text-amber-900">
        <b>{T("انتبه:", "Note:")}</b>
        <ul className="mt-1 list-disc ps-5">
          <li>{T("أوراق شاهين تنكتب من جديد مع كل تحديث، فلا تعدّل داخلها (بيطلع لك تنبيه). تبي تحسب شي خاص؟ سوّ ورقة جديدة من عندك واربطها بمعادلات، وأوراقك ما ننلمسها أبد.", "Shaheen's sheets are rewritten on every update, so don't edit inside them (you'll get a warning). Want your own calculations? Add your own sheet and link it with formulas. Your own sheets are never touched.")}</li>
          <li>{T("الملف فيه بيانات سرية (العملاء، الموظفين، الدخول والأمان). لا تشاركه مع أحد غير حساب الخدمة، وخلّ التحقق بخطوتين مفعّل على حساب Google.", "The file holds confidential data (customers, employees, sign-ins). Share it with nobody except the service account, and keep 2-step verification on for your Google account.")}</li>
          <li>{T("إذا وقفت الربط، الملف يظل عندك بآخر بيانات، بس ما يتحدّث.", "If you unlink, the file keeps its last data but stops updating.")}</li>
        </ul>
      </section>
    </div>
  );
}
