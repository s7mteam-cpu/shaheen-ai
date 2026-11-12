"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { L, LT } from "@/lib/i18n/ui";

/**
 * Card pictures for the tools.
 *  - all tools: «ولّد صور واقعية لكل الأدوات» (only those without a picture, unless «استبدل» is ticked)
 *  - one tool: ready realistic picture / your own description for the AI / upload from the device
 */
export function CoversButton({ id }: { id?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const router = useRouter();

  async function send(kind: string, init: RequestInit) {
    setBusy(kind); setMsg(null);
    try {
      const r = await fetch("/api/admin/covers", { method: "POST", ...init });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((d.error && L(d.error)) || L("صار خطأ، حاول مرة ثانية."));
      if (!d.done?.length) throw new Error(d.failed?.length ? L("ما ضبطت الصورة، حاول مرة ثانية.") : L("كل الأدوات عندها صور. علّم «استبدل» لترسم من جديد."));
      setMsg({ ok: LT(`✓ تجهزت ${d.done.length} صورة${d.failed.length ? ` · ما ضبطت ${d.failed.length}` : ""}`, `✓ ${d.done.length} pictures ready${d.failed.length ? ` · ${d.failed.length} failed` : ""}`) });
      router.refresh();
    } catch (e) { setMsg({ error: (e as Error).message }); } finally { setBusy(null); }
  }
  const json = (b: object) => ({ headers: { "content-type": "application/json" }, body: JSON.stringify(b) });

  if (!id) return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={!!busy} onClick={() => send("all", json({ ids: [], replace }))} className="btn btn-gold px-5 py-2.5">
        {busy ? L("جاري التوليد… (لين دقيقتين)") : L("✨ ولّد صور واقعية لكل الأدوات")}
      </button>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="h-4 w-4" />{L("استبدل الصور الموجودة بعد")}</label>
      {msg?.ok && <span role="status" className="text-[13px] font-semibold text-emerald-700">{msg.ok}</span>}
      {msg?.error && <span role="alert" className="text-[13px] font-semibold text-red-700">{msg.error}</span>}
    </div>
  );

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-white p-3">
      <span className="text-[13px] font-bold text-navy-900">{L("غيّر صورة البطاقة:")}</span>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!busy} onClick={() => send("ai", json({ ids: [id], replace: true }))} className="btn btn-outline px-3.5 py-2 text-[13px]">
          {busy === "ai" ? L("جاري الرسم…") : L("✨ صورة واقعية جاهزة")}
        </button>
        <label className={`btn btn-outline px-3.5 py-2 text-[13px] ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
          {busy === "up" ? L("جاري الرفع…") : L("⬆️ ارفع صورة من جهازك")}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => {
            const f = e.target.files?.[0]; e.target.value = "";
            if (!f) return;
            const fd = new FormData(); fd.append("id", id); fd.append("file", f);
            send("up", { body: fd });
          }} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={L("✍️ اكتب وصف الصورة اللي تبيها، مثال: كوب قهوة عربية ودلّة على طاولة خشب")} className="field min-w-0 flex-1 !py-2 text-[13px]" />
        <button type="button" disabled={!!busy || prompt.trim().length < 4} onClick={() => send("custom", json({ ids: [id], replace: true, prompt }))} className="btn btn-primary px-3.5 py-2 text-[13px]">
          {busy === "custom" ? L("جاري الرسم…") : L("ارسمها")}
        </button>
      </div>
      {msg?.ok && <span role="status" className="text-[13px] font-semibold text-emerald-700">{msg.ok}</span>}
      {msg?.error && <span role="alert" className="text-[13px] font-semibold text-red-700">{msg.error}</span>}
    </div>
  );
}
