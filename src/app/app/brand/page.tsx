import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandForm } from "@/components/app/BrandForm";

export const metadata = { title: "هويتي التجارية" };

export default async function Brand() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("brand_kits").select("*").eq("user_id", user!.id).maybeSingle();
  let preview: string | null = null;
  if (data?.logo_url) preview = (await createAdminClient().storage.from("uploads").createSignedUrl(data.logo_url, 3600)).data?.signedUrl ?? null;
  return (
    <div className="flex flex-col gap-5">
      <div><h1 className="text-[28px] font-bold text-navy-900">هويتي التجارية</h1><p className="mt-1 text-muted">ارفع شعارك وألوانك مرة وحدة، وشاهين يستخدمها في كل تصميم وفيديو.</p></div>
      <BrandForm initial={{ business_name: data?.business_name ?? "", logo_url: data?.logo_url ?? null, logo_preview: preview, colors: data?.colors ?? [] }} />
    </div>
  );
}
