"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useT } from "@/components/LangProvider";
import { linkSheet, syncNow, unlinkSheet } from "./actions";

type Res = { ok?: string; error?: string } | undefined;
const Msg = ({ r }: { r: Res }) => (r?.error ? <p role="alert" className="text-sm font-semibold text-red-700">{r.error}</p> : r?.ok ? <p className="text-sm font-semibold text-green-700">{r.ok}</p> : null);

function Submit({ children, busy, className = "btn btn-primary px-5 py-2.5" }: { children: React.ReactNode; busy: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={`${className} disabled:opacity-60`}>{pending ? busy : children}</button>;
}

export function LinkForm({ current }: { current?: string }) {
  const T = useT();
  const [r, act] = useActionState(linkSheet, undefined);
  return (
    <form action={act} className="flex flex-col gap-3">
      <label htmlFor="sheet" className="label">{T("رابط ملف Google Sheets", "Google Sheets link")}</label>
      <input id="sheet" name="sheet" required dir="ltr" defaultValue={current ? `https://docs.google.com/spreadsheets/d/${current}/edit` : ""} placeholder="https://docs.google.com/spreadsheets/d/…/edit" className="field text-left font-latin" />
      <div><Submit busy={T("جارٍ الربط والتعبئة… (أقل من دقيقة)", "Linking and filling… (under a minute)")}>{current ? T("حفظ وتحديث", "Save and update") : T("ربط الملف", "Link the file")}</Submit></div>
      <Msg r={r} />
    </form>
  );
}

export function SyncButtons() {
  const T = useT();
  const [r1, sync] = useActionState(syncNow, undefined);
  const [r2, unlink] = useActionState(unlinkSheet, undefined);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <form action={sync}><Submit busy={T("جارٍ التحديث…", "Updating…")}>{T("🔄 مزامنة الآن", "🔄 Sync now")}</Submit></form>
        <form action={unlink} onSubmit={(e) => { if (!confirm(T("توقف الربط؟ الملف يظل عندك بس ما يتحدّث.", "Stop the link? The file stays but won't update."))) e.preventDefault(); }}>
          <Submit busy="…" className="btn btn-outline px-5 py-2.5">{T("إيقاف الربط", "Unlink")}</Submit>
        </form>
      </div>
      <Msg r={r1 ?? r2} />
    </div>
  );
}
