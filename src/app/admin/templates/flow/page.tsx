import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL } from "@/lib/server/lang";
import { INDUSTRIES } from "@/design/industries";
import { startFlow } from "../actions";

export const dynamic = "force-dynamic";
type Meta = { idea?: string; template?: string; seconds?: number; texts?: { label: string; value: string }[]; error?: string; at?: string; field?: string };

/** «المسار الكامل» (تجريبي، للأدمن): تكتب وصفًا وتختار مجالًا، وشاهين يختار قالبًا معتمدًا من المكتبة ويعبّي نصوصه ويرسم الفيديو. */
export default async function Flow() {
  const L = await getL();
  await guardPage("templates");
  const admin = createAdminClient();
  const { data: files } = await admin.storage.from("results").list("templates/flow", { limit: 60, sortBy: { column: "created_at", order: "desc" } });
  const ids = [...new Set((files ?? []).filter((f) => f.name.endsWith(".json")).map((f) => f.name.replace(/\.json$/, "")))].slice(0, 12);
  const items = await Promise.all(ids.map(async (id) => {
    const j = await admin.storage.from("results").download(`templates/flow/${id}.json`);
    let meta: Meta = {};
    try { meta = JSON.parse(await (j.data?.text() ?? Promise.resolve("{}"))) as Meta; } catch {}
    const has = (files ?? []).some((f) => f.name === `${id}.mp4`);
    const video = has ? (await admin.storage.from("results").createSignedUrl(`templates/flow/${id}.mp4`, 3600, { download: `shaheen-${id.slice(0, 6)}.mp4` })).data?.signedUrl ?? "" : "";
    const play = has ? (await admin.storage.from("results").createSignedUrl(`templates/flow/${id}.mp4`, 3600)).data?.signedUrl ?? "" : "";
    return { id, meta, video, play };
  }));
  const { data: busy } = await admin.from("jobs").select("id").eq("tool_id", "free-motion").in("status", ["queued", "running"]).contains("input", { mode: "tplflow" }).limit(1);
  const groups = [...new Set(INDUSTRIES.map((i) => i.group))];
  return (
    <div className="flex flex-col gap-4">
      {!!busy?.length && <meta httpEquiv="refresh" content="8" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[24px] font-bold text-navy-900">🧪 {L("المسار الكامل (تجريبي)")}</h1>
          <p className="mt-1 text-sm text-subtle">{L("اكتب وصف العميل واختر مجاله. شاهين يختار قالبًا معتمدًا من المكتبة لهذا المجال، يعبّي نصوصه من وصفك، ويرسم الفيديو. بدون صوت (المرحلة الثانية). للأدمن فقط.")}</p>
        </div>
        <Link href="/admin/templates" className="btn btn-outline px-4 py-2">← {L("رجوع للمكتبة")}</Link>
      </div>
      <form action={startFlow} className="card flex flex-col gap-3 p-4">
        <label className="label">{L("المجال")}</label>
        <select name="field" required className="field" defaultValue="">
          <option value="" disabled>{L("اختر مجال العميل")}</option>
          {groups.map((g) => <optgroup key={g} label={L(g)}>{INDUSTRIES.filter((i) => i.group === g).map((i) => <option key={i.id} value={i.id}>{L(i.label)}</option>)}</optgroup>)}
        </select>
        <label className="label">{L("وصف العميل")}</label>
        <textarea name="idea" required minLength={10} maxLength={1500} rows={4} dir="auto" className="field" placeholder={L("مثال: افتتاح عيادة أسنان جديدة بالسالمية، خصم 20% على أول زيارة، نريد فيديو هادئ ومطمئن")} />
        <button disabled={!!busy?.length} className="btn btn-gold w-fit px-6 py-3 disabled:opacity-60">{busy?.length ? L("⏳ جاري التنفيذ… (الصفحة تتحدّث لحالها)") : L("🎬 سوّ الفيديو")}</button>
      </form>
      {items.map((it) => (
        <div key={it.id} className="card grid gap-4 p-4 md:grid-cols-[220px_1fr]">
          {it.play ? <video src={it.play} controls playsInline className="w-full rounded-xl bg-black" /> : <div className="grid h-40 place-items-center rounded-xl bg-neutral-100 text-sm text-subtle">{it.meta.error ? "—" : "…"}</div>}
          <div className="flex flex-col gap-2 text-[13px]">
            <p dir="auto" className="text-[14px] font-bold">{it.meta.idea}</p>
            <p className="text-subtle">{L("القالب")}: {it.meta.template ?? "—"} · {INDUSTRIES.find((i) => i.id === it.meta.field)?.label ?? ""} · {it.meta.seconds ? `${it.meta.seconds}s` : ""}</p>
            {it.meta.error && <p dir="auto" className="rounded-lg bg-red-50 p-2 text-red-800">⚠️ {it.meta.error}</p>}
            {it.video && <a href={it.video} download className="btn btn-outline w-fit px-4 py-2">⬇ {L("نزّل الفيديو")}</a>}
            {!!it.meta.texts?.length && <details><summary className="cursor-pointer text-subtle">{L("النصوص اللي عبّاها النموذج")} ({it.meta.texts.length})</summary><ul className="mt-1 list-disc ps-5">{it.meta.texts.map((t, i) => <li key={i} dir="auto">{t.value}</li>)}</ul></details>}
          </div>
        </div>
      ))}
    </div>
  );
}
