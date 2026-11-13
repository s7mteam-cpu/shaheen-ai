import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { guardPage } from "@/lib/server/auth";
import { countryOf } from "@/lib/countries";
import { List, type Row } from "./List";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("ar-KW", { timeZone: "Asia/Kuwait", dateStyle: "medium" }) : "—");

/** «عملاء بدون اشتراك»: who took the free trial and didn't subscribe, and who only signed up. The owner deletes them. */
export default async function Unsubscribed({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await guardPage("customers");
  const { tab = "trial" } = await searchParams;
  const admin = createAdminClient();
  const [{ data: people }, { data: subs }, { data: paid }, { data: claims, error: trialErr }] = await Promise.all([
    admin.from("profiles").select("id,full_name,email,phone,country,credits,created_at").eq("role", "user").order("created_at").limit(5000),
    admin.from("subscriptions").select("user_id"),
    admin.from("income").select("customer_id").not("customer_id", "is", null),
    admin.from("trial_claims").select("user_id,created_at,expires_at,ended_at").not("user_id", "is", null),
  ]);
  const customer = new Set([...(subs ?? []).map((x) => x.user_id), ...(paid ?? []).map((x) => x.customer_id)]);
  const trialOf = new Map((trialErr ? [] : claims ?? []).map((c) => [c.user_id as string, c]));
  const none = (people ?? []).filter((p) => !customer.has(p.id));
  const ids = none.map((p) => p.id);

  // last sign-in (from the sign-in accounts) and how many works each made
  const last = new Map<string, string | null>();
  for (let page = 1; page <= 20 && ids.length; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    for (const u of data?.users ?? []) last.set(u.id, u.last_sign_in_at ?? null);
    if (!data?.users?.length || data.users.length < 1000) break;
  }
  const works = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await admin.from("jobs").select("user_id").in("user_id", ids.slice(i, i + 500));
    for (const j of data ?? []) works.set(j.user_id, (works.get(j.user_id) ?? 0) + 1);
  }
  const row = (p: (typeof none)[number]): Row => {
    const t = trialOf.get(p.id);
    const live = t && !t.ended_at && new Date(t.expires_at).getTime() > Date.now();
    return { id: p.id, name: p.full_name || "—", email: p.email ?? "", phone: p.phone ?? "—", flag: countryOf(p.country ?? "KW").flag, joined: day(p.created_at), last: day(last.get(p.id)), works: works.get(p.id) ?? 0, credits: p.credits ?? 0, trial: t ? (live ? "شغّالة الحين" : `انتهت ${day(t.expires_at)}`) : "—" };
  };
  // a trial still running isn't listed: the customer may still subscribe today
  const tookTrial = none.filter((p) => { const t = trialOf.get(p.id); return t && (t.ended_at || new Date(t.expires_at).getTime() <= Date.now()); }).map(row);
  const onlySigned = none.filter((p) => !trialOf.has(p.id)).map(row);
  const tabs = [["trial", `🎁 أخذوا الهدية وما اشتركوا (${tookTrial.length})`], ["signed", `👤 سجّلوا بس (${onlySigned.length})`]] as const;

  return (
    <div className="flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-navy-900">عملاء بدون اشتراك</h1>
          <p className="mt-1 text-sm leading-7 text-subtle">اللي ما اشتركوا ولا دفعوا أبداً. تقدر تحذفهم وقت ما تبي، وسجل تجاربهم يظل محفوظ فما يقدرون ياخذون تجربة ثانية لو رجعوا سجّلوا. واللي تجربته شغّالة الحين ما يطلع هنا لين تخلص.</p>
        </div>
        <Link href="/admin/customers" className="btn btn-outline px-4 py-2 text-sm">رجوع للعملاء</Link>
      </div>
      <nav className="flex flex-wrap gap-2">
        {tabs.map(([k, label]) => <Link key={k} href={`/admin/customers/unsubscribed?tab=${k}`} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === k ? "bg-navy-900 text-white" : "bg-tint text-navy-900"}`}>{label}</Link>)}
      </nav>
      {tab === "signed" ? <List rows={onlySigned} showTrial={false} /> : <List rows={tookTrial} showTrial />}
    </div>
  );
}
