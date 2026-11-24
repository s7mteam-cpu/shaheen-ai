"use client";
import { useState } from "react";

/** «الحساب والاشتراك»: one group of plans (individuals or companies) folded: the plan that matters shows on the face (the customer's own, or the most popular), and the rest open with one button. */
export function PlanFold({ title, sub, face, rest, more, less }: { title: string; sub: string; face: React.ReactNode; rest: React.ReactNode | null; more: string; less: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div><h3 className="text-lg font-bold text-navy-900">{title}</h3><p className="text-[13px] text-subtle">{sub}</p></div>
      {face}
      {rest && open && <div className="grid gap-4 md:grid-cols-2">{rest}</div>}
      {rest && <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="btn btn-outline w-full py-2.5 text-sm font-bold">{open ? less : more}</button>}
    </div>
  );
}
