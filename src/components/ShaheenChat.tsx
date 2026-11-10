"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";

type Msg = { role: "user" | "assistant"; content: string };
const KEY = "shaheen-chat";

/** Side panel assistant. Non-modal: the page stays usable while it's open. */
export function ShaheenChat({ name }: { name?: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const s = sessionStorage.getItem(KEY); if (s) setMsgs(JSON.parse(s)); } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch {}
    // Scroll only inside the chat box (never the page), and only while it is open.
    if (open && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [msgs, open]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next); setText(""); setBusy(true);
    try {
      const r = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const d = await r.json();
      setMsgs([...next, { role: "assistant", content: d.reply ?? d.error ?? "صار خطأ." }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "تعذّر الاتصال، حاول مرة ثانية." }]);
    } finally { setBusy(false); }
  }

  const starters = ["كيف أستخدم تصوير المنتجات؟", "كم باقي من رصيدي؟", "ليش فشل طلبي الأخير؟"];

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label="كلّم شاهين" className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-navy-800 p-2 text-[15px] font-bold text-white shadow-[0_10px_30px_-10px_rgba(11,42,74,0.6)] ring-1 ring-gold-500/50 hover:bg-navy-700 sm:bottom-5 sm:left-5 sm:py-2.5 sm:pe-5 sm:ps-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-950 sm:h-9 sm:w-9"><Image src="/brand/eagle.png" alt="" width={26} height={26} /></span>
          <span className="hidden sm:inline">كلّم شاهين</span>
        </button>
      )}
      {open && (
        <aside aria-label="كلّم شاهين" className="fixed bottom-0 left-0 top-0 z-40 flex w-full max-w-[400px] flex-col border-e border-line bg-white shadow-2xl sm:bottom-4 sm:left-4 sm:top-auto sm:h-[620px] sm:max-h-[calc(100vh-2rem)] sm:rounded-3xl sm:border">
          <header className="flex items-center justify-between gap-3 bg-navy-800 px-4 py-3.5 text-white sm:rounded-t-3xl">
            <span className="flex items-center gap-2.5">
              <Image src="/brand/eagle.png" alt="" width={30} height={30} />
              <span className="flex flex-col leading-tight"><span className="font-bold text-gold-500">كلّم شاهين</span><span className="text-xs text-white/70">مساعدك الذكي — متاح دائماً</span></span>
            </span>
            <div className="flex items-center gap-1">
              {msgs.length > 0 && <button type="button" onClick={() => setMsgs([])} className="rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/10">محادثة جديدة</button>}
              <button type="button" aria-label="إغلاق" onClick={() => setOpen(false)} className="rounded-lg px-2 text-2xl leading-none hover:bg-white/10">×</button>
            </div>
          </header>
          <div ref={list} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas p-4" aria-live="polite">
            <div className="max-w-[85%] self-start rounded-2xl rounded-tr-sm bg-white p-3 text-[15px] leading-7 shadow-sm">
              هلا{name ? ` ${name}` : ""} 👋 أنا شاهين. أقدر أساعدك تستخدم الأدوات، أكتب معك وصف أفضل، أو أحل أي مشكلة في حسابك.
            </div>
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2">{starters.map((s) => <button key={s} type="button" onClick={() => setText(s)} className="rounded-full border border-field bg-white px-3 py-1.5 text-[13px] hover:border-navy-700">{s}</button>)}</div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`max-w-[85%] whitespace-pre-line rounded-2xl p-3 text-[15px] leading-7 ${m.role === "user" ? "self-end rounded-tl-sm bg-navy-800 text-white" : "self-start rounded-tr-sm bg-white shadow-sm"}`}>{m.content}</div>
            ))}
            {busy && <div className="self-start rounded-2xl bg-white px-4 py-3 text-sm text-subtle shadow-sm">شاهين يكتب…</div>}
          </div>
          <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
            <label htmlFor="chat-input" className="sr-only">رسالتك</label>
            <textarea id="chat-input" rows={1} value={text} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="اكتب سؤالك…" className="field max-h-32 resize-none py-2.5" />
            <button disabled={busy || !text.trim()} aria-label="إرسال" className="btn btn-primary h-11 w-11 shrink-0 p-0"><Icon name="arrow" size={18} /></button>
          </form>
        </aside>
      )}
    </>
  );
}
