import { getContent, getPayGate } from "@/lib/data";
import { PayGateNotice } from "@/components/app/PayGateNotice";
import { getLang } from "@/lib/server/lang";
import { tr } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

/** «إغلاق الاشتراك مؤقتاً»: where the homepage plan buttons go while the switch is on (no sign-in needed). */
export default async function SubscribeSoon() {
  const [gate, content, lang] = await Promise.all([getPayGate(), getContent(), getLang()]);
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-5 py-16">
      <PayGateNotice message={gate.message} whatsapp={content.footer?.whatsapp ?? ""} label={tr(lang, "تواصل معنا على الواتساب", "Chat with us on WhatsApp")} />
    </main>
  );
}
