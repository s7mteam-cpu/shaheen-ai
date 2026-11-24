import Link from "next/link";
import { L } from "@/lib/i18n/ui";
import { requireAdmin } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { CLOTHS, COLORS, DEFAULT_BUSY, FACES, PROPS, type Agent } from "@/lib/agents";
import { getTeam } from "@/lib/server/chatTeam";
import { AgentFigure } from "@/components/AgentFigure";
import { moveStaff, removeStaff, saveStaff, saveStaffSettings } from "./actions";

export const dynamic = "force-dynamic";
const AR: Record<string, string> = { white: "غترة بيضاء", red: "شماغ أحمر", beard: "لحية", mustache: "شنب", glasses: "نظارة", headset: "سماعة", clean: "بدون", design: "تصميم", video: "فيديو", write: "كتابة", chat: "محادثة", calc: "حاسبة", idea: "فكرة" };

function Fields({ a }: { a?: Agent }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1"><span className="label">{L("الاسم")}</span><input name="name" required maxLength={24} defaultValue={a?.name ?? ""} className="field" placeholder={L("مثال: أبو خالد")} /></label>
        <label className="flex flex-col gap-1"><span className="label">{L("الوظيفة")}</span><input name="role" required maxLength={30} defaultValue={a?.role ?? ""} className="field" placeholder={L("مثال: محاسب")} /></label>
        <label className="flex flex-col gap-1"><span className="label">{L("الاسم بالإنجليزي (اختياري)")}</span><input name="nameEn" maxLength={24} defaultValue={a && a.nameEn !== a.name ? a.nameEn : ""} className="field" dir="ltr" /></label>
        <label className="flex flex-col gap-1"><span className="label">{L("الوظيفة بالإنجليزي (اختياري)")}</span><input name="roleEn" maxLength={30} defaultValue={a && a.roleEn !== a.role ? a.roleEn : ""} className="field" dir="ltr" /></label>
      </div>
      <label className="flex flex-col gap-1"><span className="label">{L("تخصصه (هذا اللي يقراه الذكاء الاصطناعي: اكتب بكلامك شنو شغله وكيف يتكلم)")}</span><textarea name="focus" rows={3} maxLength={1500} defaultValue={a?.focus ?? ""} className="field" placeholder={L("مثال: محاسب يساعد العميل يفهم مصاريفه وأرباحه وتسعير منتجاته، يشرح ببساطة ويعطي أمثلة بالأرقام، ويذكّر إن كلامه معلومات عامة.")} /></label>
      <label className="flex flex-col gap-1"><span className="label">{L("السطر تحت اسمه بالمكتب")}</span><input name="line" maxLength={70} defaultValue={a?.line ?? ""} className="field" /></label>
      <label className="flex flex-col gap-1"><span className="label">{L("أول كلامه للعميل (اختياري)")}</span><textarea name="hello" rows={2} maxLength={260} defaultValue={a?.hello ?? ""} className="field" /></label>
      <label className="flex flex-col gap-1"><span className="label">{L("اقتراحات جاهزة للعميل (كل اقتراح بسطر، 3 بالكثير)")}</span><textarea name="starters" rows={3} defaultValue={(a?.starters ?? []).join("\n")} className="field" /></label>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1"><span className="label">{L("اللون")}</span><select name="color" defaultValue={a?.color ?? COLORS[4]} className="field">{[...new Set([...(a ? [a.color] : []), ...COLORS])].map((c) => <option key={c} value={c} style={{ background: c, color: "#061A30" }}>{c}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="label">{L("الغترة")}</span><select name="cloth" defaultValue={a?.look.cloth ?? "white"} className="field">{CLOTHS.map((c) => <option key={c} value={c}>{L(AR[c])}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="label">{L("الوجه")}</span><select name="face" defaultValue={a?.look.face ?? "clean"} className="field">{FACES.map((c) => <option key={c} value={c}>{L(AR[c])}</option>)}</select></label>
        <label className="flex flex-col gap-1"><span className="label">{L("على مكتبه")}</span><select name="prop" defaultValue={a?.look.prop ?? "idea"} className="field">{PROPS.map((c) => <option key={c} value={c}>{L(AR[c])}</option>)}</select></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input name="talk" type="checkbox" defaultChecked={!!a?.talk} className="h-4 w-4" />{L("مدير: كلام بس. يجاوب ويسمع الشكاوي ويحوّل للموظف المختص، وما يجهّز بوست ولا فيديو ولا أي طلب.")}</label>
      <label className="flex items-center gap-2 text-sm"><input name="open" type="checkbox" defaultChecked={!!a?.open} className="h-4 w-4" />{L("بابه مفتوح للكل (يكلم الزوار وغير المشتركين). خلّها للمدير.")}</label>
    </>
  );
}

