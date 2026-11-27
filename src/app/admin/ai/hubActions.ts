"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { toolProviders } from "@/lib/providers/registry";

const PROVIDERS = ["claude", "gemini", "google", "elevenlabs", "fal"];
const done = () => { revalidatePath("/admin/ai"); revalidatePath("/admin/tools"); revalidatePath("/app/tools"); };

/** switch one tool on or off from the hub (the same switch as in «الأدوات والأسعار») */
export async function setToolEnabled(form: FormData) {
  const me = await requireAdmin("tools");
  if (!me) throw new Error("تشغيل وإيقاف الأدوات يحتاج صلاحية «الأدوات والأسعار».");
  const id = String(form.get("id") ?? "");
  if (!/^[\w-]{1,40}$/.test(id)) return;
  const on = form.get("on") === "1";
  await createAdminClient().from("tools").update({ is_enabled: on }).eq("id", id);
  await audit(me, on ? "tool_on" : "tool_off", undefined, id);
  done();
}

/** «زر الطوارئ»: stop every tool that runs on one provider, and remember which were on so they can be brought back together */
export async function pauseProvider(form: FormData) {
  const me = await requireAdmin("tools");
  if (!me) throw new Error("تشغيل وإيقاف الأدوات يحتاج صلاحية «الأدوات والأسعار».");
  const p = String(form.get("provider") ?? "");
  if (!PROVIDERS.includes(p)) return;
  const group = p === "google" || p === "gemini" ? ["google", "gemini"] : [p];
  const admin = createAdminClient();
  const { data: paused } = await admin.from("site_content").select("value").eq("key", "ai_paused").maybeSingle();
  const all = ((paused?.value ?? {}) as Record<string, string[]>);
  if (form.get("resume") === "1") {
    const ids = (all[p] ?? []).filter((x) => /^[\w-]{1,40}$/.test(x));
    if (ids.length) await admin.from("tools").update({ is_enabled: true }).in("id", ids);
    delete all[p];
    await admin.from("site_content").upsert({ key: "ai_paused", value: all, updated_at: new Date().toISOString() });
    await audit(me, "provider_resumed", undefined, `${p}: ${ids.join(", ")}`.slice(0, 300));
  } else {
    const { data: on } = await admin.from("tools").select("id").in("provider", group).eq("is_enabled", true);
    const ids = (on ?? []).map((t) => String(t.id));
    if (!ids.length) return;
    await admin.from("tools").update({ is_enabled: false }).in("id", ids);
    all[p] = [...new Set([...(all[p] ?? []), ...ids])];
    await admin.from("site_content").upsert({ key: "ai_paused", value: all, updated_at: new Date().toISOString() });
    await audit(me, "provider_paused", undefined, `${p}: ${ids.join(", ")}`.slice(0, 300));
  }
  done();
}

/** the provider and main model of one tool, chosen from the hub. Only a provider the tool really supports is accepted; an empty model = that provider's built-in one. */
export async function setToolAi(form: FormData) {
  const me = await requireAdmin("tools");
  if (!me) throw new Error("تغيير مزوّد الأداة يحتاج صلاحية «الأدوات والأسعار».");
  const id = String(form.get("id") ?? "");
  const allowed = Object.keys(toolProviders[id] ?? {});
  const provider = String(form.get("provider") ?? "");
  if (!allowed.includes(provider)) return;
  const model = String(form.get("model") ?? "").trim();
  if (model && (!/^[A-Za-z0-9][A-Za-z0-9._/:-]{1,89}$/.test(model) || model.includes("..") || model.includes("//"))) throw new Error("اسم النموذج غير صحيح.");
  await createAdminClient().from("tools").update({ provider, provider_model: model || null }).eq("id", id);
  await audit(me, "tool_ai_changed", undefined, `${id}: ${provider} / ${model || "الأصلي"}`);
  done();
}

/** the message a customer sees when this tool is off (site_content «tool_msgs»; empty = the default text, and the tool stays hidden from the list as before) */
export async function setToolMsg(form: FormData) {
  const me = await requireAdmin("tools");
  if (!me) throw new Error("تعديل رسالة الأداة يحتاج صلاحية «الأدوات والأسعار».");
  const id = String(form.get("id") ?? "");
  if (!/^[\w-]{1,40}$/.test(id)) return;
  const msg = String(form.get("msg") ?? "").replace(/[<>]/g, "").trim().slice(0, 200);
  const admin = createAdminClient();
  const { data } = await admin.from("site_content").select("value").eq("key", "tool_msgs").maybeSingle();
  const all = { ...((data?.value ?? {}) as Record<string, string>) };
  if (msg) all[id] = msg; else delete all[id];
  await admin.from("site_content").upsert({ key: "tool_msgs", value: all, updated_at: new Date().toISOString() });
  await audit(me, "tool_msg", undefined, id);
  done();
  revalidatePath("/app/tools");
}
