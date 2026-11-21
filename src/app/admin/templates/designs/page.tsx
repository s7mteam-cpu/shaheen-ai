import Link from "next/link";
import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getL } from "@/lib/server/lang";
import { templateFromGem } from "../actions";

export const dynamic = "force-dynamic";

/** تصاميم العملاء المبتكرة الجاهزة: تحوّل أي واحد منها إلى قالب بالمكتبة (بدون شعار العميل وأرقام تواصله) لتراجعه وتعتمده. */
export default async function GemDesigns() {
  const L = await getL();
  await guardPage("templates");
  const admin = createAdminClient();
  const { data: jobs } = await admin.from("jobs").select("id,title,created_at,input,output").eq("tool_id", "free-motion").eq("status", "done").contains("input", { engine: "gemini" }).order("created_at", { ascending: false }).limit(30);
  const rows = await Promise.all((jobs ?? []).filter((j) => !(j.input as { gem?: { edited?: boolean } })?.gem?.edited).map(async (j) => {
    const p = (j.output as { files?: { path: string }[] } | null)?.files?.[0]?.path;
    const url = p ? (await admin.storage.from("results").createSignedUrl(p, 3600)).data?.signedUrl : "";
    return { id: j.id as string, title: String(j.title ?? ""), at: String(j.created_at).slice(0, 10), url: url ?? "" };
  }));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3"><Link href="/admin/templates" className="text-[14px] text-subtle underline">← {L("المكتبة")}</Link><h1 className="text-[24px] font-bold text-navy-900">{L("تصاميم العملاء المبتكرة")}</h1></div>
      <p className="text-[14px] text-subtle">{L("«حوّل لقالب» ينسخ التصميم للمكتبة بحالة مراجعة، بدون شعار العميل، وأرقام التواصل والحسابات والمواقع تتبدّل بنص عام. راجع بقية النصوص (اسم النشاط مثلًا) قبل الاعتماد.")}</p>
      {rows.length === 0 && <p className="text-subtle">{L("ما في تصاميم جاهزة بعد.")}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <div key={r.id} className="card flex flex-col gap-2 p-3">
            {r.url && <video src={r.url} controls preload="none" playsInline className="max-h-72 w-full rounded-lg bg-black" />}
            <p className="text-[14px] font-semibold">{r.title}</p><p className="text-[12px] text-subtle">{r.at}</p>
            <form action={templateFromGem}><input type="hidden" name="jobId" value={r.id} /><button className="btn btn-gold px-4 py-2 text-[13px]">📚 {L("حوّل لقالب")}</button></form>
          </div>
        ))}
      </div>
    </div>
  );
}
