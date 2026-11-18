"use client";
import { L } from "@/lib/i18n/ui";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { tr, type Lang } from "@/lib/i18n";

type Act =
  | { kind: "make"; format: string; label: string; cost: number; enough: boolean; url: string; body: Record<string, unknown>; open: string }
  | { kind: "open"; label: string; href: string };
type Msg = { role: "user" | "assistant"; content: string; action?: Act };
type ActState = { st: "idle" | "working" | "done" | "error"; msg?: string; job?: string };
const KEY = "shaheen-chat";

/** Side panel assistant. Non-modal: the page stays usable while it's open. */
export function ShaheenChat({ name, voice = false, lang = "ar" }: { name?: string; voice?: boolean; lang?: Lang }) {
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [acts, setActs] = useState<Record<number, ActState>>({});
  const [saved, setSaved] = useState(false); // signed in: the conversation is kept on the server for 30 days
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // 🎙️ Voice: record → ElevenLabs turns it into text → it lands in the box to review and send.
  const [rec, setRec] = useState<"idle" | "recording" | "working">("idle");
  const [secs, setSecs] = useState(0);
  const [voiceNote, setVoiceNote] = useState("");
  const [canRecord, setCanRecord] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);
  // Live waveform while recording (bars follow the voice level, like voice notes).
  const [levels, setLevels] = useState<number[]>(() => Array(28).fill(0.08));
  const audioCtx = useRef<AudioContext | null>(null);
  const raf = useRef<number | null>(null);
  useEffect(() => { setCanRecord(voice && typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined"); }, [voice]);

  async function startRec() {
    setVoiceNote("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t));
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (cancelled.current) { setRec("idle"); return; }
        upload(new Blob(chunks.current, { type: r.mimeType || "audio/webm" }));
      };
      cancelled.current = false;
      r.start();
      recorder.current = r;
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtx.current = ctx;
        const buf = new Uint8Array(analyser.fftSize);
        let last = 0;
        const tick = (t: number) => {
          if (t - last > 70) {
            last = t;
            analyser.getByteTimeDomainData(buf);
            let sum = 0;
            for (const v of buf) sum += ((v - 128) / 128) ** 2;
            const level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
            setLevels((l) => [...l.slice(1), Math.max(0.08, level)]);
          }
          raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
      } catch { /* waveform is decoration only */ }
      setRec("recording"); setSecs(0);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      setVoiceNote(T("ما قدرنا نفتح المايك. اسمح للموقع يستخدم المايك من إعدادات المتصفح، وجرّب مرة ثانية.", "We couldn't access your microphone. Allow microphone access in your browser settings and try again."));
    }
  }
  /** ✓ keeps the recording (→ text), ✗ throws it away. */
  function stopRec(keep = true) {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null; }
    audioCtx.current?.close().catch(() => {}); audioCtx.current = null;
    setLevels(Array(28).fill(0.08));
    cancelled.current = !keep;
    if (recorder.current?.state === "recording") { setRec(keep ? "working" : "idle"); recorder.current.stop(); }
  }
  useEffect(() => { if (rec === "recording" && secs >= 60) stopRec(true); });   // one minute max per recording
  async function upload(blob: Blob) {
    try {
      const fd = new FormData(); fd.append("audio", blob, "voice");
      const r = await fetch("/api/assistant/voice", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (d.text) {
        setText((t) => (t.trim() ? `${t.trim()} ${d.text}` : d.text));
        setTimeout(() => input.current?.focus(), 50);
      } else setVoiceNote(d.error ? L(d.error) : T("ما قدرنا نحوّل الصوت لنص، جرّب مرة ثانية.", "We couldn't convert your voice to text. Please try again."));
    } catch {
      setVoiceNote(T("تعذّر الاتصال، جرّب مرة ثانية.", "Connection failed. Please try again."));
    } finally { setRec("idle"); }
  }
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    audioCtx.current?.close().catch(() => {});
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    try { const s = sessionStorage.getItem(KEY); if (s) setMsgs(JSON.parse(s)); } catch {}
    // signed-in customers get their saved conversation (last 30 days) back, on any device
    fetch("/api/assistant").then((r) => r.json()).then((d: { signedIn?: boolean; messages?: Msg[] }) => {
      if (!d.signedIn) return;
      setSaved(true);
      if (d.messages?.length) setMsgs(d.messages);
      else setMsgs([]);
    }).catch(() => null);
  }, []);
  useEffect(() => {
    if (!saved) { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch {} } else { try { sessionStorage.removeItem(KEY); } catch {} }
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
      const r = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }) });
      const d = await r.json();
      setMsgs([...next, { role: "assistant", content: d.reply ?? d.error ?? T("صار خطأ.", "Something went wrong."), ...(d.action ? { action: d.action as Act } : {}) }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: T("تعذّر الاتصال، حاول مرة ثانية.", "Connection failed. Please try again.") }]);
    } finally { setBusy(false); }
  }

  async function confirmAct(i: number, a: Extract<Act, { kind: "make" }>) {
    if (acts[i]?.st === "working" || acts[i]?.st === "done") return; // one press = one charge
    setActs((m) => ({ ...m, [i]: { st: "working" } }));
    try {
      const r = await fetch(a.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(a.body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.jobId) { setActs((m) => ({ ...m, [i]: { st: "error", msg: String(d.error || T("تعذّر التجهيز.", "Could not prepare it.")) } })); return; }
      setActs((m) => ({ ...m, [i]: { st: "done", job: String(d.jobId) } }));
    } catch { setActs((m) => ({ ...m, [i]: { st: "error", msg: T("تعذّر الاتصال.", "Connection failed.") } })); }
  }

  const starters = lang === "en" ? ["How do I use product photography?", "How many credits do I have left?", "Why did my last job fail?"] : ["كيف أستخدم تصوير المنتجات؟", "كم باقي من رصيدي؟", "ليش فشل طلبي الأخير؟"];

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label={T("كلّم شاهين", "Ask Shaheen")} className="fixed bottom-4 end-4 z-40 flex items-center gap-2 rounded-full bg-navy-800 p-2 text-[15px] font-bold text-white shadow-[0_10px_30px_-10px_rgba(11,42,74,0.6)] ring-1 ring-gold-500/50 hover:bg-navy-700 sm:bottom-5 sm:end-5 sm:py-2.5 sm:pe-5 sm:ps-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-950 sm:h-9 sm:w-9"><Image src="/brand/eagle.png" alt="" width={26} height={26} /></span>
          <span className="hidden sm:inline">{T("كلّم شاهين", "Ask Shaheen")}</span>
        </button>
      )}
      {open && (
        <aside aria-label={T("كلّم شاهين", "Ask Shaheen")} className="fixed bottom-0 end-0 top-0 z-40 flex w-full max-w-[400px] flex-col border-e border-line bg-white shadow-2xl sm:bottom-4 sm:end-4 sm:top-auto sm:h-[620px] sm:max-h-[calc(100vh-2rem)] sm:rounded-3xl sm:border">
          <header className="flex items-center justify-between gap-3 bg-navy-800 px-4 py-3.5 text-white sm:rounded-t-3xl">
            <span className="flex items-center gap-2.5">
              <Image src="/brand/eagle.png" alt="" width={30} height={30} />
              <span className="flex flex-col leading-tight"><span className="font-bold text-gold-500">{T("كلّم شاهين", "Ask Shaheen")}</span><span className="text-xs text-white/70">{T("مساعدك الذكي — متاح دائماً", "Your AI assistant — always available")}</span></span>
            </span>
            <div className="flex items-center gap-1">
              {msgs.length > 0 && <button type="button" onClick={() => { setMsgs([]); setActs({}); if (saved) fetch("/api/assistant", { method: "DELETE" }).catch(() => null); }} className="rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/10">{T("محادثة جديدة", "New chat")}</button>}
              <button type="button" aria-label={T("إغلاق", "Close")} onClick={() => setOpen(false)} className="rounded-lg px-2 text-2xl leading-none hover:bg-white/10">×</button>
            </div>
          </header>
          <div ref={list} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas p-4" aria-live="polite">
            <div className="max-w-[85%] self-start rounded-2xl rounded-tr-sm bg-white p-3 text-[15px] leading-7 shadow-sm">
              {lang === "en" ? `Hi${name ? ` ${name}` : ""} 👋 I'm Shaheen. I can help you use the tools, write better descriptions with you, or solve any issue with your account.` : `هلا${name ? ` ${name}` : ""} 👋 أنا شاهين. أقدر أساعدك تستخدم الأدوات، أكتب معك وصف أفضل، أو أحل أي مشكلة في حسابك.`}
            </div>
            {saved && msgs.length > 0 && <p className="self-center text-[12px] text-subtle">{T("محادثتك تنحفظ 30 يوم. «محادثة جديدة» تمسحها.", "Your chat is kept for 30 days. “New chat” deletes it.")}</p>}
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2">{starters.map((s) => <button key={s} type="button" onClick={() => setText(s)} className="rounded-full border border-field bg-white px-3 py-1.5 text-[13px] hover:border-navy-700">{s}</button>)}</div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className="flex max-w-[85%] flex-col gap-2 self-stretch" style={{ alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div className={`w-fit max-w-full whitespace-pre-line rounded-2xl p-3 text-[15px] leading-7 ${m.role === "user" ? "rounded-tl-sm bg-navy-800 text-white" : "rounded-tr-sm bg-white shadow-sm"}`}>{m.content}</div>
                {m.action?.kind === "make" && (() => { const a = m.action as Extract<Act, { kind: "make" }>; const st = acts[i]?.st ?? "idle"; return (
                  <div className="w-full rounded-2xl border border-gold-500 bg-white p-3 text-[14px] shadow-sm">
                    <p className="font-bold text-navy-900">{T(`جاهز أسوي لك ${a.label}`, `Ready to make your ${a.label}`)} · {a.cost} {T("ريشة", "credits")}</p>
                    {st === "done" ? <a href={`${a.open}${acts[i]?.job}`} className="btn btn-primary mt-2 w-full px-4 py-2 text-[14px]">{T("✓ انسوّى، افتحه وراجعه", "✓ Done — open it")}</a>
                      : !a.enough ? <p className="mt-2 text-red-700">{T("رصيدك ما يكفي لهذا الطلب.", "Not enough credits.")} <a href="/app/account" className="font-semibold underline">{T("اشحن رصيدك", "Add credits")}</a></p>
                      : <button type="button" disabled={st === "working"} onClick={() => confirmAct(i, a)} className="btn btn-gold mt-2 w-full px-4 py-2 text-[14px] font-bold disabled:opacity-50">{st === "working" ? T("جاري التجهيز…", "Preparing…") : T(`أكّد وجهّزه (${a.cost} ريشة)`, `Confirm (${a.cost} credits)`)}</button>}
                    {st === "error" && <p role="alert" className="mt-2 text-red-700">{acts[i]?.msg}</p>}
                  </div>
                ); })()}
                {m.action?.kind === "open" && <a href={m.action.href} className="btn btn-outline w-full px-4 py-2 text-[14px]">{T(`افتح أداة «${m.action.label}»`, `Open “${m.action.label}”`)}</a>}
              </div>
            ))}
            {busy && <div className="self-start rounded-2xl bg-white px-4 py-3 text-sm text-subtle shadow-sm">{T("شاهين يكتب…", "Shaheen is typing…")}</div>}
          </div>
          {voiceNote && rec === "idle" && <p role="alert" className="border-t border-line px-4 py-2 text-[13px] text-red-700">{voiceNote}</p>}
          {rec !== "idle" ? (
            // Recording bar — like voice notes: ✗ cancels, ✓ turns it into text in the box.
            <div className="flex items-center gap-2 border-t border-line p-3">
              <button type="button" onClick={() => stopRec(false)} disabled={rec === "working"} aria-label={T("إلغاء التسجيل", "Cancel recording")}
                className="btn btn-outline h-11 w-11 shrink-0 p-0 text-xl leading-none text-red-700 disabled:opacity-40">✕</button>
              <div role="status" className="flex h-11 flex-1 items-center gap-2.5 rounded-xl bg-canvas px-3 text-[14px] text-navy-900">
                {rec === "recording" ? (
                  <>
                    <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-600" />
                    <span className="font-latin text-[13px] font-semibold tabular-nums">0:{String(secs).padStart(2, "0")}</span>
                    <span aria-hidden className="flex h-7 flex-1 items-center justify-center gap-[3px] overflow-hidden" dir="ltr">
                      {levels.map((v, i) => <span key={i} className="w-[3px] shrink-0 rounded-full bg-navy-700 transition-[height] duration-75" style={{ height: `${Math.round(v * 100)}%` }} />)}
                    </span>
                    <span className="sr-only">{T("يسجّل", "Recording")}</span>
                  </>
                ) : (
                  <span className="flex flex-1 justify-center"><span aria-label={T("لحظة", "One moment")} className="h-5 w-5 animate-spin rounded-full border-2 border-navy-700 border-t-transparent" /></span>
                )}
              </div>
              <button type="button" onClick={() => stopRec(true)} disabled={rec === "working"} aria-label={T("تم، حوّل كلامي لنص", "Done, convert to text")}
                className="btn h-11 w-11 shrink-0 bg-emerald-600 p-0 text-xl leading-none text-white hover:bg-emerald-700 disabled:opacity-40">✓</button>
            </div>
          ) : (
            <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
              <label htmlFor="chat-input" className="sr-only">{T("رسالتك", "Your message")}</label>
              <textarea ref={input} id="chat-input" rows={1} value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={canRecord ? T("اكتب سؤالك أو اضغط المايك وتكلّم…", "Type your question or tap the mic…") : T("اكتب سؤالك…", "Type your question…")} className="field max-h-32 resize-none py-2.5" />
              {canRecord && (
                <button type="button" onClick={startRec} disabled={busy} aria-label={T("تكلّم بالصوت", "Speak")} className="btn btn-outline h-11 w-11 shrink-0 p-0 disabled:opacity-40">
                  <Icon name="mic" size={19} />
                </button>
              )}
              <button disabled={busy || !text.trim()} aria-label={T("إرسال", "Send")} className="btn btn-primary h-11 w-11 shrink-0 p-0"><Icon name="arrow" size={18} /></button>
            </form>
          )}
        </aside>
      )}
    </>
  );
}
