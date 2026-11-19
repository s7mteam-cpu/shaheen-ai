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
  if (!t || !t.code) notFound();
  const previewPath = (t.assets as { _preview?: string } | null)?._preview ?? "";
  const url = previewPath ? (await admin.storage.from("results").createSignedUrl(previewPath, 60 * 60)).data?.signedUrl ?? "" : "";
  const { data: busy } = url ? { data: [] } : await admin.from("jobs").select("id").eq("tool_id", "free-motion").in("status", ["queued", "running"]).contains("input", { mode: "tplpreview", templateId: id }).limit(1);
  const fields = (Array.isArray(t.fields) ? t.fields : []) as TField[];
  return (
    <div className="flex flex-col gap-4">
      {!url && !!busy?.length && <meta httpEquiv="refresh" content="6" />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[24px] font-bold text-navy-900">{L("جرّب القالب")}: {t.name}</h1>
          <p className="mt-1 text-sm text-subtle">{L("معاينة حية بدون صوت. غيّر النصوص والألوان والخط والمدة وشوف الحركة. ما يكلّف شي.")}</p>
        </div>
        <Link href="/admin/templates" className="btn btn-outline px-4 py-2">← {L("رجوع للمكتبة")}</Link>
      </div>
      {url ? (
        <TemplateTry name={t.name} aspect={t.aspect} fields={fields} previewUrl={url} />
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
