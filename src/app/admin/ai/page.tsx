import { guardPage } from "@/lib/server/auth";
import Link from "next/link";
import { getContent, getTools } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { providerInfo, textProviders, toolProviders, type ProviderId } from "@/lib/providers/registry";
import { saveAi } from "../actions";
import { saveFreeEngine } from "../templates/actions";
import { VertexTest } from "@/components/admin/VertexTest";
import { getFreeEngine, GEM_MODELS } from "@/lib/server/freeEngine";
import { getL } from "@/lib/server/lang";
import { MODEL_CATALOG, FAMILY_NAME, cleanModelMap, type ModelFamily } from "@/lib/models";
import { BACKGROUND_AI, TOOL_AI, familyOfModel } from "@/lib/aiMap";
import { ModelsForm } from "./models/ModelsForm";
import { pauseProvider, setToolAi, setToolEnabled } from "./hubActions";

export const dynamic = "force-dynamic";
const ENV: Record<ModelFamily, string> = { claude: "ANTHROPIC_API_KEY", google: "GEMINI_API_KEY", elevenlabs: "ELEVENLABS_API_KEY", fal: "FAL_KEY" };
const SITE: Record<ModelFamily, string> = { claude: "https://docs.claude.com/en/docs/about-claude/models/overview", google: "https://ai.google.dev/gemini-api/docs/models", elevenlabs: "https://elevenlabs.io/docs/models", fal: "https://fal.ai/models" };
const FAM_OF_PROVIDER: Record<string, ModelFamily> = { claude: "claude", gemini: "google", google: "google", elevenlabs: "elevenlabs", fal: "fal" };
const PILL: Record<ModelFamily, string> = { claude: "bg-[#F4E9DF] text-[#7A4A22]", google: "bg-[#E6F0FF] text-[#1D4E9E]", elevenlabs: "bg-[#EEE9FB] text-[#4B3A8F]", fal: "bg-[#E7F6EE] text-[#1F6B45]" };

function Head({ n, id, title, sub }: { n: number; id: string; title: string; sub: string }) {
  return (
    <div id={id} className="scroll-mt-24">
      <h2 className="flex items-center gap-2 text-[20px] font-bold text-navy-900"><span className="grid h-8 w-8 place-items-center rounded-full bg-navy-900 text-[15px] text-white">{n}</span>{title}</h2>
      <p className="mt-1 text-[13.5px] leading-6 text-subtle">{sub}</p>
    </div>
  );
}

