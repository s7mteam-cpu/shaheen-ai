"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WorkCard, type Work } from "@/components/app/WorkCard";

export function WorksGrid({ works }: { works: Work[] }) {
  const [list, setList] = useState(works);
  const [q, setQ] = useState("");
  const router = useRouter();
  async function del(id: string) {
    if (!confirm("حذف هذا العمل نهائياً؟")) return;
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    setList((l) => l.filter((w) => w.id !== id)); router.refresh();
  }
  const shown = list.filter((w) => !q || (w.title ?? "").includes(q) || w.toolName.includes(q));
  return (
    <>
      <label className="sr-only" htmlFor="q">ابحث في أعمالك</label>
      <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في أعمالك" className="field max-w-sm bg-white" />
      {shown.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">{shown.map((w) => <WorkCard key={w.id} w={w} onDelete={del} />)}</div>
      ) : <p className="rounded-2xl border-[1.5px] border-dashed border-field bg-white p-10 text-center text-subtle">ما فيه أعمال هنا.</p>}
    </>
  );
}
