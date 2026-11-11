import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ShaheenChat } from "@/components/ShaheenChat";
import { getContent, getSessionProfile } from "@/lib/data";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [content, profile] = await Promise.all([getContent(), getSessionProfile()]);
  return (
    <>
      <SiteHeader signedIn={Boolean(profile)} />
      {children}
      <SiteFooter footer={content.footer} />
      <ShaheenChat name={profile?.full_name?.split(" ")[0]} voice={!!profile} />
    </>
  );
}
