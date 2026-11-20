import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL } from "@/lib/server/lang";
import { startGemini } from "../actions";

export const dynamic = "force-dynamic";
type Meta = { idea?: string; seconds?: number; aspect?: string; error?: string; plan_mode?: string; plan?: { title?: string; text?: string }; timings?: Record<string, number>; attempts?: { attempt: number; chars: number; model?: string; usage?: { promptTokenCount?: number; candidatesTokenCount?: number } | null; review?: { ok?: boolean; issues?: string }; errors?: string[]; distinctFrames?: number }[] };

/** «التجربة الكبرى» (أدمن فقط): Claude يخطط، Gemini يبني الحركة، شاهين يسجّل الفيديو. */
export default async function GeminiLab() {
  const L = await getL();
  await guardPage("templates");
  const admin = createAdminClient();
  const { data: files } = await admin.storage.from("results").list("templates/gem", { limit: 60, sortBy: { column: "created_at", order: "desc" } });
  const ids = [...new Set((files ?? []).filter((f) => f.name.endsWith(".json")).map((f) => f.name.replace(/\.json$/, "")))].slice(0, 10);
  const items = await Promise.all(ids.map(async (id) => {
    const j = await admin.storage.from("results").download(`templates/gem/${id}.json`);
    let meta: Meta = {};
    try { meta = JSON.parse(await (j.data?.text() ?? Promise.resolve("{}"))) as Meta; } catch {}
    const has = (files ?? []).some((f) => f.name === `${id}.mp4`);
    const play = has ? (await admin.storage.from("results").createSignedUrl(`templates/gem/${id}.mp4`, 3600)).data?.signedUrl ?? "" : "";
    const video = has ? (await admin.storage.from("results").createSignedUrl(`templates/gem/${id}.mp4`, 3600, { download: `shaheen-gem-${id.slice(0, 6)}.mp4` })).data?.signedUrl ?? "" : "";
    const code = (files ?? []).some((f) => f.name === `${id}.html`) ? (await admin.storage.from("results").createSignedUrl(`templates/gem/${id}.html`, 3600, { download: `gem-${id.slice(0, 6)}.html` })).data?.signedUrl ?? "" : "";
    return { id, meta, play, video, code };
  }));
  const { data: busy } = await admin.from("jobs").select("id,title,progress").eq("tool_id", "free-motion").in("status", ["queued", "running"]).contains("input", { mode: "gemflow" }).limit(1);
  return (
    <div className="flex flex-col gap-4">
      {!!busy?.length && <meta httpEquiv="refresh" content="8" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[24px] font-bold text-navy-900">🚀 {L("التجربة الكبرى: جيميناي يبني")}</h1>
          <p className="mt-1 text-sm text-subtle">{L("اكتب فكرة العميل. كلود يرتّب نص العميل فقط، وجيميناي يقرر كل شي (ألوان ومشاهد وحركة)، وشاهين يسجّله فيديو. بدون صوت بهالمرحلة. للأدمن فقط.")}</p>
        </div>
        <Link href="/admin/templates" className="btn btn-outline px-4 py-2">← {L("رجوع للمكتبة")}</Link>
      </div>
      <form action={startGemini} className="card flex flex-col gap-3 p-4">
        <label className="label">{L("فكرة العميل")}</label>
        <textarea name="idea" required minLength={10} maxLength={1500} rows={4} dir="auto" className="field" />
        <div className="flex flex-wrap gap-3">
          <input name="brand" maxLength={60} dir="auto" className="field w-52" placeholder={L("اسم العلامة (اختياري)")} />
          <select name="plan" defaultValue="full" className="field w-44"><option value="full">{L("خطة كاملة (الأقوى)")}</option><option value="scenes">{L("نص مع مشاهد")}</option><option value="text">{L("نص فقط")}</option></select>
          <select name="seconds" defaultValue="30" className="field w-32"><option value="15">15s</option><option value="30">30s</option><option value="45">45s</option><option value="60">60s</option></select>
          <select name="aspect" defaultValue="9:16" className="field w-32"><option>9:16</option><option>1:1</option><option>4:5</option><option>16:9</option></select>
        </div>
        <button disabled={!!busy?.length} className="btn btn-gold w-fit px-6 py-3 disabled:opacity-60">{busy?.length ? `⏳ ${busy[0].title ?? ""} (${busy[0].progress ?? 0}%)` : L("🎬 ابنِ الفيديو")}</button>
      </form>
      {items.map((it) => (
        <div key={it.id} className="card grid gap-4 p-4 md:grid-cols-[220px_1fr]">
          {it.play ? <video src={it.play} controls playsInline className="w-full rounded-xl bg-black" /> : <div className="grid h-40 place-items-center rounded-xl bg-neutral-100 text-sm text-subtle">—</div>}
          <div className="flex flex-col gap-2 text-[13px]">
            <p dir="auto" className="text-[14px] font-bold">{it.meta.idea}</p>
            <p className="text-subtle">{it.meta.plan?.title} · {it.meta.plan_mode === "full" ? "خطة كاملة" : it.meta.plan_mode === "scenes" ? "مشاهد" : "نص فقط"} · {it.meta.seconds}s · {it.meta.aspect}{it.meta.timings ? ` · ${Object.entries(it.meta.timings).map(([k, v]) => `${k} ${v}s`).join(" · ")}` : ""}</p>
            {it.meta.error && <p dir="auto" className="rounded-lg bg-red-50 p-2 text-red-800">⚠️ {it.meta.error}</p>}
            {it.meta.attempts?.map((a) => <p key={a.attempt} className="text-subtle">{L("محاولة")} {a.attempt}: {a.model} · {a.chars} {L("حرف")} · tokens {a.usage?.promptTokenCount ?? "?"}/{a.usage?.candidatesTokenCount ?? "?"} · {a.review?.ok ? "✅" : `⚠️ ${a.review?.issues ?? ""}`} · {L("لقطات مختلفة")}: {a.distinctFrames ?? "?"}/6{a.errors?.length ? ` · ${L("أخطاء الصفحة")}: ${a.errors.join(" | ")}` : ""}</p>)}
            <div className="flex flex-wrap gap-2">
              {it.video && <a href={it.video} download className="btn btn-outline px-4 py-2">⬇ {L("الفيديو")}</a>}
              {it.code && <a href={it.code} download className="btn btn-outline px-4 py-2">⬇ HTML</a>}
            </div>
            {it.meta.plan?.text && <details><summary className="cursor-pointer text-subtle">{L("النص بعد ترتيب كلود")}</summary><p dir="auto" className="mt-1">{it.meta.plan.text}</p></details>}
          </div>
        </div>
      ))}
    </div>
  );
}
