import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandForm } from "@/components/app/BrandForm";
import { getL } from "@/lib/server/lang";
import type { InstaRead } from "@/lib/plan";

export async function generateMetadata() { return { title: (await getL())("هويتي التجارية") }; }

export default async function Brand() {
  const L = await getL();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("brand_kits").select("*").eq("user_id", user!.id).maybeSingle();
  let preview: string | null = null;
  if (data?.logo_url) preview = (await createAdminClient().storage.from("uploads").createSignedUrl(data.logo_url, 3600)).data?.signedUrl ?? null;
  const refPaths = (data?.style_refs ?? []) as string[];
  const signed = refPaths.length ? (await createAdminClient().storage.from("uploads").createSignedUrls(refPaths, 3600)).data ?? [] : [];
  const refs = refPaths.map((path, i) => ({ path, url: signed[i]?.signedUrl ?? "" }));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[28px] font-bold text-navy-900">{L("هويتي التجارية")}</h1><p className="mt-1 text-muted">{L("ارفع شعارك وألوانك مرة وحدة، وشاهين يستخدمها في كل تصميم وفيديو.")}</p></div><Link href="/app/brand/identity" className="btn btn-gold px-5 py-3 text-[15px] font-bold">✨ {L("إنشاء هوية")}</Link><Link href="/app/brand/plan" className="btn btn-outline px-5 py-3 text-[15px] font-bold">📅 {L("خطة المحتوى الشهرية")}</Link></div>
      <BrandForm initial={{ style_note: (data as { style_note?: string | null } | null)?.style_note ?? "", style_video: (data as { style_video?: string | null } | null)?.style_video ?? null, business_name: data?.business_name ?? "", logo_url: data?.logo_url ?? null, logo_preview: preview, colors: data?.colors ?? [], handle: data?.handle ?? "", font: data?.font ?? "", website: data?.website ?? "", instagram: data?.instagram ?? "", industry: (data as { industry?: string | null } | null)?.industry ?? "", industry2: String((data?.plan_prefs as { industry2?: string } | null)?.industry2 ?? ""), about: String((data as { about?: string | null } | null)?.about ?? ""), cv_text: String((data as { cv_text?: string | null } | null)?.cv_text ?? ""), dialect: String((data?.plan_prefs as { dialect?: string } | null)?.dialect ?? ""), refs, insta: ((data?.plan_prefs as { insta?: InstaRead } | null)?.insta ?? null) }} />
    </div>
  );
}
