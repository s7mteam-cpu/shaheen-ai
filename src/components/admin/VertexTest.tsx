"use client";
import { useState } from "react";

/** Admin: «جرّب Vertex» sends one tiny request to Vertex AI and shows what came back. */
export function VertexTest({ hasKey }: { hasKey: boolean }) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  async function run() {
    setBusy(true); setOut("");
    try {
      const d = await (await fetch("/api/admin/vertex-test", { method: "POST" })).json();
      setOut(d.ok ? `✅ Vertex رد (${d.model}): ${d.reply || "—"}` : `❌ ${d.model ? `(${d.model}) ` : ""}${d.status ? `${d.status}: ` : ""}${d.error ?? "فشل"}`);
    } catch { setOut("❌ تعذّر الاتصال"); }
    setBusy(false);
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] text-subtle">{hasKey ? "مفتاح Vertex موجود في Vercel ✅" : "مفتاح Vertex غير موجود في Vercel (VERTEX_API_KEY)"}</span>
      <button type="button" onClick={run} disabled={busy || !hasKey} className="btn btn-outline w-fit py-2 text-sm">{busy ? "لحظة…" : "جرّب Vertex (طلب صغير)"}</button>
      {out && <span className="break-words text-[12px]" dir="auto">{out}</span>}
    </div>
  );
}
