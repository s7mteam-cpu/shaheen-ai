import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Everything the assistant sees about a customer goes through here. It is DATA, never instructions:
 *  angle brackets and our [[ ]] action markers are stripped so stored text can neither close the data block
 *  nor fake an action, and every query is filtered by the customer's own id (admins can read all rows through RLS). */
export const clean = (v: unknown, n: number) =>
  String(v ?? "").replace(/[<>]/g, "").replace(/\[\[|\]\]/g, "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export type CustomerCtx = { block: string; credits: number; prefs: Json };

export async function customerContext(db: SupabaseClient, uid: string, toolName: (id: string) => string): Promise<CustomerCtx> {
  const [{ data: kit }, { data: jobs }, { data: prof }] = await Promise.all([
    db.from("brand_kits").select("business_name,industry,handle,instagram,website,about,colors,font,identity,content_plan,plan_prefs").eq("user_id", uid).maybeSingle(),
    db.from("jobs").select("id,tool_id,title,status,error,credits_charged,refunded,created_at,input").eq("user_id", uid).not("tool_id", "in", "(brand-identity,brand-plan)").order("created_at", { ascending: false }).limit(20),
    db.from("profiles").select("credits").eq("id", uid).maybeSingle(),
  ]);
  const lines: string[] = [];
  if (kit) {
    const id = obj(kit.identity);
    const idBits = Object.entries(id).filter(([, v]) => typeof v === "string" && (v as string).length < 220).slice(0, 6).map(([k, v]) => `${clean(k, 20)}: ${clean(v, 160)}`).join(" | ");
    lines.push("هوية العميل التجارية:",
      `- الاسم: ${clean(kit.business_name, 80)} | النشاط: ${clean(String(kit.industry ?? "").replace(/^custom:/, ""), 80)} | الحساب: ${clean(kit.handle || kit.instagram, 60)} | الموقع: ${clean(kit.website, 80)}`,
      `- نبذة: ${clean(kit.about, 400)}`,
      `- ألوان: ${arr(kit.colors).map((c) => clean(c, 9)).join(" ")} | خط: ${clean(kit.font, 30)}`,
      ...(idBits ? [`- الهوية المعتمدة: ${idBits}`] : []));
    const plan = obj(kit.content_plan);
    const items = arr(plan.items).slice(0, 26).map((raw) => {
      const x = obj(raw);
      return `  • أسبوع ${Number(x.week) || "?"} ${clean(x.day, 10)} ${clean(x.date, 12)} | ${clean(x.format, 10)} | ${clean(x.topic, 110)}${x.job ? " (مجهّز)" : ""}`;
    });
    if (items.length) lines.push(`خطة المحتوى (${clean(plan.month, 30)}):`, ...items);
  } else lines.push("العميل ما سوّى هوية تجارية بعد.");

  const jl = (jobs ?? []).map((j) => {
    const inp = obj(j.input);
    const spec = obj(inp.spec);
    const slides = arr(spec.slides).slice(0, 8).map((s) => { const o = obj(s); return clean(`${o.title ?? ""} ${o.body ?? ""}`, 90); }).filter(Boolean);
    const scenes = arr(spec.segments).slice(0, 8).map((s) => { const o = obj(s); return clean(o.text ?? o.title ?? o.say ?? "", 80); }).filter(Boolean);
    const brief = clean(inp.topic ?? inp.info ?? inp.idea ?? "", 220);
    const cap = clean(inp.caption ?? spec.caption ?? "", 220);
    return [
      `- [${clean(j.id, 40)}] ${String(j.created_at).slice(0, 10)} | ${clean(toolName(String(j.tool_id)), 40)} | ${clean(j.status, 12)}${j.refunded ? " (رجعت الريش)" : ""} | ${Number(j.credits_charged) || 0} ريشة | «${clean(j.title, 80)}»`,
      brief && `    الطلب: ${brief}`,
      slides.length ? `    الشرائح: ${slides.join(" ‖ ")}` : "",
      scenes.length ? `    المشاهد: ${scenes.join(" ‖ ")}` : "",
      cap && `    الكابشن: ${cap}`,
      j.error ? `    سبب الفشل: ${clean(j.error, 160)}` : "",
    ].filter(Boolean).join("\n");
  });
  lines.push(jl.length ? "آخر أعماله وطلباته (الأحدث أولاً):" : "ما عنده أعمال بعد.", ...jl);
  return { block: lines.join("\n"), credits: Number(prof?.credits) || 0, prefs: obj(kit?.plan_prefs) };
}
