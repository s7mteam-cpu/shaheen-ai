"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

export function QuickStart({ tools, name }: { tools: { id: string; name: string }[]; name: string }) {
  const router = useRouter();
  const [tool, setTool] = useState(tools[0]?.id ?? "image");
  const [text, setText] = useState("");
  const hour = new Date().getHours();
  const greet = hour < 12 ? "صباح الخير" : "مساء الخير";
  return (
    <section aria-labelledby="ask" className="card flex min-w-0 flex-[2_1_420px] flex-col gap-4 rounded-3xl p-7">
      <div><span className="text-[15px] text-subtle">{greet}{name ? `، ${name}` : ""}</span><h1 id="ask" className="mt-1 text-[28px] font-bold text-navy-900">وش تبي تصنع اليوم؟</h1></div>
      <label htmlFor="idea" className="sr-only">اكتب فكرتك</label>
      <textarea id="idea" rows={3} value={text} onChange={(e) => setText(e.target.value)} className="field resize-none leading-7"
        placeholder="مثال: صورة لعطري على رخام أبيض بإضاءة الصباح، أو ريلز لعرض الجمعة في محلي…" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="نوع العمل">
        {tools.map((t) => <button key={t.id} type="button" aria-pressed={tool === t.id} onClick={() => setTool(t.id)} className="chip">{t.name}</button>)}
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => router.push(`/app/tools/${tool}${text ? `?prompt=${encodeURIComponent(text)}` : ""}`)} className="btn btn-primary px-6 py-3">
          متابعة<Icon name="arrow" size={16} />
        </button>
      </div>
    </section>
  );
}
