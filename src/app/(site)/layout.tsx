import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ShaheenChat } from "@/components/ShaheenChat";
import { getContent, getSessionProfile } from "@/lib/data";
import { getChosenLang, getLang } from "@/lib/server/lang";
import { localize } from "@/lib/server/translate";
import { getMoney } from "@/lib/server/money";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [content, profile, lang, chosen, { cur }] = await Promise.all([getContent(), getSessionProfile(), getLang(), getChosenLang(), getMoney()]);
  const footer = await localize(content.footer, lang);
  return (
    <>
      <SiteHeader signedIn={Boolean(profile)} lang={lang} chosen={chosen} cur={cur} />
      {children}
      <SiteFooter footer={footer} lang={lang} />
      <ShaheenChat name={profile?.full_name?.split(" ")[0]} voice={!!profile} lang={lang} />
    </>
  );
}
