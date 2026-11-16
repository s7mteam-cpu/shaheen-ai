"use server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { SHOWCASE_CATS } from "@/lib/showcase";

type Res = { ok?: string; error?: string } | undefined;
const CATS = new Set(SHOWCASE_CATS.map((c) => c[0]));
const site = (u: unknown) => typeof u === "string" && /^https:\/\/[^/]+\/storage\/v1\/object\/public\/site\/gallery\//.test(u);
/** Empty = follow the normal order. */
const homeOrder = (f: FormData) => { const v = String(f.get("home_order") ?? "").trim(); return v === "" || Number.isNaN(Number(v)) ? null : Number(v); };
const done = () => { revalidatePath("/admin/gallery"); revalidatePath("/app/showcase"); revalidatePath("/", "layout"); };

/** A new work in «معرض شاهين»: files were uploaded straight to storage; this saves the item (first file = cover). */
export async function addShowcase(_p: Res, form: FormData): Promise<Res> {
  if (!(await requireAdmin("gallery"))) return { error: "غير مصرّح" };
  const urls = form.getAll("url").map(String).filter(site);
  const kinds = form.getAll("kind").map(String);
  if (!urls.length) return { error: "ارفع صورة أو فيديو أول." };
  const category = String(form.get("category") ?? "design");
  const row = {
    title: String(form.get("title") ?? "").trim().slice(0, 120) || "عمل من شاهين",
    description: String(form.get("description") ?? "").trim().slice(0, 600),
    category: CATS.has(category) ? category : "other",
    media_url: urls[0], media_type: kinds[0] === "video" ? "video" : "image",
    extra_media: urls.slice(1, 20),
    in_app: form.get("in_app") === "on", on_home: form.get("on_home") === "on",
    sort_order: Number(form.get("sort_order")) || 0, home_order: homeOrder(form), is_published: true,
  };
  const { error } = await createAdminClient().from("gallery_items").insert(row);
  if (error) return { error: "ما انحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v83." };
  done();
  return { ok: "انضاف ✓" };
}

export async function updateShowcase(_p: Res, form: FormData): Promise<Res> {
  if (!(await requireAdmin("gallery"))) return { error: "غير مصرّح" };
  const id = String(form.get("id") ?? "");
  const admin = createAdminClient();
  if (form.get("delete") === "1") {
    const { data } = await admin.from("gallery_items").select("media_url,extra_media").eq("id", id).maybeSingle();
    await admin.from("gallery_items").delete().eq("id", id);
    const files = [data?.media_url, ...((data?.extra_media as string[] | null) ?? [])].filter(site).map((u) => String(u).split("/site/")[1]);
    if (files.length) await admin.storage.from("site").remove(files);
    done();
    return { ok: "انحذف." };
  }
  const category = String(form.get("category") ?? "design");
  const { error } = await admin.from("gallery_items").update({
    title: String(form.get("title") ?? "").trim().slice(0, 120), description: String(form.get("description") ?? "").trim().slice(0, 600),
    category: CATS.has(category) ? category : "other", sort_order: Number(form.get("sort_order")) || 0, home_order: homeOrder(form),
    is_published: form.get("is_published") === "on", in_app: form.get("in_app") === "on", on_home: form.get("on_home") === "on",
  }).eq("id", id);
  if (error) return { error: "ما انحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v83." };
  done();
  return { ok: "انحفظ ✓" };
}

/** One section's order, visibility and texts (shown on its public page). */
export async function saveSection(_p: Res, form: FormData): Promise<Res> {
  if (!(await requireAdmin("gallery"))) return { error: "غير مصرّح" };
  const cat = String(form.get("cat") ?? "");
  if (!CATS.has(cat)) return { error: "قسم غير معروف" };
  const clean = (k: string, max: number) => String(form.get(k) ?? "").split("\n").map((l) => l.trim()).filter(Boolean).join("\n").slice(0, max);
  const { error } = await createAdminClient().from("showcase_sections").upsert({
    cat, cover_id: String(form.get("cover_id") ?? "").match(/^[0-9a-f-]{36}$/i) ? String(form.get("cover_id")) : null, sort_order: Number(form.get("sort_order")) || 0, hidden: form.get("hidden") === "on",
    intro: String(form.get("intro") ?? "").trim().slice(0, 400), steps: clean("steps", 1200), features: clean("features", 1200), updated_at: new Date().toISOString(),
  });
  if (error) return { error: "ما انحفظ. تأكد إنك شغّلت ملف SQL الخاص بالتحديث v88." };
  done();
  revalidatePath("/showcase/[cat]", "page");
  return { ok: "انحفظ ✓" };
}
