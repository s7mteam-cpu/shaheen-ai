"use client";
import { useState } from "react";
import { L } from "@/lib/i18n/ui";
import { setTrend } from "./actions";

/** Approve / reject, with the option to tweak the instruction first. */
export function Pending({ id, instruction }: { id: string; instruction: string }) {
  const [edit, setEdit] = useState(false);
  return (
    <form action={setTrend} className="flex w-full flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      {edit && <textarea name="instruction" defaultValue={instruction} rows={3} maxLength={500} className="field" />}
      <div className="flex flex-wrap gap-2">
        {edit ? <button name="act" value="edit" className="btn btn-outline px-4 py-2 text-sm">{L("حفظ التعديل")}</button>
          : <button type="button" onClick={() => setEdit(true)} className="btn btn-outline px-4 py-2 text-sm">{L("✏️ عدّل التعليمات")}</button>}
        <button name="act" value="approve" className="btn btn-gold px-5 py-2 text-sm">{L("✅ اعتماد")}</button>
        <button name="act" value="reject" className="rounded-xl px-4 py-2 text-sm text-red-700 hover:bg-red-50">{L("❌ رفض")}</button>
      </div>
    </form>
  );
}
