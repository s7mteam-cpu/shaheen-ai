import { createAdminClient } from "@/lib/supabase/admin";
import { RESET_PHRASE } from "./phrase";
import { ResetForm } from "./ResetForm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function Reset() {
  const admin = createAdminClient();
  const head = { count: "exact" as const, head: true };
  const [c, j, m, l] = await Promise.all([
    admin.from("profiles").select("id", head).neq("role", "admin"),
    admin.from("jobs").select("id", head),
    admin.from("credit_ledger").select("id", head),
    admin.from("leads").select("id", head),
  ]);
  const { count: subs } = await admin.from("subscriptions").select("user_id", head);
  const [customers, jobs, moves, leads] = [c, j, m, l].map((r) => r.count ?? 0);
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div><h1 className="text-[26px] font-bold text-red-800">تصفير المنصة</h1><p className="mt-1 text-sm text-subtle">اختار شو بدك تصفّر: النظرة العامة، أو الريش بس، أو الأعمال، أو حسابات العملاء، أو قائمة التعديلات، أو كلهم (تصفير كامل). مفيد قبل الإطلاق الرسمي بعد التجارب، ولا تستخدمه بعد ما يصير في عملاء دفعوا.</p></div>
      <ResetForm phrase={RESET_PHRASE} counts={{ customers, jobs, moves, leads, subs: subs ?? 0 }} />
    </div>
  );
}
