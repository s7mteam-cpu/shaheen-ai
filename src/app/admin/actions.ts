"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import type { SectionKey } from "@/lib/admin/sections";
import { textProviders, toolProviders } from "@/lib/providers/registry";
import { getL } from "@/lib/server/lang";

async function guard(section: SectionKey) {
  const L = await getL();
  const u = await requireAdmin(section);
  if (!u) throw new Error(L("غير مصرّح"));
  return u;
}
const refresh = () => revalidatePath("/", "layout");

export async function saveContent(key: string, value: unknown) {
  await guard("content");
  const { error } = await createAdminClient().from("site_content").upsert({ key, value, updated_at: new Date().toISOString() });
  refresh();
  return { ok: !error, error: error?.message };
}

export async function saveTool(form: FormData) {
  await guard("tools");
  const id = String(form.get("id"));
  const provider = String(form.get("provider") || "");
  const allowed = toolProviders[id] ?? {};
  await createAdminClient().from("tools").update({
    provider: provider in allowed ? provider : Object.keys(allowed)[0] ?? null,
    name: String(form.get("name")),
    description: String(form.get("description")),
    credit_cost: Math.max(0, Number(form.get("credit_cost")) || 0),
    edit_cost: Math.max(0, Number(form.get("edit_cost")) || 0),
    cost_unit: String(form.get("cost_unit")),
    provider_model: String(form.get("provider_model") || "") || null,
    icon: String(form.get("icon") || "sparkles"),
    sort_order: Number(form.get("sort_order")) || 0,
    is_enabled: form.get("is_enabled") === "on",
  }).eq("id", id);
  refresh();
}

export async function savePlan(form: FormData) {
  await guard("plans");
  const id = String(form.get("id")).trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!id) return;
  await createAdminClient().from("plans").upsert({
    id,
    name: String(form.get("name")),
    subtitle: String(form.get("subtitle") || ""),
    price_kwd: Number(form.get("price_kwd")) || 0,
    credits: Number(form.get("credits")) || 0,
    bonus_credits: Math.max(0, Number(form.get("bonus_credits")) || 0),
    features: String(form.get("features") || "").split("\n").map((s) => s.trim()).filter(Boolean),
    stripe_price_id: String(form.get("stripe_price_id") || "") || null,
    sort_order: Number(form.get("sort_order")) || 0,
    is_featured: form.get("is_featured") === "on",
    is_active: form.get("is_active") === "on",
  });
  refresh();
}

export async function refundJob(form: FormData) {
  await guard("jobs");
  await createAdminClient().rpc("refund_job", { p_job: String(form.get("job_id")) });
  revalidatePath("/admin/jobs");
}

export async function addGalleryItem(form: FormData) {
  await guard("gallery");
  const admin = createAdminClient();
  const file = form.get("file") as File | null;
  if (!file || !file.size) return;
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `gallery/${crypto.randomUUID()}.${ext}`;
  await admin.storage.from("site").upload(path, file, { contentType: file.type });
  const url = admin.storage.from("site").getPublicUrl(path).data.publicUrl;
  await admin.from("gallery_items").insert({
    title: String(form.get("title") || ""),
    media_url: url,
    media_type: file.type.startsWith("video") ? "video" : "image",
    sort_order: Number(form.get("sort_order")) || 0,
  });
  refresh();
}

export async function updateGalleryItem(form: FormData) {
  await guard("gallery");
  const id = String(form.get("id"));
  const admin = createAdminClient();
  if (form.get("delete") === "1") await admin.from("gallery_items").delete().eq("id", id);
  else await admin.from("gallery_items").update({ title: String(form.get("title")), sort_order: Number(form.get("sort_order")) || 0, is_published: form.get("is_published") === "on" }).eq("id", id);
  refresh();
}

/** Upload any site image (hero image etc.) and get its public URL. */
export async function uploadSiteImage(form: FormData) {
  await guard("content");
  const file = form.get("file") as File | null;
  if (!file || !file.size) return { url: "" };
  const admin = createAdminClient();
  const path = `media/${crypto.randomUUID()}.${(file.name.split(".").pop() || "bin").toLowerCase()}`;
  await admin.storage.from("site").upload(path, file, { contentType: file.type });
  return { url: admin.storage.from("site").getPublicUrl(path).data.publicUrl };
}

export async function setLeadStatus(form: FormData) {
  await guard("leads");
  await createAdminClient().from("leads").update({ status: String(form.get("status")) }).eq("id", String(form.get("id")));
  revalidatePath("/admin/leads");
}

export async function saveAi(form: FormData) {
  await guard("ai");
  const ok = (p: string) => (p in textProviders ? p : "claude");
  const value = {
    copy_provider: ok(String(form.get("copy_provider"))), copy_model: String(form.get("copy_model") || ""),
    chat_provider: ok(String(form.get("chat_provider"))), chat_model: String(form.get("chat_model") || ""),
  };
  await createAdminClient().from("site_content").upsert({ key: "ai", value, updated_at: new Date().toISOString() });
  refresh();
}
