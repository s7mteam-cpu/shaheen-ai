"use client";
import { useActionState, useState } from "react";
import { answerAccess, revokeAccess } from "@/app/app/account/accessActions";
import { useT } from "@/components/LangProvider";

type Access = { reason: string; status: string; expires_at: string | null; signed_name: string | null };

export function SupportAccess({ access, hours }: { access: Access | null; hours: number }) {
  const T = useT();
  const [state, action, pending] = useActionState(answerAccess, undefined);
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState("");

  if (!access || ["denied", "revoked", "expired"].includes(access.status)) {
    return <section className="card p-6 text-muted">{T("ما فيه أي طلب صلاحية على حسابك. فريق شاهين ما يقدر يدخل على حسابك إلا إذا طلب وأنت وافقت.", "There are no access requests on your account. The Shaheen team can only access your account if they ask and you approve.")}</section>;
  }
  if (access.status === "approved") {
    return (
      <section className="card flex flex-col gap-3 border-2 border-emerald-200 p-6">
        <h2 className="text-lg font-bold text-emerald-800">{T("صلاحية الدعم فعّالة", "Support access is active")}</h2>
        <p className="leading-7">{T(`وافقت (${access.signed_name}) إن فريق شاهين يدخل على حسابك لحل: «${access.reason}». الصلاحية تنتهي تلقائياً ${access.expires_at ? `بتاريخ ${new Date(access.expires_at).toLocaleString("ar-KW")}` : ""}.`, `You (${access.signed_name}) approved the Shaheen team to access your account to fix: «${access.reason}». Access ends automatically${access.expires_at ? ` on ${new Date(access.expires_at).toLocaleString("en-GB")}` : ""}.`)}</p>
        <form action={revokeAccess}><button className="btn border border-red-300 px-5 py-2.5 font-semibold text-red-700 hover:bg-red-50">{T("ألغِ الصلاحية الآن", "Revoke access now")}</button></form>
      </section>
    );
  }
  const statement = T(`أنا ${name.trim() || "……"}، أفوّض إدارة منصة شاهين بالدخول على حسابي والاطلاع على مشاريعي وبياناتي، لحل المشكلة التالية: «${access.reason}». أعرف إن بيانات الدفع والبطاقات وكلمة المرور محمية ومشفّرة وما تشملها هالصلاحية. هذا التفويض ينتهي تلقائياً بعد ${hours} ساعة، وأقدر ألغيه بأي وقت.`,
    `I, ${name.trim() || "……"}, authorize the Shaheen platform administration to access my account and view my projects and data to resolve the following issue: «${access.reason}». I understand that payment details, cards and my password are protected and encrypted and are not included in this access. This authorization expires automatically after ${hours} hours, and I can revoke it at any time.`);
  return (
    <section className="card flex flex-col gap-4 border-2 border-gold-500 p-6">
      <div>
        <h2 className="text-lg font-bold text-navy-900">{T("فريق شاهين يطلب صلاحية الدخول على حسابك", "The Shaheen team is requesting access to your account")}</h2>
        <p className="mt-1 leading-7 text-muted">{T("السبب: ", "Reason: ")}<strong className="text-navy-900">{access.reason}</strong>{T(". محد يدخل على حسابك إلا إذا وافقت هنا.", ". No one can access your account unless you approve here.")}</p>
      </div>
      {state?.ok ? <p role="status" className="font-semibold text-emerald-700">{state.ok}</p> : (
        <form action={action} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="mb-1.5 font-bold text-emerald-900">{T("✓ اللي يقدر الفريق يشوفه", "✓ What the team can see")}</p>
              <ul className="list-disc space-y-1 ps-5 text-[14px] leading-6 text-navy-900"><li>{T("مشاريعك وأعمالك (التصاميم، الفيديوهات، الأصوات)", "Your projects and works (designs, videos, audio)")}</li><li>{T("هويتك التجارية والملفات اللي رفعتها", "Your brand kit and uploaded files")}</li><li>{T("إعدادات الأدوات ورصيد الريش", "Tool settings and credit balance")}</li></ul>
            </div>
            <div className="rounded-xl border border-navy-700/20 bg-navy-800/[0.04] p-4">
              <p className="mb-1.5 font-bold text-navy-900">{T("🔒 محمي ومشفّر، ما أحد يقدر يشوفه", "🔒 Protected and encrypted — no one can see")}</p>
              <ul className="list-disc space-y-1 ps-5 text-[14px] leading-6 text-navy-900"><li>{T("بطاقاتك الائتمانية وبيانات الدفع", "Your cards and payment details")}</li><li>{T("الفواتير والاشتراك (الدفع والإلغاء)", "Invoices and plan (payment and cancellation)")}</li><li>{T("كلمة المرور وحذف الحساب", "Password and account deletion")}</li></ul>
              <p className="mt-2 text-[12px] leading-5 text-subtle">{T("بيانات البطاقات محفوظة عند بوابة الدفع نفسها مشفّرة، وليست عندنا أصلاً.", "Card details are stored encrypted by the payment provider itself — we never hold them.")}</p>
            </div>
          </div>
          <label htmlFor="sig" className="label">{T("اكتب اسمك الكامل", "Type your full name")}</label>
          <input id="sig" name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="field max-w-sm" />
          <blockquote className="rounded-xl bg-canvas p-4 text-[15px] leading-8 text-navy-900">{statement}</blockquote>
          <label className="flex cursor-pointer items-start gap-2.5 font-semibold text-navy-900">
            <input type="checkbox" name="agree" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#0B2A4A]" />
            {T("أوافق على التفويض المكتوب فوق.", "I agree to the authorization above.")}
          </label>
          {state?.error && <p role="alert" className="text-sm font-semibold text-red-700">{state.error}</p>}
          <div className="flex flex-wrap gap-2">
            <button name="answer" value="approve" disabled={!agree || name.trim().length < 2 || pending} className="btn btn-primary px-6 py-3 disabled:opacity-40">{T("أوافق وأفوّض", "Approve and authorize")}</button>
            <button name="answer" value="deny" disabled={pending} className="btn btn-outline px-6 py-3">{T("أرفض", "Decline")}</button>
          </div>
        </form>
      )}
    </section>
  );
}
