"use client";
import { Progress } from "@/components/app/Progress";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { Media, WorkCard, type Work, type WorkFile } from "@/components/app/WorkCard";
import { defaultValues, toolSpecs, type Field, type Values } from "@/lib/tools/specs";
import { editHints } from "@/lib/tools/edit";

type Props = {
  tool: { id: string; name: string; credit_cost: number; edit_cost: number; cost_unit: string };
  balance: number;
  voices: { id: string; name: string }[];
  recent: Work[];
};
type Upload = { path: string; name: string; preview?: string };
type JobView = { id: string; status: string; error?: string | null; files: WorkFile[]; progress?: number };

const accepts = { image: "image/png,image/jpeg,image/webp", video: "video/mp4,video/quicktime,video/webm", audio: "audio/*" };

export function ToolRunner({ tool, balance: initialBalance, voices, recent }: Props) {
  const spec = toolSpecs[tool.id];
  const params = useSearchParams();
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => {
    const v = defaultValues(spec);
    const p = params.get("prompt");
    if (p) for (const k of ["prompt", "text", "script"]) if (k in v) { v[k] = p; break; }
    if ("voice" in v && voices[0]) v.voice = voices[0].id;
    return v;
  });
  const [uploads, setUploads] = useState<Record<string, Upload[]>>({});
  const [busyUpload, setBusyUpload] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [job, setJob] = useState<JobView | null>(null);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editOpts, setEditOpts] = useState<Record<string, unknown>>({});
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const clipSecs = useRef<Record<string, number>>({});

  const units = useMemo(() => Math.max(1, spec.units(values)), [spec, values]);
  const cost = units * tool.credit_cost;
  const set = (k: string, val: unknown) => setValues((v) => ({ ...v, [k]: val }));

  async function load(id: string) {
    const r = await fetch(`/api/jobs/${id}`);
    if (!r.ok) return;
    const j = (await r.json()) as JobView;
    setJob(j);
    if (j.status === "done" || j.status === "failed") { if (poll.current) clearInterval(poll.current); router.refresh(); }
    // Smart montage: the plan is ready → open the live editor.
    if (j.status === "draft") { if (poll.current) clearInterval(poll.current); router.replace(`/app/tools/${tool.id}?job=${id}`); router.refresh(); }
  }
  function watch(id: string) {
    if (poll.current) clearInterval(poll.current);
    load(id);
    poll.current = setInterval(() => load(id), 4000);
  }
  useEffect(() => {
    const id = params.get("job");
    if (id) watch(id);
    return () => { if (poll.current) clearInterval(poll.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addFiles(f: Extract<Field, { type: "files" }>, list: FileList | null) {
    if (!list?.length) return;
    setError(""); setBusyUpload(true);
    try {
      const supabase = createClient();
      const current = uploads[f.name] ?? [];
      const room = f.max - current.length;
      const added: Upload[] = [];
      for (const file of Array.from(list).slice(0, room)) {
        const r = await fetch("/api/uploads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: f.accept, type: file.type, size: file.size, name: file.name }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        const { error: upErr } = await supabase.storage.from("uploads").uploadToSignedUrl(d.path, d.token, file);
        if (upErr) throw new Error("تعذّر رفع الملف.");
        if (f.accept === "video") {
          const secs = await new Promise<number>((res) => {
            const el = document.createElement("video");
            el.preload = "metadata"; el.onloadedmetadata = () => res(el.duration || 60); el.onerror = () => res(60);
            el.src = URL.createObjectURL(file);
          });
          // several clips: the paid length is their total
          clipSecs.current[d.path] = secs;
          setValues((v) => ({ ...v, duration_seconds: Math.ceil(Object.values(clipSecs.current).reduce((a, b) => a + b, 0)) }));
        }
        added.push({ path: d.path, name: file.name, preview: f.accept === "image" ? URL.createObjectURL(file) : undefined });
      }
      const next = [...current, ...added];
      setUploads((u) => ({ ...u, [f.name]: next }));
      set(f.name, next.map((x) => x.path));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر رفع الملف.");
    } finally { setBusyUpload(false); }
  }
  function removeFile(name: string, path: string) {
    const next = (uploads[name] ?? []).filter((x) => x.path !== path);
    setUploads((u) => ({ ...u, [name]: next }));
    set(name, next.map((x) => x.path));
    if (path in clipSecs.current) {
      delete clipSecs.current[path];
      set("duration_seconds", Math.ceil(Object.values(clipSecs.current).reduce((a, b) => a + b, 0)) || undefined);
    }
  }

  async function inspire() {
    const r = await fetch("/api/inspire", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: tool.id }) });
    const d = await r.json();
    if (r.ok) setIdeas(d.ideas); else setError(d.error);
  }

  async function submit() {
    setError(""); setSending(true); setJob(null);
    try {
      const r = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: tool.id, input: values }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (typeof d.balance === "number") setBalance(d.balance);
      if (d.error) setError(d.error);
      watch(d.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "صار خطأ.");
    } finally { setSending(false); }
  }

  async function submitEdit(fileIndex: number) {
    if (!job) return;
    setError(""); setSending(true);
    try {
      const r = await fetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ edit_of: job.id, instruction: editText, file_index: fileIndex, options: editOpts }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (typeof d.balance === "number") setBalance(d.balance);
      setEditing(null); setEditText(""); setJob(null);
      watch(d.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "صار خطأ.");
    } finally { setSending(false); }
  }

  const hint = editHints[tool.id];
  const textField = spec.fields.find((f) => f.type === "text");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-5">
        {/* Settings */}
        <section aria-label="إعدادات الطلب" className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
          {spec.fields.map((f, idx) => {
            if (f.type === "consent" && f.showIf && !values[f.showIf.field]) return null;
            if (tool.id === "voice" && f.name === "sample" && !values.clone) return null;
            return (
              <div key={f.name} className="card flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-800 text-sm font-bold text-gold-500">{idx + 1}</span>
                    <label htmlFor={`f-${f.name}`} className="font-bold">{f.label}</label>
                  </span>
                  {spec.inspire && f === textField && (
                    <button type="button" onClick={inspire} className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700"><Icon name="bulb" size={16} />ألهمني</button>
                  )}
                </div>

                {f.type === "text" && (
                  <>
                    <textarea id={`f-${f.name}`} rows={f.rows ?? 4} maxLength={f.max} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} className="field resize-y leading-7" />
                    {f === textField && ideas.length > 0 && (
                      <div className="flex flex-col gap-2">{ideas.map((i) => <button key={i} type="button" onClick={() => { set(f.name, i); setIdeas([]); }} className="rounded-xl border border-line bg-canvas p-3 text-right text-sm leading-6 hover:border-gold-500">{i}</button>)}</div>
                    )}
                    {f.max && <span className="text-xs text-subtle">{String(values[f.name] ?? "").length} / {f.max}</span>}
                  </>
                )}
                {f.type === "line" && <input id={`f-${f.name}`} maxLength={f.max} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} className="field" />}

                {f.type === "files" && (
                  <>
                    <div className="flex flex-wrap gap-3">
                      {(uploads[f.name] ?? []).map((u) => (
                        <div key={u.path} className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl bg-tint text-xs text-subtle">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {u.preview ? <img src={u.preview} alt="" className="h-full w-full object-cover" /> : <span className="p-2 text-center">{u.name}</span>}
                          <button type="button" aria-label="إزالة الملف" onClick={() => removeFile(f.name, u.path)} className="absolute left-1 top-1 rounded-full bg-white/90 p-1 text-red-700"><Icon name="trash" size={12} /></button>
                        </div>
                      ))}
                      {(uploads[f.name] ?? []).length < f.max && (
                        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-[1.5px] border-dashed border-field bg-canvas text-[13px] font-semibold text-navy-700">
                          <Icon name={busyUpload ? "upload" : "plus"} size={20} />{busyUpload ? "جارٍ الرفع" : "رفع"}
                          <input id={`f-${f.name}`} type="file" accept={accepts[f.accept]} multiple={f.max > 1} className="sr-only" onChange={(e) => { addFiles(f, e.target.files); e.target.value = ""; }} />
                        </label>
                      )}
                    </div>
                    {f.hint && <p className="text-[13px] text-subtle">{f.hint}</p>}
                  </>
                )}

                {f.type === "choice" && (
                  <div id={`f-${f.name}`} role="group" className="flex flex-wrap gap-2">
                    {f.options.map((o) => <button key={o.value} type="button" aria-pressed={values[f.name] === o.value} onClick={() => set(f.name, o.value)} className="chip">{o.label}</button>)}
                  </div>
                )}

                {f.type === "voice" && (
                  <select id={`f-${f.name}`} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} className="field">
                    {voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                )}

                {f.type === "count" && (
                  <div className="flex items-center gap-1 self-start rounded-xl border border-field p-1">
                    <button type="button" aria-label="إنقاص" onClick={() => set(f.name, Math.max(f.min, Number(values[f.name]) - 1))} className="h-9 w-9 rounded-lg bg-tint text-lg text-navy-800">−</button>
                    <span id={`f-${f.name}`} className="min-w-8 text-center font-latin font-bold">{String(values[f.name])}</span>
                    <button type="button" aria-label="زيادة" onClick={() => set(f.name, Math.min(f.max, Number(values[f.name]) + 1))} className="h-9 w-9 rounded-lg bg-tint text-lg text-navy-800">+</button>
                  </div>
                )}

                {(f.type === "toggle" || f.type === "consent") && (
                  <label className="flex items-center gap-3 text-[15px]">
                    <input id={`f-${f.name}`} type="checkbox" checked={Boolean(values[f.name])} onChange={(e) => set(f.name, e.target.checked)} className="h-5 w-5 accent-navy-700" />
                    {f.type === "toggle" ? (f.hint ?? "تفعيل") : "موافق"}
                  </label>
                )}
              </div>
            );
          })}

          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy-800 px-5 py-4 text-white">
            <div className="flex flex-col">
              <span>التكلفة: <strong className="text-gold-500">{cost} ريشة</strong></span>
              <span className="text-[13px] text-white/75">رصيدك بعدها {Math.max(0, balance - cost)} ريشة · ترجع لك إذا فشل الطلب</span>
            </div>
            <button type="button" disabled={sending || busyUpload || cost > balance} onClick={submit} className="btn btn-gold px-6 py-3">
              {sending ? "جارٍ الإرسال…" : cost > balance ? "رصيدك ما يكفي" : "ابدأ الإنشاء"}
            </button>
          </div>
        </section>

        {/* Result */}
        <section aria-label="النتيجة" aria-live="polite" className="card flex min-w-0 flex-[1_1_440px] flex-col gap-4 p-5 lg:sticky lg:top-24">
          <h2 className="font-bold">النتيجة</h2>
          {!job && <div className="flex aspect-video items-center justify-center rounded-2xl bg-tint text-sm text-subtle">النتيجة بتظهر هنا</div>}
          {job && (job.status === "queued" || job.status === "running") && (
            <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-2xl bg-tint text-sm text-navy-700">
              <div className="w-full max-w-sm px-4"><Progress value={job.progress ?? (job.status === "running" ? 30 : 5)} label={tool.id === "video-editing" ? "جاري تحليل الفيديو وتجهيز المونتاج…" : "جارٍ التنفيذ…"} /></div>
              {tool.id.includes("video") && <span className="px-4 text-center">ياخذ من دقيقة لعدة دقائق. تقدر تطلع، وبتلقاه في أعمالي.</span>}
            </div>
          )}
          {job?.status === "failed" && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">ما نجح الطلب، ورجّعنا لك الريش. جرّب مرة ثانية أو عدّل الوصف.</p>}
          {job?.status === "done" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {job.files.map((f, i) => (
                <figure key={i} className="overflow-hidden rounded-2xl border border-line">
                  <Media f={f} className="max-h-[480px]" />
                  {f.caption && <figcaption className="whitespace-pre-line p-3 text-sm leading-6">{f.caption}</figcaption>}
                  <div className="flex flex-wrap gap-2 p-3 pt-0">
                    <a href={f.url} download className="btn btn-primary flex-1 py-2 text-sm"><Icon name="download" size={14} />تحميل</a>
                    {hint && <button type="button" aria-expanded={editing === i} onClick={() => { setEditing(editing === i ? null : i); setEditOpts({}); }} className="btn btn-outline flex-1 py-2 text-sm"><Icon name="sparkles" size={14} />تعديل</button>}
                    {f.caption && <button type="button" onClick={() => navigator.clipboard.writeText(f.caption!)} className="btn btn-outline flex-1 py-2 text-sm">نسخ النص</button>}
                  </div>
                  {hint && editing === i && (
                    <div className="flex flex-col gap-3 border-t border-line bg-canvas p-3">
                      <label htmlFor={`edit-${i}`} className="label">{hint.label}</label>
                      {hint.options ? (
                        <div id={`edit-${i}`} className="flex flex-col gap-2 text-sm">
                          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={Boolean(values.cut_silence ?? true)} onChange={(e) => setEditOpts({ ...editOpts, cut_silence: e.target.checked })} className="accent-navy-700" />قص الأجزاء الصامتة</label>
                          <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={Boolean(values.captions ?? true)} onChange={(e) => setEditOpts({ ...editOpts, captions: e.target.checked })} className="accent-navy-700" />ترجمة عربية مكتوبة</label>
                          <div className="flex flex-wrap gap-2">{[["original", "كما هو"], ["9:16", "9:16"], ["1:1", "1:1"], ["16:9", "16:9"]].map(([a, l]) => <button key={a} type="button" aria-pressed={editOpts.aspect === a} onClick={() => setEditOpts({ ...editOpts, aspect: a })} className="chip">{l}</button>)}</div>
                          <div className="flex flex-wrap gap-2">{[["30", "30 ثانية"], ["60", "دقيقة"], ["90", "دقيقة ونص"], ["full", "بدون تقصير"]].map(([d, l]) => <button key={d} type="button" aria-pressed={(editOpts.target ?? values.target) === d} onClick={() => setEditOpts({ ...editOpts, target: d })} className="chip">{l}</button>)}</div>
                        </div>
                      ) : (
                        <textarea id={`edit-${i}`} rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} placeholder={hint.placeholder} className="field resize-y leading-7" />
                      )}
                      <button type="button" disabled={sending || (!hint.options && !editText.trim()) || tool.edit_cost > balance} onClick={() => submitEdit(i)} className="btn btn-primary py-2.5 text-sm">
                        {tool.edit_cost > balance ? "رصيدك ما يكفي" : `نفّذ التعديل · ${tool.edit_cost} ريشة`}
                      </button>
                    </div>
                  )}
                </figure>
              ))}
            </div>
          )}
          <p className="text-[13px] text-subtle">كل النتائج تُحفظ تلقائياً في أعمالي.</p>
        </section>
      </div>

      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-navy-900">آخر أعمالك بهذه الأداة</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">{recent.map((w) => <WorkCard key={w.id} w={w} />)}</div>
        </section>
      )}
    </div>
  );
}
