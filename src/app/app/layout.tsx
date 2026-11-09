import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { SideNav } from "@/components/app/SideNav";
import { UserMenu } from "@/components/app/UserMenu";
import { ShaheenChat } from "@/components/ShaheenChat";
import { getContent, getSessionProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  const content = await getContent();
  const wa = content.footer.whatsapp ? `https://wa.me/${content.footer.whatsapp.replace(/\D/g, "")}` : undefined;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 bg-navy-800 shadow-[0_1px_0_rgba(201,164,92,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3">
          <Link href="/app" className="flex items-center gap-2.5"><Image src="/brand/eagle.png" alt="" width={36} height={36} /><span className="text-xl font-bold text-gold-500">شاهين</span></Link>
          <div className="flex items-center gap-3">
            <Link href="/app/account" aria-label={`رصيدك ${profile.credits} ريشة`}
              className="inline-flex items-center gap-2 rounded-full border border-gold-500/45 bg-gold-500/15 px-3.5 py-2 text-sm font-bold text-gold-500">
              <Icon name="feather" size={16} />{profile.credits.toLocaleString("en")} ريشة
            </Link>
            <UserMenu name={profile.full_name || profile.email || ""} />
          </div>
        </div>
      </header>

      {profile.is_suspended && (
        <p className="bg-red-50 px-6 py-3 text-center text-sm text-red-800">حسابك موقوف مؤقتاً. تواصل مع الدعم.</p>
      )}
      {!profile.plan_id && !profile.is_suspended && (
        <p className="bg-gold-100 px-6 py-3 text-center text-sm text-navy-900">ما عندك باقة فعّالة. <Link href="/#pricing" className="font-bold underline">اختر باقتك</Link> لتبدأ.</p>
      )}

      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-6 lg:flex-row">
        <div className="lg:w-[250px] lg:shrink-0"><SideNav isAdmin={profile.role === "admin"} support={wa} /></div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <ShaheenChat name={profile.full_name?.split(" ")[0]} />
    </div>
  );
}
