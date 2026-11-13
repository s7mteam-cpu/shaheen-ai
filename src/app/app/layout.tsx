import { after } from "next/server";
import { sheetsTick } from "@/lib/server/sheetsSync";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { SideNav } from "@/components/app/SideNav";
import { HomeGreeting } from "@/components/app/HomeGreeting";
import { UserMenu } from "@/components/app/UserMenu";
import { ShaheenChat } from "@/components/ShaheenChat";
import { getContent, getSessionProfile, getTools } from "@/lib/data";
import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { stopImpersonating } from "@/app/admin/customers/actions";
import { latestAccess } from "@/lib/server/supportAccess";
import { NotificationBell, type Note } from "@/components/app/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CompleteProfile } from "@/components/app/CompleteProfile";
import { normalizePhone } from "@/lib/phone";
import { getChosenLang, getLang } from "@/lib/server/lang";
import { localize } from "@/lib/server/translate";
import { tr } from "@/lib/i18n";
import { LangToggle } from "@/components/LangToggle";
import { CurrencyToggle } from "@/components/CurrencyToggle";
import { CountrySync } from "@/components/CountrySync";
import { DEVICE_COOKIE, endExpiredTrials, trialStatus } from "@/lib/server/trial";
import { TrialBanner } from "./trial/TrialBanner";
import { WelcomeGate } from "./trial/WelcomeGate";
import { trialSettings } from "@/lib/server/trial";
import { getMoney } from "@/lib/server/money";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  after(() => sheetsTick().catch(() => null)); // Google Sheets: catch up in the background, the visitor never waits
  const [profile, lang, chosen, { cur }] = await Promise.all([getSessionProfile(), getLang(), getChosenLang(), getMoney()]);
  const T = (ar: string, en: string) => tr(lang, ar, en);
  const impRaw = (await cookies()).get("shaheen_imp")?.value;
  const imp = impRaw ? decodeURIComponent(impRaw) : null;
  if (!profile) redirect("/login");
  const access = imp ? null : await latestAccess(profile.id);
  // WhatsApp number: copy it from sign-up, or ask once.
  let needContact = false;
  // Country (dialect, contact): from sign-up, else Kuwait — set once.
  if (profile.role === "user" && profile.country === null && !imp) {
    const { data: { user } } = await (await createClient()).auth.getUser();
    const meta = String(user?.user_metadata?.country ?? "");
    profile.country = /^[A-Z]{2}$/.test(meta) ? meta : "KW";
    await createAdminClient().from("profiles").update({ country: profile.country }).eq("id", profile.id).then(() => null, () => null);
  }
  if (!profile.phone && !imp) {
    const { data: { user } } = await (await createClient()).auth.getUser();
    const fromSignup = normalizePhone(String(user?.user_metadata?.phone ?? ""), String(user?.user_metadata?.country ?? "") || null);
    if (fromSignup) await createAdminClient().from("profiles").update({ phone: fromSignup }).eq("id", profile.id);
    else needContact = true;
  }
  // «التجربة المجانية»: end it if its time is up, then offer it / show the countdown at the very top (above the menu on phones)
  if (profile.role === "user" && !imp) await endExpiredTrials(profile.id).catch(() => null);
  const trial = profile.role === "user" && !imp && !profile.is_suspended ? await trialStatus(profile.id, [(await cookies()).get(DEVICE_COOKIE)?.value ?? ""]).catch(() => ({ state: "none" as const })) : { state: "none" as const };
  // the welcome screen: a customer with no plan (and no running trial), except on the pages where he pays
  const here = (await headers()).get("x-path") ?? "";
  const payPage = /^\/app\/(pay|subscribe|account)/.test(here);
  const gate = profile.role === "user" && !imp && !profile.is_suspended && !profile.plan_id && trial.state !== "active" && !payPage;
  const ts = gate ? await trialSettings() : null;
  const notesRes = await createAdminClient().from("notifications").select("id,kind,title,body,link,read_at,created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(20);
  const notes = (notesRes.error ? [] : notesRes.data ?? []) as Note[];
  const [content, tools0] = await Promise.all([getContent(), getTools()]);
  const tools = await localize(tools0, lang);
  const wa = content.footer.whatsapp ? `https://wa.me/${content.footer.whatsapp.replace(/\D/g, "")}` : undefined;

  return (
    <div className="min-h-screen bg-canvas">
      {!imp && <CountrySync code={profile.country ?? "KW"} />}
      {imp && profile.role === "user" && (
        <form action={stopImpersonating} className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-3 bg-red-700 px-4 py-2.5 text-center text-sm font-semibold text-white">
          <span>{T("أنت داخل على حساب العميل ", "You are inside the customer account ")}<span dir="ltr" className="font-latin">{profile.email}</span>{T(` كمدير (${imp}). كل شي تسويه ينحسب عليه.`, ` as an admin (${imp}). Everything you do counts on this account.`)}</span>
          <button className="rounded-full bg-white px-4 py-1 font-bold text-red-800">{T("اطلع من حسابه", "Leave this account")}</button>
        </form>
      )}
      <header className="sticky top-0 z-30 bg-navy-800 shadow-[0_1px_0_rgba(201,164,92,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-2 px-2.5 py-2.5 max-[339px]:px-2 sm:gap-4 sm:px-6 sm:py-3">
          <Logo href="/app" size={36} />
          <div className="flex min-w-0 items-center gap-1 max-[339px]:gap-0.5 sm:gap-2">
            <Link href="/app/account" aria-label={T(`رصيدك ${profile.credits} ريشة`, `Your balance: ${profile.credits} credits`)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-gold-500/45 bg-gold-500/15 px-2.5 py-1.5 max-[379px]:px-2 text-[13px] font-bold text-gold-500 sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm">
              <Icon name="feather" size={16} className="max-[399px]:hidden" />{profile.credits.toLocaleString("en")}<span className="hidden sm:inline">{T("ريشة", "credits")}</span>
            </Link>
            <span className="flex items-center rounded-full bg-white/[0.06] sm:bg-transparent"><LangToggle lang={chosen} /><CurrencyToggle cur={cur} lang={lang} /><ThemeToggle /></span>
            <NotificationBell notes={notes} />
            <UserMenu name={profile.full_name || profile.email || ""} />
          </div>
        </div>
      </header>

      {access?.status === "pending" && (
        <p className="bg-gold-100 px-6 py-3 text-center text-sm text-navy-900">{T("فريق شاهين يطلب صلاحية الدخول على حسابك لحل مشكلة. ", "The Shaheen team is requesting access to your account to fix an issue. ")}<Link href="/app/account?tab=access" className="font-bold underline">{T("راجع الطلب", "Review request")}</Link></p>
      )}
      {access?.status === "approved" && (
        <p className="bg-emerald-50 px-6 py-3 text-center text-sm text-emerald-900">{T("صلاحية دخول فريق شاهين على حسابك فعّالة حالياً. ", "The Shaheen team currently has access to your account. ")}<Link href="/app/account?tab=access" className="font-bold underline">{T("إدارة الصلاحية", "Manage access")}</Link></p>
      )}
      {profile.is_suspended && (
        <p className="bg-red-50 px-6 py-3 text-center text-sm text-red-800">{T("حسابك موقوف مؤقتاً. تواصل مع الدعم.", "Your account is temporarily suspended. Please contact support.")}</p>
      )}
      {trial.state === "none" && !profile.plan_id && !profile.is_suspended && (
        <p className="bg-gold-100 px-6 py-3 text-center text-sm text-navy-900">{T("ما عندك باقة فعّالة. ", "You don't have an active plan. ")}<Link href="/?home=1#pricing" className="font-bold underline">{T("اختر باقتك", "Choose a plan")}</Link>{T(" لتبدأ.", " to get started.")}</p>
      )}

      <HomeGreeting name={profile.full_name?.split(" ")[0]} />
      {trial.state !== "none" && <div className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-6"><TrialBanner state={trial.state} credits={trial.credits ?? 0} hours={trial.hours} expiresAt={trial.expiresAt} /></div>}
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-6 lg:flex-row">
        <div className="lg:w-[250px] lg:shrink-0"><Suspense><SideNav isAdmin={profile.role === "admin" || profile.role === "staff"} support={wa} tools={tools.map((t) => ({ id: t.id, name: t.name, icon: t.icon, category: t.category }))} /></Suspense></div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      {needContact ? <CompleteProfile name={profile.full_name ?? ""} /> : gate && ts && <WelcomeGate offer={trial.state === "offer"} credits={ts.credits} hours={ts.hours} name={profile.full_name?.split(" ")[0]} />}
      <ShaheenChat name={profile.full_name?.split(" ")[0]} voice lang={lang} />
    </div>
  );
}
