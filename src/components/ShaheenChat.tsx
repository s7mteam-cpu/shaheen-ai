"use client";
import { L } from "@/lib/i18n/ui";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { tr, type Lang } from "@/lib/i18n";
import { AGENTS, agentOf, isAgent, type AgentKey } from "@/lib/agents";
import { AgentFigure } from "@/components/AgentFigure";

type Act =
  | { kind: "make"; format: string; label: string; cost: number; enough: boolean; url: string; body?: Record<string, unknown>; form?: Record<string, string>; open: string }
  | { kind: "open"; label: string; href: string }
  | { kind: "handoff"; to: AgentKey };
type Msg = { role: "user" | "assistant"; content: string; action?: Act };
type ActState = { st: "idle" | "working" | "done" | "error"; msg?: string; job?: string };
const KEY = "shaheen-team"; // a visitor's conversations (one per team member) live in this tab only
type Threads = Partial<Record<AgentKey, Msg[]>>;

/** Side panel assistant. Non-modal: the page stays usable while it's open. */
export function ShaheenChat({ name, voice = false, lang = "ar" }: { name?: string; voice?: boolean; lang?: Lang }) {
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const [open, setOpen] = useState(false);
  // «الفريق»: the lobby shows the four of them at their desks; choosing one opens his own conversation
  const [agent, setAgent] = useState<AgentKey | null>(null);
  const [threads, setThreads] = useState<Threads>({});
  const me = agent ? agentOf(agent) : null;
  const msgs = (agent && threads[agent]) || [];
  const setMsgs = (list: Msg[], who: AgentKey | null = agent) => { if (who) setThreads((m) => ({ ...m, [who]: list })); };
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [acts, setActs] = useState<Record<string, ActState>>({});
  const ak = (i: number) => `${agent}:${i}`;
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
    try { const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null"); if (s && typeof s === "object" && !Array.isArray(s)) setThreads(Object.fromEntries(Object.entries(s).filter(([k, v]) => isAgent(k) && Array.isArray(v))) as Threads); } catch {}
    // signed-in customers get their saved conversations (last 30 days) back, on any device
    fetch("/api/assistant").then((r) => r.json()).then((d: { signedIn?: boolean; threads?: Threads }) => {
      if (!d.signedIn) return;
      setSaved(true);
      setThreads(d.threads && typeof d.threads === "object" ? d.threads : {});
    }).catch(() => null);
  }, []);
  useEffect(() => {
    if (!saved) { try { sessionStorage.setItem(KEY, JSON.stringify(Object.fromEntries(Object.entries(threads).map(([k, v]) => [k, (v ?? []).slice(-30)])))); } catch {} } else { try { sessionStorage.removeItem(KEY); } catch {} }
    // Scroll only inside the chat box (never the page), and only while it is open.
    if (open && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [threads, agent, open]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || busy || !agent) return;
    const who = agent; // the answer goes to the conversation it was asked in, even if the customer moves to a colleague meanwhile
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next, who); setText(""); setBusy(true);
    try {
      const r = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agent: who, messages: next.map(({ role, content }) => ({ role, content })) }) });
      const d = await r.json();
      setMsgs([...next, { role: "assistant", content: d.reply ?? d.error ?? T("صار خطأ.", "Something went wrong."), ...(d.action ? { action: d.action as Act } : {}) }], who);
    } catch {
      setMsgs([...next, { role: "assistant", content: T("تعذّر الاتصال، حاول مرة ثانية.", "Connection failed. Please try again.") }], who);
    } finally { setBusy(false); }
  }

  async function confirmAct(i: number, a: Extract<Act, { kind: "make" }>) {
    const k = ak(i);
    if (acts[k]?.st === "working" || acts[k]?.st === "done") return; // one press = one charge
    setActs((m) => ({ ...m, [k]: { st: "working" } }));
    try {
      const fd = a.form ? Object.entries(a.form).reduce((f, [k, v]) => (f.append(k, v), f), new FormData()) : null;
      const r = await fetch(a.url, fd ? { method: "POST", body: fd } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(a.body) });
      const d = await r.json().catch(() => ({}));
      d.jobId = d.jobId ?? d.id;
      if (!r.ok || !d.jobId || d.status === "failed") { setActs((m) => ({ ...m, [k]: { st: "error", msg: String(d.error || T("تعذّر التجهيز.", "Could not prepare it.")) } })); return; }
      setActs((m) => ({ ...m, [k]: { st: "done", job: String(d.jobId) } }));
    } catch { setActs((m) => ({ ...m, [k]: { st: "error", msg: T("تعذّر الاتصال.", "Connection failed.") } })); }
  }

  const en = lang === "en";
  const nm = (a: { name: string; nameEn: string }) => (en ? a.nameEn : a.name);
  /** move to a colleague, carrying the customer's last request so he does not type it again */
  function handoff(to: AgentKey) {
    const last = [...msgs].reverse().find((m) => m.role === "user")?.content ?? "";
    setAgent(to); setText(last); setTimeout(() => input.current?.focus(), 60);
  }
  function pick(k: AgentKey) { if (rec !== "idle") stopRec(false); setAgent(k); setVoiceNote(""); setTimeout(() => input.current?.focus(), 80); }
  const pods = [AGENTS.slice(0, 2), AGENTS.slice(2, 4)];

  return (
    <>
      <style>{CSS}</style>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} aria-label={T("كلّم شاهين", "Ask Shaheen")} className="shc-launch">
          <span className="shc-launch-i"><Image src="/brand/eagle.png" alt="" width={26} height={26} /></span>
          <span className="shc-launch-t">{T("كلّم شاهين", "Ask Shaheen")}</span>
        </button>
      )}
      {open && (
        <aside aria-label={T("كلّم شاهين", "Ask Shaheen")} className={`shc ${me ? "shc-chat" : "shc-lobby"}`} dir={en ? "ltr" : "rtl"} style={me ? { ["--ac" as string]: me.color } : undefined}>
          <div className="shc-bg" aria-hidden="true"><span className="shc-grid" /><span className="shc-beam" /></div>
          {!me ? (
            <>
              <header className="shc-top">
                <span className="shc-brand"><Image src="/brand/eagle.png" alt="" width={30} height={30} /><span><b>{T("فريق شاهين", "Team Shaheen")}</b><i>{T("أربعة مساعدين أذكياء، كل واحد بتخصصه", "Four AI assistants, each with a specialty")}</i></span></span>
                <button type="button" aria-label={T("إغلاق", "Close")} onClick={() => setOpen(false)} className="shc-x">×</button>
              </header>
              <div className="shc-office">
                <p className="shc-ask">{en ? `Hi${name ? ` ${name}` : ""}, who would you like to talk to?` : `هلا${name ? ` ${name}` : ""}، مع منو تبي تتكلم؟`}</p>
                <div className="shc-pods">
                  {pods.map((pair, pi) => (
                    <div key={pi} className="shc-pod">
                      {pair.map((a, ai) => (
                        <button key={a.key} type="button" onClick={() => pick(a.key)} className="shc-seat" style={{ ["--ac" as string]: a.color }} aria-label={`${nm(a)}، ${en ? a.roleEn : a.role}`}>
                          <span className="shc-tag"><span className="shc-dot" />{nm(a)}{(threads[a.key]?.length ?? 0) > 0 && <span className="shc-badge" title={T("عندك محادثة معه", "You have a chat with him")} />}</span>
                          <span className="shc-role">{en ? a.roleEn : a.role}</span>
                          {/* the first of each pair looks at his screen on the outer side, the second is mirrored: they sit back to back */}
                          <AgentFigure agent={a.key} color={a.color} flip={en ? ai === 1 : ai === 0} />
                          <span className="shc-line">{en ? a.lineEn : a.line}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="shc-foot">{T("مساعدين بالذكاء الاصطناعي. ما يتنفذ شي ولا تنخصم ريش إلا بعد ما تضغط «أكّد».", "AI assistants. Nothing runs and no credits are used until you press Confirm.")}</p>
              </div>
            </>
          ) : (
            <>
              <header className="shc-top">
                <span className="shc-brand">
                  <span className="shc-ava"><AgentFigure agent={me.key} color={me.color} small /></span>
                  <span><b>{nm(me)}</b><i><span className="shc-dot" />{en ? me.roleEn : me.role}</i></span>
                </span>
                <span className="shc-tools">
                  <button type="button" onClick={() => { if (rec !== "idle") stopRec(false); setAgent(null); }} className="shc-link">{T("الفريق", "Team")}</button>
                  {msgs.length > 0 && <button type="button" onClick={() => { setMsgs([]); setActs((m) => Object.fromEntries(Object.entries(m).filter(([k]) => !k.startsWith(`${agent}:`)))); if (saved) fetch(`/api/assistant?agent=${agent}`, { method: "DELETE" }).catch(() => null); }} className="shc-link">{T("محادثة جديدة", "New chat")}</button>}
                  <button type="button" aria-label={T("إغلاق", "Close")} onClick={() => setOpen(false)} className="shc-x">×</button>
                </span>
              </header>
              <div ref={list} className="shc-list" aria-live="polite">
                <div className="shc-msg shc-a">{en ? me.helloEn : me.hello}</div>
                {saved && msgs.length > 0 && <p className="shc-note">{T("محادثتك تنحفظ 30 يوم. «محادثة جديدة» تمسحها.", "Your chat is kept for 30 days. “New chat” deletes it.")}</p>}
                {msgs.length === 0 && <div className="shc-chips">{(en ? me.startersEn : me.starters).map((s) => <button key={s} type="button" onClick={() => setText(s)}>{s}</button>)}</div>}
                {msgs.map((m, i) => (
                  <div key={i} className={`shc-row ${m.role === "user" ? "shc-ru" : "shc-ra"}`}>
                    <div className={`shc-msg ${m.role === "user" ? "shc-u" : "shc-a"}`}>{m.content}</div>
                    {m.action?.kind === "make" && (() => { const a = m.action as Extract<Act, { kind: "make" }>; const st = acts[ak(i)]?.st ?? "idle"; return (
                      <div className="shc-card">
                        <p><b>{T(`جاهز أسوي لك ${a.label}`, `Ready to make your ${a.label}`)}</b> · {a.cost} {T("ريشة", "credits")}</p>
                        {st === "done" ? <a href={`${a.open}${acts[ak(i)]?.job}`} className="shc-go">{T("✓ انسوّى، افتحه وراجعه", "✓ Done — open it")}</a>
                          : !a.enough ? <p className="shc-err">{T("رصيدك ما يكفي لهذا الطلب.", "Not enough credits.")} <a href="/app/account">{T("اشحن رصيدك", "Add credits")}</a></p>
                          : <button type="button" disabled={st === "working"} onClick={() => confirmAct(i, a)} className="shc-go">{st === "working" ? T("جاري التجهيز…", "Preparing…") : T(`أكّد وجهّزه (${a.cost} ريشة)`, `Confirm (${a.cost} credits)`)}</button>}
                        {st === "error" && <p role="alert" className="shc-err">{acts[ak(i)]?.msg}</p>}
                      </div>
                    ); })()}
                    {m.action?.kind === "open" && <a href={m.action.href} className="shc-ghost">{T(`افتح أداة «${m.action.label}»`, `Open “${m.action.label}”`)}</a>}
                    {m.action?.kind === "handoff" && (() => { const to = agentOf((m.action as Extract<Act, { kind: "handoff" }>).to); return (
                      <button type="button" onClick={() => handoff(to.key)} className="shc-ghost" style={{ ["--ac" as string]: to.color }}>{T(`كلّم ${to.name} (${to.role})`, `Talk to ${to.nameEn} (${to.roleEn})`)}</button>
                    ); })()}
                  </div>
                ))}
                {busy && <div className="shc-msg shc-a shc-typing" aria-label={T(`${me.name} يكتب`, `${me.nameEn} is typing`)}><i /><i /><i /></div>}
              </div>
              {voiceNote && rec === "idle" && <p role="alert" className="shc-vnote">{voiceNote}</p>}
              {rec !== "idle" ? (
                // Recording: only the pulsing microphone and the live bar. The mic ends it and turns it into text; × throws it away.
                <div className="shc-rec" role="status">
                  <button type="button" onClick={() => stopRec(false)} disabled={rec === "working"} aria-label={T("إلغاء التسجيل", "Cancel recording")} className="shc-rx">×</button>
                  <span aria-hidden className="shc-wave" dir="ltr">{levels.map((v, i) => <i key={i} style={{ height: `${Math.round((rec === "recording" ? v : 0.12) * 100)}%` }} />)}</span>
                  <span className="shc-secs">0:{String(secs).padStart(2, "0")}</span>
                  <button type="button" onClick={() => stopRec(true)} disabled={rec === "working"} aria-label={T("تم، حوّل كلامي لنص", "Done, convert to text")} className={`shc-mic shc-live ${rec === "working" ? "shc-wait" : ""}`}><Icon name="mic" size={22} /></button>
                  <span className="sr-only">{rec === "recording" ? T("يسجّل", "Recording") : T("لحظة", "One moment")}</span>
                </div>
              ) : (
                <form onSubmit={send} className="shc-form">
                  <label htmlFor="chat-input" className="sr-only">{T("رسالتك", "Your message")}</label>
                  <textarea ref={input} id="chat-input" rows={1} value={text} onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={canRecord ? T(`اكتب لـ${me.name} أو اضغط المايك…`, `Message ${me.nameEn} or tap the mic…`) : T(`اكتب لـ${me.name}…`, `Message ${me.nameEn}…`)} />
                  {canRecord && <button type="button" onClick={startRec} disabled={busy} aria-label={T("تكلّم بالصوت", "Speak")} className="shc-mic"><Icon name="mic" size={20} /></button>}
                  <button disabled={busy || !text.trim()} aria-label={T("إرسال", "Send")} className="shc-send"><Icon name="arrow" size={18} /></button>
                </form>
              )}
            </>
          )}
        </aside>
      )}
    </>
  );
}

/** The window is always dark and self-contained: none of the site's light/dark classes are used inside it. */
const CSS = `
.shc-launch{position:fixed;bottom:16px;inset-inline-end:16px;z-index:40;display:flex;align-items:center;gap:8px;padding:8px;border-radius:999px;border:1px solid rgba(201,164,92,.6);background:linear-gradient(135deg,#0B2A4A,#061A30);color:#fff;font-weight:700;font-size:15px;box-shadow:0 10px 30px -10px rgba(6,26,48,.7),0 0 0 0 rgba(201,164,92,.5);animation:shc-ring 2.8s ease-out infinite}
.shc-launch:hover{border-color:#F2C55C}
.shc-launch-i{display:flex;height:40px;width:40px;align-items:center;justify-content:center;border-radius:999px;background:#061A30}
.shc-launch-t{display:none;padding-inline-end:12px}
@media(min-width:640px){.shc-launch{bottom:20px;inset-inline-end:20px}.shc-launch-t{display:inline}}
@keyframes shc-ring{0%{box-shadow:0 10px 30px -10px rgba(6,26,48,.7),0 0 0 0 rgba(201,164,92,.45)}70%,100%{box-shadow:0 10px 30px -10px rgba(6,26,48,.7),0 0 0 14px rgba(201,164,92,0)}}
.shc{--ac:#C9A45C;position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;overflow:hidden;background:#04101F;color:#EAF0F8;font-size:15px;box-shadow:0 30px 80px -20px rgba(0,0,0,.75);animation:shc-in .28s ease-out both}
@media(min-width:640px){.shc{inset:auto;bottom:16px;inset-inline-end:16px;width:430px;height:660px;max-height:calc(100vh - 32px);border-radius:26px;border:1px solid rgba(255,255,255,.1)}.shc.shc-lobby{width:min(760px,calc(100vw - 32px));height:560px}}
@keyframes shc-in{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
.shc-bg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 70% at 50% -10%,rgba(30,82,135,.55),transparent 60%),radial-gradient(60% 40% at 50% 105%,color-mix(in srgb,var(--ac) 22%,transparent),transparent 70%),linear-gradient(180deg,#061A30,#030B16)}
.shc-grid{position:absolute;left:-30%;right:-30%;bottom:-6%;height:52%;background-image:linear-gradient(rgba(120,190,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(120,190,255,.16) 1px,transparent 1px);background-size:44px 44px;transform:perspective(520px) rotateX(62deg);transform-origin:50% 0;mask-image:linear-gradient(180deg,transparent,#000 30%,transparent 96%);-webkit-mask-image:linear-gradient(180deg,transparent,#000 30%,transparent 96%);animation:shc-floor 9s linear infinite}
@keyframes shc-floor{to{background-position:0 44px,0 0}}
.shc-beam{position:absolute;top:0;left:12%;right:12%;height:2px;background:linear-gradient(90deg,transparent,rgba(242,197,92,.9),rgba(79,216,255,.9),transparent);filter:blur(.4px);opacity:.8}
.shc-chat .shc-grid{opacity:.35}
.shc-top{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(4,16,31,.55);backdrop-filter:blur(8px)}
.shc-brand{display:flex;align-items:center;gap:10px;min-width:0}
.shc-brand b{display:block;font-weight:800;color:#fff;line-height:1.25}
.shc-brand i{display:flex;align-items:center;gap:6px;font-style:normal;font-size:12px;color:rgba(234,240,248,.7)}
.shc-chat .shc-brand b{color:var(--ac)}
.shc-ava{display:block;height:42px;width:42px;flex:none;overflow:hidden;border-radius:999px;background:#0B2A4A;border:1.5px solid var(--ac);box-shadow:0 0 14px -2px var(--ac)}
.shc-tools{display:flex;align-items:center;gap:2px;flex:none}
.shc-link{padding:5px 8px;border-radius:9px;font-size:12px;color:rgba(234,240,248,.75)}
.shc-link:hover{background:rgba(255,255,255,.08);color:#fff}
.shc-x{padding:0 8px;border-radius:9px;font-size:26px;line-height:1;color:rgba(234,240,248,.8)}
.shc-x:hover{background:rgba(255,255,255,.08);color:#fff}
.shc-dot{display:inline-block;height:7px;width:7px;flex:none;border-radius:999px;background:#39E58C;box-shadow:0 0 8px #39E58C;animation:shc-blink 2.4s ease-in-out infinite}
@keyframes shc-blink{50%{opacity:.45}}
.shc-office{position:relative;display:flex;flex:1;flex-direction:column;gap:6px;overflow-y:auto;padding:14px 12px 12px}
.shc-ask{text-align:center;font-size:17px;font-weight:700;color:#fff}
.shc-pods{display:grid;flex:1;grid-template-columns:1fr;gap:6px;align-content:center}
@media(min-width:640px){.shc-pods{grid-template-columns:1fr 1fr;gap:14px}}
.shc-pod{position:relative;display:grid;grid-template-columns:1fr 1fr;align-items:end}
.shc-pod::after{content:"";position:absolute;left:8%;right:8%;bottom:34px;height:1px;background:linear-gradient(90deg,transparent,rgba(120,190,255,.35),transparent)}
.shc-seat{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px 4px;border-radius:18px;transition:transform .25s ease,background .25s ease;-webkit-tap-highlight-color:transparent}
.shc-seat:hover,.shc-seat:focus-visible{transform:translateY(-4px);background:radial-gradient(70% 60% at 50% 55%,color-mix(in srgb,var(--ac) 16%,transparent),transparent 70%);outline:none}
.shc-seat:focus-visible .shc-tag{outline:2px solid #fff;outline-offset:2px}
.shc-tag{position:relative;display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;border:1px solid var(--ac);background:rgba(4,16,31,.72);color:#fff;font-size:15px;font-weight:800;white-space:nowrap;box-shadow:0 0 16px -4px var(--ac),inset 0 0 12px -8px var(--ac);animation:shc-float 4.5s ease-in-out infinite}
.shc-seat:nth-child(2) .shc-tag{animation-delay:-2.2s}
@keyframes shc-float{50%{transform:translateY(-3px)}}
.shc-badge{position:absolute;top:-3px;inset-inline-end:-3px;height:9px;width:9px;border-radius:999px;background:var(--ac);box-shadow:0 0 8px var(--ac)}
.shc-role{font-size:12px;font-weight:700;color:var(--ac);letter-spacing:.2px}
.shc-line{min-height:30px;max-width:150px;text-align:center;font-size:11px;line-height:1.35;color:rgba(234,240,248,.62)}
.shc-foot{text-align:center;font-size:11px;color:rgba(234,240,248,.5)}
.shc-fig{display:block;width:100%;max-width:168px;height:auto;overflow:visible;filter:drop-shadow(0 0 10px color-mix(in srgb,var(--ac) 35%,transparent))}
.shc-fig-s{max-width:none;height:100%;filter:none}
.shc-fig .shc-head{transform-box:fill-box;transform-origin:50% 90%;animation:shc-nod 5s ease-in-out infinite}
.shc-fig .shc-body{animation:shc-breathe 3.6s ease-in-out infinite}
.shc-fig .shc-arm{animation:shc-type .34s ease-in-out infinite alternate}
.shc-fig .shc-eye{transform-box:fill-box;transform-origin:50% 50%;animation:shc-wink 4.2s infinite}
.shc-fig .shc-screen{animation:shc-glow 3s ease-in-out infinite}
.shc-fig .shc-l1{animation:shc-w1 2.6s ease-in-out infinite}.shc-fig .shc-l2{animation:shc-w2 3.1s ease-in-out infinite}.shc-fig .shc-l3{animation:shc-w1 2.2s ease-in-out infinite reverse}.shc-fig .shc-l4{animation:shc-w2 2.8s ease-in-out infinite reverse}
.shc-fig .shc-cur{animation:shc-blink .9s steps(2) infinite}
.shc-fig .shc-prop{animation:shc-float 3.8s ease-in-out infinite}
.shc-seat:nth-child(2) .shc-head{animation-delay:-2.4s}.shc-seat:nth-child(2) .shc-arm{animation-duration:.41s}.shc-seat:nth-child(2) .shc-eye{animation-delay:-1.7s}
.shc-pod:nth-child(2) .shc-head{animation-duration:6.2s}.shc-pod:nth-child(2) .shc-arm{animation-duration:.29s}
.shc-seat:hover .shc-arm,.shc-seat:focus-visible .shc-arm{animation-duration:.16s}
.shc-seat:hover .shc-screen,.shc-seat:focus-visible .shc-screen{filter:drop-shadow(0 0 9px var(--ac))}
@keyframes shc-nod{0%,100%{transform:rotate(0)}30%{transform:rotate(-3deg)}62%{transform:rotate(2.5deg)}}
@keyframes shc-breathe{50%{transform:translateY(-1.2px)}}
@keyframes shc-type{from{transform:translateY(0)}to{transform:translateY(2.4px)}}
@keyframes shc-wink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes shc-glow{50%{filter:drop-shadow(0 0 6px var(--ac))}}
@keyframes shc-w1{0%,100%{width:30px}50%{width:46px}}
@keyframes shc-w2{0%,100%{width:44px}50%{width:20px}}
.shc-list{position:relative;display:flex;flex:1;flex-direction:column;gap:11px;overflow-y:auto;padding:14px}
.shc-row{display:flex;max-width:88%;flex-direction:column;gap:8px}
.shc-ru{align-self:flex-end;align-items:flex-end}.shc-ra{align-self:flex-start;align-items:flex-start}
.shc-msg{width:fit-content;max-width:100%;white-space:pre-line;padding:10px 13px;border-radius:18px;line-height:1.85;font-size:15px}
.shc-list>.shc-msg{max-width:88%;align-self:flex-start}
.shc-a{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);color:#EAF0F8;border-start-start-radius:6px;backdrop-filter:blur(6px)}
.shc-u{background:linear-gradient(135deg,color-mix(in srgb,var(--ac) 92%,#fff),color-mix(in srgb,var(--ac) 70%,#0B2A4A));color:#061A30;font-weight:600;border-start-end-radius:6px}
.shc-note{align-self:center;font-size:12px;color:rgba(234,240,248,.5)}
.shc-chips{display:flex;flex-wrap:wrap;gap:7px}
.shc-chips button{padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);font-size:13px;color:#EAF0F8}
.shc-chips button:hover{border-color:var(--ac);color:#fff}
.shc-typing{display:flex;gap:5px;padding:14px 16px}
.shc-typing i{height:7px;width:7px;border-radius:999px;background:var(--ac);animation:shc-dots 1.1s ease-in-out infinite}
.shc-typing i:nth-child(2){animation-delay:.15s}.shc-typing i:nth-child(3){animation-delay:.3s}
@keyframes shc-dots{0%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
.shc-card{width:100%;padding:12px;border-radius:16px;border:1px solid var(--ac);background:rgba(4,16,31,.7);font-size:14px;box-shadow:0 0 18px -8px var(--ac)}
.shc-card b{color:#fff}
.shc-go{display:flex;width:100%;align-items:center;justify-content:center;margin-top:9px;padding:9px 14px;border-radius:12px;background:var(--ac);color:#061A30;font-size:14px;font-weight:800}
.shc-go:disabled{opacity:.55}
.shc-ghost{display:flex;width:100%;align-items:center;justify-content:center;padding:9px 14px;border-radius:12px;border:1px solid var(--ac);background:rgba(255,255,255,.04);color:#fff;font-size:14px;font-weight:700}
.shc-ghost:hover{background:color-mix(in srgb,var(--ac) 16%,transparent)}
.shc-err{margin-top:8px;color:#FF9A9A}.shc-err a{font-weight:700;text-decoration:underline;color:#fff}
.shc-vnote{position:relative;padding:8px 14px;border-top:1px solid rgba(255,255,255,.08);font-size:13px;color:#FF9A9A}
.shc-form,.shc-rec{position:relative;display:flex;align-items:flex-end;gap:8px;padding:11px 12px;border-top:1px solid rgba(255,255,255,.08);background:rgba(4,16,31,.6);backdrop-filter:blur(8px)}
.shc-form textarea{flex:1;min-width:0;max-height:128px;resize:none;padding:10px 13px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-size:15px;line-height:1.6}
.shc-form textarea::placeholder{color:rgba(234,240,248,.45)}
.shc-form textarea:focus{outline:none;border-color:var(--ac);box-shadow:0 0 0 3px color-mix(in srgb,var(--ac) 22%,transparent)}
.shc-mic,.shc-send{display:flex;height:44px;width:44px;flex:none;align-items:center;justify-content:center;border-radius:14px}
.shc-mic{border:1px solid color-mix(in srgb,var(--ac) 60%,transparent);background:rgba(255,255,255,.05);color:var(--ac)}
.shc-mic:hover{background:color-mix(in srgb,var(--ac) 16%,transparent)}
.shc-send{background:var(--ac);color:#061A30}
.shc-send:disabled,.shc-mic:disabled{opacity:.4}
[dir="ltr"] .shc-send svg{transform:scaleX(-1)}
.shc-rec{align-items:center;gap:12px;padding:12px 14px}
.shc-rx{height:34px;width:34px;flex:none;border-radius:999px;font-size:22px;line-height:1;color:rgba(234,240,248,.7)}
.shc-rx:hover{background:rgba(255,255,255,.08);color:#fff}
.shc-wave{display:flex;height:40px;flex:1;align-items:center;justify-content:center;gap:3px;overflow:hidden}
.shc-wave i{width:3px;min-height:3px;flex:none;border-radius:999px;background:linear-gradient(180deg,#fff,var(--ac));box-shadow:0 0 8px var(--ac);transition:height 80ms linear}
.shc-secs{font-variant-numeric:tabular-nums;font-size:13px;font-weight:700;color:rgba(234,240,248,.8)}
.shc-live{height:52px;width:52px;border-radius:999px;border:0;background:var(--ac);color:#061A30;animation:shc-pulse 1.3s ease-out infinite}
.shc-live.shc-wait{animation:shc-blink 1s ease-in-out infinite}
@keyframes shc-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--ac) 70%,transparent)}100%{box-shadow:0 0 0 16px transparent}}
@media(min-width:640px){.shc-fig{max-width:212px}.shc-tag{font-size:16px}}
@media(max-width:639px){.shc-ask{font-size:16px}.shc-line{display:none}.shc-pod::after{bottom:10px}}
@media(prefers-reduced-motion:reduce){.shc,.shc *,.shc-launch{animation:none!important;transition:none!important}}
`;
