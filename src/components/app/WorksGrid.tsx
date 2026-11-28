"use client";
import { L } from "@/lib/i18n/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkCard, type Work } from "@/components/app/WorkCard";
import { Icon } from "@/components/Icon";

export function WorksGrid({ works }: { works: Work[] }) {
  const [list, setList] = useState(works);
  const [q, setQ] = useState("");
  const router = useRouter();
  async function del(id: string) {
    if (!confirm(L("حذف هذا العمل نهائياً؟"))) return;
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    setList((l) => l.filter((w) => w.id !== id)); router.refresh();
  }
  const shown = list.filter((w) => !q || (w.title ?? "").includes(q) || w.toolName.includes(q));
  return (
    <>
      <label className="sr-only" htmlFor="q">{L("ابحث في أعمالك")}</label>
      <div className="relative sm:max-w-sm">
        <Icon name="search" size={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-subtle" />
        <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("ابحث في أعمالك")} className="field bg-white ps-10" />
      </div>
      {shown.length ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] sm:gap-4">{shown.map((w) => <WorkCard key={w.id} w={w} onDelete={del} />)}</div>
      ) : <p className="rounded-2xl border-[1.5px] border-dashed border-field bg-white p-10 text-center text-subtle">{L("ما فيه أعمال هنا.")}</p>}
    </>
  );
}