/** «مركز الذكاء الاصطناعي»: every place the platform uses AI, in one ordered page. 1 providers · 2 tools · 3 models · 4 background tasks · 5 special engines. */
export default async function AiHub() {
  const L = await getL();
  await guardPage("ai");
  const admin = createAdminClient();
  const [{ ai }, tools, fe, { data: mrow }, { data: erow }, { data: prow }] = await Promise.all([
    getContent(), getTools(true), getFreeEngine(),
    admin.from("site_content").select("value").eq("key", "models").maybeSingle(),
    admin.from("site_content").select("value").eq("key", "models_last_error").maybeSingle(),
    admin.from("site_content").select("value").eq("key", "ai_paused").maybeSingle(),
  ]);
  const map = cleanModelMap((mrow?.value as { map?: unknown } | null)?.map);
  const postRaw = String((mrow?.value as { post?: unknown } | null)?.post ?? "");
  const post = /^claude-[a-z0-9.-]{2,60}$/.test(postRaw) ? postRaw : "";
  const bad = (erow?.value ?? null) as { at?: string; from?: string; to?: string } | null;
  const paused = (prow?.value ?? {}) as Record<string, string[]>;
  const hasKey = (f: ModelFamily) => Boolean(process.env[ENV[f]]);
  /** the model really called for a name written in the code */
  const real = (m: string) => (m === "post-writer" ? post || map["claude-sonnet-5-5"] || "claude-sonnet-5-5" : m === "chat" ? ai.chat_model || textProviders[ai.chat_provider as "claude"] || "" : m === "copy" ? ai.copy_model || textProviders[ai.copy_provider as "claude"] || "" : map[m] ?? m);
  const famOf = (m: string) => (m === "chat" ? FAM_OF_PROVIDER[ai.chat_provider] : m === "copy" ? FAM_OF_PROVIDER[ai.copy_provider] : familyOfModel(m)) ?? "claude";
  const Model = ({ m }: { m: string }) => { const f = famOf(m), r = real(m); return <code dir="ltr" className={`inline-block rounded px-1.5 py-0.5 text-[12px] font-bold ${PILL[f]}`}>{r || "—"}</code>; };

  const rows = tools.map((t) => {
    const allowed = Object.keys(toolProviders[t.id] ?? {}) as ProviderId[];
    const provider = (t.provider && (allowed.includes(t.provider as ProviderId) || !allowed.length) ? t.provider : allowed[0] ?? t.provider ?? "") as string;
    const main = allowed.length ? (t.provider_model?.trim() || toolProviders[t.id]?.[provider as ProviderId] || "") : "";
    return { t, provider, main, allowed, extra: TOOL_AI[t.id] ?? [] };
  });
  const usedBy = (f: ModelFamily) => rows.filter((r) => r.t.is_enabled && (FAM_OF_PROVIDER[r.provider] === f || r.extra.some((u) => famOf(u.model) === f))).length;
  const groups = (Object.keys(FAMILY_NAME) as ModelFamily[]).map((family) => ({
    family, name: FAMILY_NAME[family], env: ENV[family], hasKey: hasKey(family),
    rows: MODEL_CATALOG.filter((m) => m.family === family).map((m) => ({ id: m.id, family: m.family, use: m.use, test: m.test, current: map[m.id] ?? "" })),
  }));
  const provKeys: { key: string; fam: ModelFamily; label: string }[] = [{ key: "claude", fam: "claude", label: "Claude" }, { key: "google", fam: "google", label: "Google" }, { key: "elevenlabs", fam: "elevenlabs", label: "ElevenLabs" }, { key: "fal", fam: "fal", label: "fal.ai" }];

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-[26px] font-bold text-navy-900">{L("مركز الذكاء الاصطناعي")}</h1>
        <p className="mt-1 text-sm leading-7 text-subtle">{L("كل مكان بالموقع يستخدم الذكاء الاصطناعي، مرتّب بصفحة وحدة: مين المزوّد، أي نموذج يشتغل، وكيف تبدّله أو توقفه.")}</p>
        <div className="mt-3 flex flex-wrap gap-2"><Link href="/admin/ai/costs" className="btn btn-gold w-fit px-5 py-2.5">{L("💲 تكلفة كل طلب (للتسعير)")}</Link><Link href="/admin/ai/skills" className="btn btn-outline w-fit px-5 py-2.5">{L("🎓 مهارات الأدوات")}</Link></div>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label={L("أقسام الصفحة")}>
          {[["#providers", "1 · المزوّدون والمفاتيح"], ["#tools", "2 · الأدوات"], ["#models", "3 · النماذج"], ["#background", "4 · المهام الخلفية"], ["#engines", "5 · محركات خاصة"]].map(([h, l]) => <a key={h} href={h} className="chip">{L(l)}</a>)}
        </nav>
      </div>
      {bad?.to && <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">تنبيه: النموذج «{bad.to}» (بدل «{bad.from}») رفضه المزوّد{bad.at ? ` بتاريخ ${new Date(bad.at).toLocaleString("ar-KW", { timeZone: "Asia/Kuwait" })}` : ""}، فاشتغل الأصلي مكانه. صحّح الاسم بالقسم 3 أو رجّع الأصلي.</p>}

      {/* 1 */}
      <section className="flex flex-col gap-4">
        <Head n={1} id="providers" title={L("المزوّدون والمفاتيح")} sub={L("أربع شركات تشغّل كل شي. المفاتيح السرية تبقى في Vercel و Railway فقط (لأمانها ما تنكتب ولا تنعرض هنا)؛ هنا تشوف حالتها بس.")} />
        <div className="grid gap-3 sm:grid-cols-2">
          {provKeys.map(({ key, fam, label }) => {
            const stopped = (paused[key] ?? []).length;
            return (
              <div key={key} className="card flex flex-col gap-2.5 p-4">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-[16px] text-navy-900">{label}</b>
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${hasKey(fam) ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{hasKey(fam) ? L("المفتاح موجود") : L("المفتاح ناقص")}</span>
                </div>
                <p className="text-[13px] text-subtle"><code dir="ltr">{ENV[fam]}</code> · {usedBy(fam)} {L("أداة شغّالة تعتمد عليه")}</p>
                {fam === "google" && <p className="text-[12.5px] text-subtle"><code dir="ltr">GEMINI_VIDEO_API_KEY</code> ({L("لقطات الفيديو")}): <b className={process.env.GEMINI_VIDEO_API_KEY ? "text-emerald-700" : "text-red-700"}>{process.env.GEMINI_VIDEO_API_KEY ? L("موجود ✓") : L("غير موجود")}</b></p>}
                <div className="flex flex-wrap items-center gap-2">
                  <a href={SITE[fam]} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-navy-700 underline">{L("أسماء نماذجه الرسمية")}</a>
                  <form action={pauseProvider} className="ms-auto">
                    <input type="hidden" name="provider" value={key} />
                    {stopped ? <><input type="hidden" name="resume" value="1" /><button className="btn btn-primary px-3 py-1.5 text-[12.5px]">{L("رجّع أدواته")} ({stopped})</button></>
                      : <button className="btn btn-outline px-3 py-1.5 text-[12.5px] text-red-700" title={L("يوقف كل الأدوات اللي مزوّدها الأساسي هذا")}>{L("⛔ طوارئ: وقّف أدواته")}</button>}
                  </form>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[12.5px] leading-6 text-subtle">{L("زر الطوارئ يوقف الأدوات اللي مزوّدها الأساسي هذا (مثلاً لو صار صرف غريب أو المزوّد واقف)، ويتذكرها عشان ترجّعها كلها بضغطة. الأدوات اللي تستخدمه بشكل ثانوي ما تتوقف.")}</p>
      </section>

      {/* 2 */}
      <section className="flex flex-col gap-4">
        <Head n={2} id="tools" title={L("الأدوات")} sub={L("كل أداة بسطر: شغّالة أو لا، مزوّدها ونموذجها الأساسي، وأي نماذج ثانية تستخدمها. اللون يدل على المزوّد.")} />
        <div className="card overflow-x-auto p-2">
          <table className="w-full min-w-[820px] text-[13.5px]">
            <thead><tr className="text-right text-[12.5px] text-subtle"><th className="p-2.5 font-semibold">{L("الأداة")}</th><th className="p-2.5 font-semibold">{L("الحالة")}</th><th className="p-2.5 font-semibold">{L("المزوّد والنموذج الأساسي")}</th><th className="p-2.5 font-semibold">{L("تستخدم كمان")}</th><th className="p-2.5 font-semibold">{L("السعر")}</th><th className="p-2.5"><span className="sr-only">{L("تعديل")}</span></th></tr></thead>
            <tbody>
              {rows.map(({ t, provider, main, allowed, extra }) => (
                <tr key={t.id} className="border-t border-[#EDF1F6] align-top">
                  <td className="p-2.5"><b className="text-navy-900">{t.name}</b><br /><code dir="ltr" className="text-[11.5px] text-subtle">{t.id}</code></td>
                  <td className="p-2.5">
                    <form action={setToolEnabled}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="on" value={t.is_enabled ? "0" : "1"} />
                      <button className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${t.is_enabled ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} title={t.is_enabled ? L("اضغط للإيقاف") : L("اضغط للتشغيل")}>{t.is_enabled ? L("شغّالة ✓") : L("موقوفة")}</button>
                    </form>
                  </td>
                  <td className="p-2.5">{allowed.length ? (
                    <form action={setToolAi} className="flex min-w-[230px] flex-col gap-1.5">
                      <input type="hidden" name="id" value={t.id} />
                      <select name="provider" defaultValue={provider} className="field py-1.5 text-[13px]" aria-label={L("المزوّد")}>{allowed.map((p) => <option key={p} value={p}>{providerInfo[p].name.split(" (")[0]}</option>)}</select>
                      <input name="model" defaultValue={t.provider_model ?? ""} dir="ltr" autoComplete="off" spellCheck={false} placeholder={`${toolProviders[t.id]?.[provider as ProviderId] ?? ""} (${L("الأصلي")})`} className="field py-1.5 text-left text-[12.5px]" aria-label={L("النموذج")} />
                      <div className="flex items-center justify-between gap-2"><span className="text-[12px] text-subtle">{L("يشتغل الآن:")} <Model m={main} /></span><button className="btn btn-outline px-2.5 py-1 text-[12px] font-semibold">{L("حفظ")}</button></div>
                    </form>
                  ) : <span className="text-[12.5px] text-subtle">{extra.length ? L("ما لها نموذج أساسي يُختار (تشوف اللي تستخدمه بالعمود الجاي)") : L("بدون ذكاء اصطناعي")}</span>}</td>
                  <td className="p-2.5">{extra.length ? <ul className="flex flex-col gap-1.5">{extra.map((u, i) => <li key={i}><Model m={u.model} /> <span className="text-[12.5px] text-subtle">{L(u.what)}</span></li>)}</ul> : <span className="text-subtle">—</span>}</td>
                  <td className="whitespace-nowrap p-2.5">{t.credit_cost} {L("ريشة")}<br /><span className="text-[12px] text-subtle">/ {t.cost_unit}</span></td>
                  <td className="p-2.5"><Link href={`/admin/tools#tool-${t.id}`} className="whitespace-nowrap text-[13px] font-semibold text-navy-700 underline">{L("السعر والوصف")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="list-disc pr-5 text-[12.5px] leading-6 text-subtle">
          <li>{L("الأداة اللي لها مزوّد أساسي: اختر المزوّد واكتب نموذجها الخاص بنفس السطر واحفظ (الخانة الفاضية = نموذج المزوّد الأصلي). هذا يغيّرها هي بس.")}</li>
          <li>{L("النماذج بعمود «تستخدم كمان» مشتركة بين عدة أدوات، وتتبدل من القسم 3 (تتبدل لكل الأدوات اللي تستخدمها).")}</li>
          <li>{L("القائمة تعرض المزوّدين اللي الأداة مبرمجة تشتغل عليهم. إضافة مزوّد جديد كلياً (شركة جديدة) تحتاج برمجة موصّل له أول، وبعدها يطلع هنا بالقائمة.")}</li>
        </ul>
      </section>

      {/* 3 */}
      <section className="flex flex-col gap-4">
        <Head n={3} id="models" title={L("النماذج")} sub={L("لما ينزل نموذج أحدث، اكتب اسمه بخانة النموذج القديم واحفظ: كل الأدوات اللي تستخدمه تتحول عليه خلال نص دقيقة، بدون رفع ملفات. الخانة الفاضية = الأصلي.")} />
        <ul className="card list-disc p-5 pr-9 text-[13.5px] leading-7 text-subtle">
          <li>{L("الاسم لازم يكون من نفس المزوّد، وينكتب بالإنجليزي مثل ما هو بموقعه.")}</li>
          <li>{L("نماذج النصوص (Claude و Gemini): اضغط «اختبر الاسم» قبل الحفظ. اختبار Claude طلب صغير جداً على حسابك، واختبار Google مجاني.")}</li>
          <li>{L("الصور والفيديو والصوت ما تنختبر من هنا: احفظ ثم جرّب الأداة مرة. لو ما اشتغلت رجّع الأصلي.")}</li>
          <li>{L("النموذج الأحدث ممكن يكون أغلى أو أبطأ. شوف سعره بموقع المزوّد قبل التبديل.")}</li>
        </ul>
        <ModelsForm groups={groups} post={post} postDefault={map["claude-sonnet-5-5"] ?? "claude-sonnet-5-5"} hasClaudeKey={hasKey("claude")} />
      </section>

      {/* 4 */}
      <section className="flex flex-col gap-4">
        <Head n={4} id="background" title={L("المهام الخلفية")} sub={L("أشياء مو أدوات لكنها تستخدم الذكاء الاصطناعي طول الوقت. أول ثنتين تختار مزوّدهم ونموذجهم من هنا، والباقي يتبدل نموذجه من القسم 3.")} />
        <form action={saveAi} className="card flex flex-col gap-5 p-6">
          {([["«كلّم شاهين» — المساعد الجانبي", "يرد على العملاء ويعرف حساباتهم.", "chat_provider", "chat_model", ai.chat_provider, ai.chat_model], ["الكتابة — نصوص الإعلانات و«ألهمني»", "يكتب الزوايا التسويقية والنصوص والأفكار.", "copy_provider", "copy_model", ai.copy_provider, ai.copy_model]] as const).map(([title, hint, pName, mName, p, m]) => (
            <div key={pName} className="grid gap-3 border-b border-[#EDF1F6] pb-5 last:border-0 md:grid-cols-2">
              <div className="md:col-span-2"><h3 className="font-bold">{L(title)}</h3><p className="text-sm text-subtle">{L(hint)}</p></div>
              <div className="flex flex-col gap-1.5"><label className="label">{L("المزوّد")}</label>
                <select name={pName} defaultValue={p} className="field">{(Object.keys(textProviders) as ProviderId[]).map((x) => <option key={x} value={x}>{providerInfo[x].name}</option>)}</select></div>
              <div className="flex flex-col gap-1.5"><label className="label">{L("النموذج")}</label>
                <input name={mName} defaultValue={m} dir="ltr" className="field text-right" placeholder={Object.entries(textProviders).map(([a, b]) => `${a}: ${b}`).join(" | ")} /></div>
            </div>
          ))}
          <button className="btn btn-primary self-start px-6 py-2.5">{L("حفظ")}</button>
        </form>
        <div className="card overflow-x-auto p-2">
          <table className="w-full min-w-[560px] text-[13.5px]">
            <thead><tr className="text-right text-[12.5px] text-subtle"><th className="p-2.5 font-semibold">{L("المهمة")}</th><th className="p-2.5 font-semibold">{L("النموذج الحالي")}</th><th className="p-2.5 font-semibold">{L("وش تسوي")}</th></tr></thead>
            <tbody>{BACKGROUND_AI.map((b) => <tr key={b.name} className="border-t border-[#EDF1F6]"><td className="p-2.5 font-semibold text-navy-900">{L(b.name)}</td><td className="p-2.5"><Model m={b.model} /></td><td className="p-2.5 text-[12.5px] text-subtle">{L(b.what)}{b.where ? ` · ${L(b.where)}` : ""}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      {/* 5 */}
      <section className="flex flex-col gap-4">
        <Head n={5} id="engines" title={L("محركات خاصة")} sub={L("إعدادات تخص أداة بعينها وما تدخل تحت «نموذج واحد».")} />
        <form action={saveFreeEngine} className="card flex flex-col gap-4 p-6">
          <div><h3 className="text-lg font-bold">{L("محرك «تصميم مبتكر» (الفيديو) عند العملاء")}</h3>
            <p className="mt-1 text-sm text-subtle">{L("القديم: كلود يكتب كود الموشن (الاستوديو الحي والتعديل المباشر). الجديد (جيميناي): كلود يرتّب النص، الصوت يتسجّل أولاً، وجيميناي يبني الفيديو كصفحة.")}</p></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5"><label className="label">{L("المحرك")}</label>
              <select name="engine" defaultValue={fe.engine} className="field"><option value="classic">{L("القديم (مبتكر بالكود)")}</option><option value="gemini">{L("الجديد (جيميناي)")}</option></select></div>
            <div className="flex flex-col gap-1.5"><label className="label">{L("نموذج جيميناي")}</label>
              <select name="model" defaultValue={fe.model} className="field">{GEM_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
            <div className="flex flex-col gap-1.5"><label className="label">{L("مصدر Gemini (من أي حساب ينخصم)")}</label>
              <select name="gemVia" defaultValue={fe.gemVia} className="field"><option value="studio">{L("AI Studio (الرصيد المسبق)")}</option><option value="vertex">{L("Vertex AI (حساب Google Cloud)، وإذا فشل يرجع لـAI Studio")}</option></select>
              <VertexTest hasKey={!!process.env.VERTEX_API_KEY} /></div>
            <div className="flex flex-col gap-1.5"><label className="label">{L("وضع التخطيط")}</label>
              <select name="plan" defaultValue={fe.plan} className="field"><option value="scenes">{L("نص مع مشاهد (أرخص وأسرع)")}</option><option value="full">{L("خطة كاملة (أغنى وأغلى)")}</option></select></div>
            <div className="flex flex-col gap-1.5"><label className="label">{L("سقف التصاميم لكل عميل بالـ24 ساعة")}</label>
              <input name="dailyCap" type="number" min={1} max={100} defaultValue={fe.dailyCap} className="field" /></div>
            <div className="flex flex-col gap-1.5"><label className="label">{L("أقصى مدة لفيديو «مونتاج مبتكر» (بالدقائق، من 1 إلى 30)")}</label>
              <input name="fxMaxMin" type="number" min={1} max={30} defaultValue={fe.fxMaxMin} className="field" /></div>
            <div className="flex flex-col gap-1.5"><label className="label">{L("«عناصر ورا المتحدث» بالمونتاج المبتكر (يستخدم خدمة قص مدفوعة عبر fal)")}</label>
              <label className="flex items-center gap-2 text-sm"><input name="fxBehind" type="checkbox" defaultChecked={fe.fxBehind} className="h-4 w-4" />{L("متاح للعملاء")}</label></div>
            <div className="flex flex-col gap-1.5"><label className="label">{L("«صور مولّدة بالذكاء الاصطناعي» بالمونتاج المبتكر (بنموذج أداة الصور)")}</label>
              <label className="flex items-center gap-2 text-sm"><input name="fxImages" type="checkbox" defaultChecked={fe.fxImages} className="h-4 w-4" />{L("متاح للعملاء")}</label>
              <input name="fxImagesCost" type="number" min={0} max={1000} defaultValue={fe.fxImagesCost} className="field" aria-label={L("سعره الإضافي لكل دقيقة (ريشة)")} />
              <span className="text-[12px] text-subtle">{L("السعر الإضافي لكل دقيقة (ريشة). صورة لكل 8 ثواني تقريباً، وحد أقصى 8 صور.")}</span></div>
            <div className="flex flex-col gap-1.5"><label className="label">{L("المراجعة النهائية بالفيديو (المونتاج المبتكر)")}</label>
              <label className="flex items-center gap-2 text-sm"><input name="fxReview" type="checkbox" defaultChecked={fe.fxReview} className="h-4 w-4" />{L("Gemini يشاهد الفيديو النهائي بصوته ويعيد المقطع الضعيف مرة (وقت وتكلفة أكثر)")}</label></div>
            <div className="flex flex-col gap-1.5"><label className="label">{L("سعره الإضافي لكل دقيقة (ريشة)")}</label>
              <input name="fxBehindCost" type="number" min={0} max={1000} defaultValue={fe.fxBehindCost} className="field" /></div>
          </div>
          <p className="text-sm"><code dir="ltr">GEMINI_API_KEY</code> ({L("بـRailway للـWorker")})</p>
          <button className="btn btn-primary self-start px-6 py-2.5">{L("حفظ")}</button>
        </form>
        <div className="card flex flex-col gap-2 p-6">
          <h3 className="text-lg font-bold">{L("لقطات بالذكاء الاصطناعي (مشاهد واقعية)")}</h3>
          <p className="text-sm text-subtle">{L("العميل يختار في «مشاهد واقعية» بين لقطات جاهزة (أرخص) ولقطات يولّدها الذكاء الاصطناعي (جودة أعلى وسعر ضعف). تشتغل بنموذج Gemini Omni، وتحتاج المفتاح GEMINI_VIDEO_API_KEY في Vercel.")}</p>
          <Link href="/admin/ai/veo" className="w-fit font-semibold text-navy-700 underline">{L("جرّب توليد لقطة")}</Link>
        </div>
        <div className="card flex flex-col gap-2 p-6">
          <h3 className="text-lg font-bold">{L("كاتب «بوست مبتكر» و«كاروسيل مبتكر»")}</h3>
          <p className="text-sm text-subtle">{L("له خانة خاصة بأول القسم 3 (البطاقة ذات الإطار الذهبي).")} {L("الحالي:")} <Model m="post-writer" /></p>
        </div>
      </section>
    </div>
  );
}
