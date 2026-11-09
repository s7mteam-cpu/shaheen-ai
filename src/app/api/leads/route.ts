import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dbReady } from "@/lib/data";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { name?: string; phone?: string; message?: string; source?: string; website?: string };
  if (b.website) return NextResponse.json({ ok: true }); // honeypot for bots
  const name = (b.name ?? "").trim().slice(0, 80);
  const phone = (b.phone ?? "").replace(/[^\d+ ]/g, "").trim().slice(0, 25);
  if (!name || phone.replace(/\D/g, "").length < 7) return NextResponse.json({ error: "اكتب الاسم ورقم صحيح." }, { status: 400 });
  if (!dbReady()) return NextResponse.json({ ok: true });
  const { data: { user } } = await (await createClient()).auth.getUser();
  const { error } = await createAdminClient().from("leads").insert({
    name, phone, message: (b.message ?? "").slice(0, 1000), source: (b.source ?? "managed_service").slice(0, 40), user_id: user?.id ?? null,
  });
  if (error) return NextResponse.json({ error: "تعذّر الإرسال، جرّب الواتساب." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
