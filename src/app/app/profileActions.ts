"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";

type Res = { ok?: boolean; error?: string } | undefined;

/** «كمّل بياناتك»: name + WhatsApp number, required once for every account. */
export async function saveContactInfo(_prev: Res, form: FormData): Promise<Res> {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return { error: "سجّل دخولك." };
  const name = String(form.get("full_name") || "").trim().slice(0, 80);
  const phone = normalizePhone(String(form.get("phone") || ""));
  if (name.length < 2) return { error: "اكتب اسمك." };
  if (!phone) return { error: "اكتب رقم واتساب صحيح، مثل 50000000 أو ‎+96550000000." };
  await createAdminClient().from("profiles").update({ full_name: name, phone }).eq("id", user.id);
  revalidatePath("/app", "layout");
  return { ok: true };
}
