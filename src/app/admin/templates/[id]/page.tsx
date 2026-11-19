import Link from "next/link";
import { notFound } from "next/navigation";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL } from "@/lib/server/lang";
import { prepareTry } from "../actions";
import { TemplateTry, type TField } from "./TemplateTry";

export const dynamic = "force-dynamic";

/** «جرّب القالب»: معاينة حية داخل لوحة الإدارة. تعدّل النصوص والألوان والخط والمدة وتشوف الحركة بعينك. بدون صوت وبدون Claude وبدون تكلفة. */
export default async function TryTemplate({ params }: { params: Promise<{ id: string }> }) {
  const L = await getL();
  await guardPage("templates");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const admin = createAdminClient();
  const { data: t } = await admin.from("free_templates").select("id,name,aspect,status,fields,assets,code").eq("id", id).maybeSingle();
  const kind = (t?.assets as { _kind?: string } | null)?._kind === "html" ? "html" : "remotion";
  if (!t || (!t.code && kind !== "html")) notFound();
  const previewPath = (t.assets as { _preview?: string } | null)?._preview ?? "";
  const colorList = ((t.assets as { _colors?: string[] } | null)?._colors ?? []).filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  const url = previewPath ? (await admin.storage.from("results").createSignedUrl(previewPath, 60 * 60)).data?.signedUrl ?? "" : "";
  const { data: busy } = url ? { data: [] } : await admin.from("jobs").select("id").eq("tool_id", "free-motion").in("status", ["queued", "running"]).contains("input", { mode: "tplpreview", templateId: id }).limit(1);
  const vp = (t.assets as { _video?: string | null } | null)?._video ?? "";
  const verr = (t.assets as { _videoErr?: string | null } | null)?._videoErr ?? "";
  const videoUrl = vp ? (await admin.storage.from("results").createSignedUrl(vp, 60 * 60, { download: `${t.name}.mp4` })).data?.signedUrl ?? "" : "";
  const { data: rendering } = await admin.from("jobs").select("id").eq("tool_id", "free-motion").in("status", ["queued", "running"]).contains("input", { mode: "tplrender", templateId: id }).limit(1);
  const fields = (Array.isArray(t.fields) ? t.fields : []) as TField[];
  return (
    <div className="flex flex-col gap-4">
      {(!!rendering?.length || (!url && !!busy?.length)) && <meta httpEquiv="refresh" content="6" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[24px] font-bold text-navy-900">{L("جرّب القالب")}: {t.name}</h1>
          <p className="mt-1 text-sm text-subtle">{kind === "html" ? L("هذا التصميم الأصلي من جيميناي كما هو (بدون تحويل). غيّر النصوص والألوان وشوف الحركة، ثم نزّله فيديو. ما يكلّف شي.") : L("معاينة حية بدون صوت. غيّر النصوص والألوان والخط والمدة وشوف الحركة. ما يكلّف شي.")}</p>
        </div>
        <Link href="/admin/templates" className="btn btn-outline px-4 py-2">← {L("رجوع للمكتبة")}</Link>
      </div>
      {url ? (
        <TemplateTry kind={kind} colorList={colorList} id={t.id} name={t.name} aspect={t.aspect} fields={fields} previewUrl={url} videoUrl={videoUrl} videoErr={verr} rendering={!!rendering?.length} />
      ) : (
        <div className="card flex flex-col items-start gap-3 p-5">
          {busy?.length ? <p className="text-[15px]">⏳ {L("جاري تجهيز المعاينة… تتحدّث الصفحة تلقائيًا.")}</p> : (
            <>
              <p className="text-[15px]">{L("هذا القالب ما له معاينة حية بعد.")}</p>
              <form action={prepareTry}><input type="hidden" name="id" value={t.id} /><button className="btn btn-gold px-6 py-3">{L("جهّز المعاينة")}</button></form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
