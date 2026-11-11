"use client";
import { useActionState, useState } from "react";
import { answerAccess, revokeAccess } from "@/app/app/account/accessActions";

type Access = { reason: string; status: string; expires_at: string | null; signed_name: string | null };

export function SupportAccess({ access, hours }: { access: Access | null; hours: number }) {
  const [state, action, pending] = useActionState(answerAccess, undefined);
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState("");

  if (!access || ["denied", "revoked", "expired"].includes(access.status)) {
    return <section className="card p-6 text-muted">ما في أي طلب صلاحية على حسابك. فريق شاهين ما يقدر يدخل على حسابك إلا إذا طلب وأنت وافقت.</section>;
  }
  if (access.status === "approved") {
    return (
      <section className="card flex flex-col gap-3 border-2 border-emerald-200 p-6">
        <h2 className="text-lg font-bold text-emerald-800">صلاحية الدعم فعّالة</h2>
        <p className="leading-7">وافقت ({access.signed_name}) إن فريق شاهين يدخل على حسابك لحل: «{access.reason}». الصلاحية تنتهي تلقائياً {access.expires_at ? `بتاريخ ${new Date(access.expires_at).toLocaleString("ar-KW")}` : ""}.</p>
        <form action={revokeAccess}><button className="btn border border-red-300 px-5 py-2.5 font-semibold text-red-700 hover:bg-red-50">ألغِ الصلاحية الآن</button></form>
      </section>
    );
  }
  const statement = `أنا ${name.trim() || "……"}، أفوّض إدارة منصة شاهين بالدخول على حسابي والاطلاع على مشاريعي وبياناتي، لحل المشكلة التالية: «${access.reason}». أعرف إن بيانات الدفع والبطاقات وكلمة المرور محمية ومشفّرة وما تشملها هالصلاحية. هذا التفويض ينتهي تلقائياً بعد ${hours} ساعة، وأقدر ألغيه بأي وقت.`;
  return (
    <section className="card flex flex-col gap-4 border-2 border-gold-500 p-6">
      <div>
        <h2 className="text-lg font-bold text-navy-900">فريق شاهين يطلب صلاحية الدخول على حسابك</h2>
        <p className="mt-1 leading-7 text-muted">السبب: <strong className="text-navy-900">{access.reason}</strong>. ما حدا بيدخل على حسابك إلا إذا وافقت هنا.</p>
      </div>
      {state?.ok ? <p role="status" className="font-semibold text-emerald-700">{state.ok}</p> : (
        <form action={action} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="mb-1.5 font-bold text-emerald-900">✓ اللي بيقدر الفريق يشوفه</p>
              <ul className="list-disc space-y-1 ps-5 text-[14px] leading-6 text-navy-900"><li>مشاريعك وأعمالك (التصاميم، الفيديوهات، الأصوات)</li><li>هويتك التجارية والملفات اللي رفعتها</li><li>إعدادات الأدوات ورصيد الريش</li></ul>
            </div>
            <div className="rounded-xl border border-navy-700/20 bg-navy-800/[0.04] p-4">
              <p className="mb-1.5 font-bold text-navy-900">🔒 محمي ومشفّر، ما بيقدر يشوفه</p>
              <ul className="list-disc space-y-1 ps-5 text-[14px] leading-6 text-navy-900"><li>بطاقاتك الائتمانية وبيانات الدفع</li><li>الفواتير والاشتراك (الدفع والإلغاء)</li><li>كلمة المرور وحذف الحساب</li></ul>
              <p className="mt-2 text-[12px] leading-5 text-subtle">بيانات البطاقات محفوظة عند بوابة الدفع نفسها مشفّرة، ومش عندنا أصلاً.</p>
            </div>
          </div>
          <label htmlFor="sig" className="label">اكتب اسمك الكامل</label>
          <input id="sig" name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="field max-w-sm" />
          <blockquote className="rounded-xl bg-canvas p-4 text-[15px] leading-8 text-navy-900">{statement}</blockquote>
          <label className="flex cursor-pointer items-start gap-2.5 font-semibold text-navy-900">
            <input type="checkbox" name="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#0B2A4A]" />
            أوافق على التفويض المكتوب فوق.
          </label>
          {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
          <div className="flex flex-wrap gap-2">
            <button name="answer" value="approve" disabled={!agree || name.trim().length < 2 || pending} className="btn btn-primary px-6 py-3 disabled:opacity-40">أوافق وأفوّض</button>
            <button name="answer" value="deny" disabled={pending} className="btn btn-outline px-6 py-3">أرفض</button>
          </div>
        </form>
      )}
    </section>
  );
}
