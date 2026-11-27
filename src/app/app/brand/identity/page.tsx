import { pickToolMsg } from "@/lib/toolPause";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { IdentityCreator } from "@/components/app/IdentityCreator";
import { getL } from "@/lib/server/lang";
import { getContent } from "@/lib/data";
import type { Concept } from "@/lib/identity";

export async function generateMetadata() { return { title: (await getL())("إنشاء هوية") }; }

export default async function IdentityPage() {
  const L = await getL();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: kit } = await supabase.from("brand_kits").select("about,cv_text,logo_url,identity,identity_options").eq("user_id", user!.id).maybeSingle();
  const { data: tool } = await admin.from("tools").select("credit_cost,edit_cost,is_enabled").eq("id", "brand-identity").maybeSingle();
  const sign = async (p?: string | null, bucket = "uploads") => (p ? (await admin.storage.from(bucket).createSignedUrl(p, 3600)).data?.signedUrl ?? null : null);
  const options = ((kit?.identity_options ?? []) as Concept[]);
  // SECURITY: this row is editable by its owner, so a logo path is signed only when it sits in the owner's own folder
  for (const c of options) if (c.logo?.path) { if (typeof c.logo.path === "string" && c.logo.path.startsWith(`${user!.id}/`) && !c.logo.path.includes("..")) c.logo.url = (await sign(c.logo.path, "results")) ?? undefined; else c.logo = { ...c.logo, path: undefined, url: undefined } as typeof c.logo; }
  const chosen = (kit?.identity as Concept | null)?.id ?? null;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/app/brand" className="text-sm font-semibold text-navy-700">{L("→ هويتي التجارية")}</Link>
        <h1 className="mt-2 text-[28px] font-bold text-navy-900">{L("إنشاء هوية")}</h1>
        <p className="mt-1 max-w-2xl text-muted">{L("اكتب عن نشاطك (أو ارفع سيرتك الذاتية)، وشاهين يشتغل كخبير هويات وتسويق ويعطيك 4 هويات متكاملة: ألوان وخطوط وشكل الصفحة والريلز والبايو والكابشنات. تختار وحدة وتنطبق على كل تصاميمك.")}</p>
      </div>
      {tool && !tool.is_enabled ? <p className="card max-w-2xl p-5 text-[15px] text-muted" role="status">⏳ {L(pickToolMsg((await getContent() as unknown as Record<string, unknown>).tool_msgs, "brand-identity"))}</p> : <IdentityCreator initial={{ about: kit?.about ?? "", cv: kit?.cv_text ?? "", logo_url: kit?.logo_url ?? null, logo_preview: await sign(kit?.logo_url), options, chosen }} cost={{ base: tool?.credit_cost ?? 6, marks: tool?.edit_cost ?? 6 }} />}
    </div>
  );
}
