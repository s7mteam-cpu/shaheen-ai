import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { SideNav } from "@/components/app/SideNav";
import { HomeGreeting } from "@/components/app/HomeGreeting";
import { UserMenu } from "@/components/app/UserMenu";
import { ShaheenChat } from "@/components/ShaheenChat";
import { getContent, getSessionProfile, getTools } from "@/lib/data";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { stopImpersonating } from "@/app/admin/customers/actions";
import { latestAccess } from "@/lib/server/supportAccess";
import { NotificationBell, type Note } from "@/components/app/NotificationBell";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CompleteProfile } from "@/components/app/CompleteProfile";
import { normalizePhone } from "@/lib/phone";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  const impRaw = (await cookies()).get("shaheen_imp")?.value;
  const imp = impRaw ? decodeURIComponent(impRaw) : null;
  if (!profile) redirect("/login");
  const access = imp ? null : await latestAccess(profile.id);
  // WhatsApp number: copy it from sign-up, or ask once.
  let needContact = false;
  if (!profile.phone && !imp) {
    const { data: { user } } = await (await createClient()).auth.getUser();
    const fromSignup = normalizePhone(String(user?.user_metadata?.phone ?? ""));
    if (fromSignup) await createAdminClient().from("profiles").update({ phone: fromSignup }).eq("id", profile.id);
    else needContact = true;
  }
  const notesRes = await createAdminClient().from("notifications").select("id,kind,title,body,link,read_at,created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20);
  const notes = (notesRes.error ? [] : notesRes.data ?? []) as Note[];
  const [content, tools] = await Promise.all([getContent(), getTools()]);
  const wa = content.footer.whatsapp ? `https://wa.me/${content.footer.whatsapp.replace(/\D/g, "")}` : undefined;

  return (
    <div className="min-h-screen bg-canvas">
      {imp && profile.role === "user" && (
        <form action={stopImpersonating} className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 bg-red-700 px-4 py-2.5 text-center text-sm font-semibold text-white">
          <span>أنت داخل على حساب العميل <span dir="ltr" className="font-latin">{profile.email}</span> كمدير ({imp}). كل شي تسويه ينحسب عليه.</span>
          <button className="rounded-full bg-white px-4 py-1 font-bold text-red-800">اطلع من حسابه</button>
        </form>
      )}
      <header className="sticky top-0 z-30 bg-navy-800 shadow-[0_1px_0_rgba(201,164,92,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3">
          <Link href="/app" className="flex items-center gap-2.5"><Image src="/brand/eagle.png" alt="" width={36} height={36} /><span className="text-xl font-bold text-gold-500">شاهين</span></Link>
          <div className="flex items-center gap-2">
            <Link href="/app/account" aria-label={`رصيدك ${profile.credits} ريشة`}
              className="inline-flex items-center gap-2 rounded-full border border-gold-500/45 bg-gold-500/15 px-3.5 py-2 text-sm font-bold text-gold-500">
              <Icon name="feather" size={16} />{profile.credits.toLocaleString("en")} ريشة
            </Link>
            <NotificationBell notes={notes} />
            <UserMenu name={profile.full_name || profile.email || ""} />
          </div>
        </div>
      </header>

      {access?.status === "pending" && (
        <p className="bg-gold-100 px-6 py-3 text-center text-sm text-navy-900">فريق شاهين يطلب صلاحية الدخول على حسابك لحل مشكلة. <Link href="/app/account?tab=access" className="font-bold underline">راجع الطلب</Link></p>
      )}
      {access?.status === "approved" && (
        <p className="bg-emerald-50 px-6 py-3 text-center text-sm text-emerald-900">صلاحية دخول فريق شاهين على حسابك فعّالة حالياً. <Link href="/app/account?tab=access" className="font-bold underline">إدارة الصلاحية</Link></p>
      )}
      {profile.is_suspended && (
        <p className="bg-red-50 px-6 py-3 text-center text-sm text-red-800">حسابك موقوف مؤقتاً. تواصل مع الدعم.</p>
      )}
      {!profile.plan_id && !profile.is_suspended && (
        <p className="bg-gold-100 px-6 py-3 text-center text-sm text-navy-900">ما عندك باقة فعّالة. <Link href="/?home=1#pricing" className="font-bold underline">اختر باقتك</Link> لتبدأ.</p>
      )}

      <HomeGreeting name={profile.full_name?.split(" ")[0]} />
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-6 lg:flex-row">
        <div className="lg:w-[250px] lg:shrink-0"><Suspense><SideNav isAdmin={profile.role === "admin" || profile.role === "staff"} support={wa} tools={tools.map((t) => ({ id: t.id, name: t.name, icon: t.icon, category: t.category }))} /></Suspense></div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      {needContact && <CompleteProfile name={profile.full_name ?? ""} />}
      <ShaheenChat name={profile.full_name?.split(" ")[0]} voice />
    </div>
  );
}
