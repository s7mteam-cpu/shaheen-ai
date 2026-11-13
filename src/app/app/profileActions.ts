"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phone";
import { serverT } from "@/lib/server/lang";

type Res = { ok?: boolean; error?: string } | undefined;

/** «كمّل بياناتك»: name + WhatsApp number, required once for every account. */
export async function saveContactInfo(_prev: Res, form: FormData): Promise<Res> {
  const T = await serverT();
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return { error: T("سجّل دخولك.", "Please sign in.") };
  const name = String(form.get("full_name") || "").trim().slice(0, 80);
  const country = /^[A-Z]{2}$/.test(String(form.get("country"))) ? String(form.get("country")) : "KW";
  const phone = normalizePhone(String(form.get("phone") || ""), country === "XX" ? null : country);
  if (name.length < 2) return { error: T("اكتب اسمك.", "Please enter your name.") };
  if (!phone) return { error: T("اكتب رقم واتساب صحيح مع مفتاح الدولة، مثل ‎+96550000000.", "Enter a valid WhatsApp number with the country code, e.g. +96550000000.") };
  await createAdminClient().from("profiles").update({ full_name: name, phone, country }).eq("id", user.id);
  revalidatePath("/app", "layout");
  return { ok: true };
}
