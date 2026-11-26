"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { guardContent } from "@/lib/server/moderation";
import { cleanMine, type Mine } from "@/lib/mine";

/** «تعليماتي»: saved inside brand_kits.plan_prefs.mine (no SQL). The text passes the same content filter as everything else he writes. */
export async function saveMine(input: Mine): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "سجّل دخولك أول." };
  const mine = cleanMine(input);
  const all = [...mine.notes, ...mine.skills.map((s) => `${s.title}\n${s.text}`)].join("\n");
  if (all && (await guardContent(user.id, { idea: all }, "my-instructions"))) return { ok: false, error: "في نص ما نقدر نقبله. عدّله وجرب مرة ثانية." };
  const { data: old } = await supabase.from("brand_kits").select("plan_prefs").eq("user_id", user.id).maybeSingle();
  if (!old) return { ok: false, error: "احفظ هويتك التجارية أول، وبعدها ارجع هنا." };
  const { error } = await supabase.from("brand_kits").update({ plan_prefs: { ...((old.plan_prefs as object) ?? {}), mine } }).eq("user_id", user.id);
  if (error) return { ok: false, error: "ما انحفظت. جرب مرة ثانية." };
  revalidatePath("/app/brand/mine");
  return { ok: true };
}
