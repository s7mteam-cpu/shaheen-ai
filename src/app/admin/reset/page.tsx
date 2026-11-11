import { guardPage } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESET_PHRASE } from "./phrase";
import { ResetForm } from "./ResetForm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Reset() {
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
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div><h1 className="text-[26px] font-bold text-red-800">تصفير المنصة</h1><p className="mt-1 text-sm text-subtle">علّم بس اللي بدك تصفّره، وكل خيار لحاله. عدّادات اللوحة بترجع صفر بدون ما تنمسح البيانات، وخيارات الريش والبيانات بتمسح نهائياً. مفيد قبل الإطلاق الرسمي بعد التجارب، ولا تستخدمه بعد ما يصير في عملاء دفعوا.</p></div>
      <ResetForm phrase={RESET_PHRASE} counts={{ customers, jobs, moves, leads, notes: notes ?? 0, holders: holders?.length ?? 0, balance: (holders ?? []).reduce((a, h) => a + (h.credits ?? 0), 0) }} />
    </div>
  );
}