export default async function StaffPage() {
  if (!(await requireAdmin("ai"))) redirect("/admin");
  const team = await getTeam();
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div>
        <Link href="/admin/ai" className="text-sm font-semibold text-navy-700 underline">{L("← مركز الذكاء الاصطناعي")}</Link>
        <h1 className="mt-2 text-[26px] font-bold text-navy-900">{L("فريق «كلّم شاهين»")}</h1>
        <p className="mt-1 text-sm leading-7 text-subtle">{L("هنا تغيّر أسامي الموظفين وتخصصاتهم وأشكالهم، وتضيف موظف جديد بكلامك بدون كود. أي تغيير يطلع للعملاء أول ما يفتحون «كلّم شاهين». إذا عدد الفريق فردي، أول واحد بالقائمة يقعد لحاله على راس المكتب (المدير).")}</p>
      </div>

      <section className="card flex flex-col gap-4 p-5">
        <h2 className="text-lg font-bold text-navy-900">{L("إعدادات الفريق")}</h2>
        <form action={saveStaffSettings} className="flex flex-col gap-4">
          <label className="flex items-start gap-2 text-sm"><input name="membersOnly" type="checkbox" defaultChecked={team.membersOnly} className="mt-1 h-4 w-4" /><span>{L("الفريق للمشتركين فقط")}<span className="block text-[12px] text-subtle">{L("الزائر واللي ما عنده باقة ولا ريش يشوف الموظفين، وإذا كلّم واحد منهم يرد عليه بجملة من الجمل تحت ويدلّه على المدير وعلى الاشتراك. المدير (اللي بابه مفتوح) يرد على الكل.")}</span></span></label>
          <label className="flex flex-col gap-1"><span className="label">{L("جمل الموظف المشغول (كل جملة بسطر، وتنختار وحدة عشوائي)")}</span><textarea name="busyLines" rows={8} defaultValue={(team.busyLines.length ? team.busyLines : DEFAULT_BUSY).join("\n")} className="field" /><span className="text-[12px] text-subtle">{L("هذي جمل ثابتة تنرسل كما هي بدون ذكاء اصطناعي، فما تكلفك شي. بعدها ينضاف تلقائياً سطر يقول إن الموظف للمشتركين.")}</span></label>
          <label className="flex items-start gap-2 text-sm"><input name="allowCustom" type="checkbox" defaultChecked={team.allowCustom} className="mt-1 h-4 w-4" /><span>{L("اسمح للعملاء بإضافة موظفين لأنفسهم")}<span className="block text-[12px] text-subtle">{L("العميل المسجّل يضيف موظف خاص فيه (اسم ووظيفة ووصف)، ما يشوفه غيره. وصفه يمر على فحص المحتوى ويدخل كوصف وليس كأوامر.")}</span></span></label>
          <label className="flex w-48 flex-col gap-1"><span className="label">{L("كم موظف لكل عميل")}</span><input name="maxCustom" type="number" min={1} max={6} defaultValue={team.maxCustom} className="field" /></label>
          <button className="btn btn-primary w-fit px-6 py-2.5">{L("حفظ الإعدادات")}</button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-navy-900">{L("الموظفون")} ({team.agents.length})</h2>
        {team.agents.map((a, i) => (
          <details key={a.key} className="card p-5">
            <summary className="flex cursor-pointer items-center gap-3">
              <span className="block h-14 w-14 shrink-0 overflow-hidden rounded-full bg-navy-900" style={{ border: `2px solid ${a.color}` }}><AgentFigure id={`adm-${a.key}`} look={a.look} color={a.color} small /></span>
              <span className="flex min-w-0 flex-1 flex-col"><b className="text-navy-900">{a.name}{a.open ? ` · ${L("بابه مفتوح")}` : ""}</b><span className="text-sm text-subtle">{a.role}</span></span>
              <span className="text-sm text-navy-700 underline">{L("تعديل")}</span>
            </summary>
            <form action={saveStaff} className="mt-4 flex flex-col gap-3">
              <input type="hidden" name="key" value={a.key} />
              <Fields a={a} />
              <button className="btn btn-primary w-fit px-6 py-2.5">{L("حفظ")}</button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              <form action={moveStaff}><input type="hidden" name="key" value={a.key} /><input type="hidden" name="dir" value="up" /><button disabled={i === 0} className="btn btn-outline px-3 py-1.5 text-sm disabled:opacity-40">{L("↑ قدّمه")}</button></form>
              <form action={moveStaff}><input type="hidden" name="key" value={a.key} /><input type="hidden" name="dir" value="down" /><button disabled={i === team.agents.length - 1} className="btn btn-outline px-3 py-1.5 text-sm disabled:opacity-40">{L("↓ أخّره")}</button></form>
              <form action={removeStaff}><input type="hidden" name="key" value={a.key} /><button disabled={team.agents.length <= 1} className="btn btn-outline px-3 py-1.5 text-sm text-red-700 disabled:opacity-40">{L("حذف الموظف")}</button></form>
            </div>
          </details>
        ))}
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold text-navy-900">{L("＋ موظف جديد")}</h2>
        <p className="text-sm text-subtle">{L("اكتب اسمه ووظيفته وتخصصه بكلامك، واختر شكله. مثلاً: محاسب، مسوّق، مستشار مبيعات. الحد 12 موظف.")}</p>
        <form action={saveStaff} className="flex flex-col gap-3">
          <Fields />
          <button disabled={team.agents.length >= 12} className="btn btn-gold w-fit px-6 py-2.5 disabled:opacity-40">{L("أضفه للفريق")}</button>
        </form>
      </section>
    </div>
  );
}
