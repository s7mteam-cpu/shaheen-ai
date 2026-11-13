import { guardPage, requireFullAdmin } from "@/lib/server/auth";
import { BackupButtons } from "./BackupButtons";

const CODE_ZIP = "https://github.com/s7mteam-cpu/shaheen-ai/archive/refs/heads/main.zip";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESET_PHRASE, RESET_PHRASE_EN } from "./phrase";
import { getLang } from "@/lib/server/lang";
import { ResetForm } from "./ResetForm";
import { FullReset } from "./FullReset";
import { FULL_PHRASE, FULL_PHRASE_EN } from "./phrase";
import { getL } from "@/lib/server/lang";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // «تصفير كامل» saves a full backup first

export default async function Reset() {
  const L = await getL();
  await guardPage("reset");
  const admin = createAdminClient();
  const head = { count: "exact" as const, head: true };
  const [c, j, m, l] = await Promise.all([
    admin.from("profiles").select("id", head).eq("role", "user"),
    admin.from("jobs").select("id", head),
    admin.from("credit_ledger").select("id", head),
    admin.from("leads").select("id", head),
  ]);
  const { count: notes } = await admin.from("notifications").select("id", head);
  const { data: holders } = await admin.from("profiles").select("credits").gt("credits", 0);
  const [customers, jobs, moves, leads] = [c, j, m, l].map((r) => r.count ?? 0);
  const full = !!(await requireFullAdmin());
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div><h1 className="text-[26px] font-bold text-red-800">{L("تصفير المنصة")}</h1><p className="mt-1 text-sm text-subtle">{L("علّم بس اللي تبي تصفّره، وكل خيار لحاله. عدّادات اللوحة بترجع صفر بدون ما تنمسح البيانات، وخيارات الريش والبيانات بتمسح نهائياً. مفيد قبل الإطلاق الرسمي بعد التجارب، ولا تستخدمه بعد ما يصير في عملاء دفعوا.")}</p></div>
      <BackupButtons codeUrl={CODE_ZIP} />
      {full && <FullReset phrase={(await getLang()) === "en" ? FULL_PHRASE_EN : FULL_PHRASE} />}
      <ResetForm phrase={(await getLang()) === "en" ? RESET_PHRASE_EN : RESET_PHRASE} counts={{ customers, jobs, moves, leads, notes: notes ?? 0, holders: holders?.length ?? 0, balance: (holders ?? []).reduce((a, h) => a + (h.credits ?? 0), 0) }} />
    </div>
  );
}
