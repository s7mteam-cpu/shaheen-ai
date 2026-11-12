import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { dbReady } from "@/lib/data";

// simple flood guard per server instance: 5 requests / 10 minutes per IP
const hits = new Map<string, number[]>();
function flooded(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 5;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";
  if (flooded(ip)) return NextResponse.json({ error: "طلبات كثيرة، جرّب بعد شوي أو راسلنا واتساب." }, { status: 429 });
  const b = (await req.json().catch(() => ({}))) as { name?: string; phone?: string; message?: string; source?: string; website?: string };
  if (b.website) return NextResponse.json({ ok: true }); // honeypot for bots
  const name = (b.name ?? "").trim().slice(0, 80);
  const phone = (b.phone ?? "").replace(/[^\d+ ]/g, "").trim().slice(0, 25);
  if (!name || phone.replace(/\D/g, "").length < 7) return NextResponse.json({ error: "اكتب الاسم ورقم صحيح." }, { status: 400 });
  if (!dbReady()) return NextResponse.json({ ok: true });
  const { data: { user } } = await (await createClient()).auth.getUser();
  // the same number can't flood the admins' bell: max 3 requests a day
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await createAdminClient().from("leads").select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", since);
  if ((count ?? 0) >= 3) return NextResponse.json({ ok: true });
  const { error } = await createAdminClient().from("leads").insert({
    name, phone, message: (b.message ?? "").slice(0, 1000), source: (b.source ?? "managed_service").slice(0, 40), user_id: user?.id ?? null,
  });
  if (error) return NextResponse.json({ error: "تعذّر الإرسال، جرّب الواتساب." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
