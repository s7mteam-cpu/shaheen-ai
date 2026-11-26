"use client";
import { useActionState } from "react";
import { clearMine } from "./actions";

export function ClearForm({ user }: { user: string }) {
  const [r, act] = useActionState(clearMine, undefined);
  return (
    <form action={act} className="flex items-center gap-3">
      <input type="hidden" name="user" value={user} />
      <button className="text-[13px] font-semibold text-red-700 underline">امسح تعليماته</button>
      {r?.error && <span role="alert" className="text-[13px] font-semibold text-red-700">{r.error}</span>}
      {r?.ok && <span className="text-[13px] font-semibold text-green-700">{r.ok}</span>}
    </form>
  );
}
