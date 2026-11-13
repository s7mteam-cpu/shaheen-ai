import Link from "next/link";
import { redirect } from "next/navigation";
import { adminAccess } from "@/lib/server/auth";
import { readLock } from "@/lib/server/adminLock";
import { serverT } from "@/lib/server/lang";
import { UnlockForm } from "../passwords/Forms";

export const dynamic = "force-dynamic";

export default async function Unlock({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const a = await adminAccess();
  if (!a) redirect("/app");
  const T = await serverT();
  const { next = "/admin" } = await searchParams;
  const { lock } = await readLock();
  if (!lock) return (
    <div className="card flex max-w-md flex-col gap-3 p-6">
      <h2 className="text-lg font-bold text-navy-900">🔒 {T("«تصفير المنصة» يحتاج كلمة سر", "«Platform reset» needs a password")}</h2>
      <p className="text-[14px] leading-7 text-subtle">{T("هالصفحة فيها مسح المنصة وتنزيل بيانات كل العملاء، فما تنفتح إلا بعد ما المالك يحط كلمة سر الإدارة.", "It can wipe the platform and download every customer's data, so it opens only after the owner sets the admin password.")}</p>
      {a.full && <Link href="/admin/passwords" className="btn btn-primary py-3">{T("حط كلمة السر من «كلمات السر»", "Set it in «Passwords»")}</Link>}
    </div>
  );
  return <UnlockForm next={next} />;
}
