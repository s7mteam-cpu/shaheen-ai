import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/server/auth";
import { aiJson } from "@/lib/providers/text";
import { tooMany } from "@/lib/server/throttle";

/** "ألهمني": three ideas that fit the user's business. Free. */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
  if (tooMany(`inspire:${user.id}`, 12, 10 * 60_000)) return NextResponse.json({ error: "طلبات كثيرة، جرّب بعد شوي." }, { status: 429 });
  const tool = String(((await req.json().catch(() => null)) as { tool?: unknown } | null)?.tool ?? "");
  if (!/^[\w-]{1,60}$/.test(tool)) return NextResponse.json({ error: "أداة غير معروفة." }, { status: 400 });
  const admin = createAdminClient();
  const [{ data: p }, { data: b }, { data: t }] = await Promise.all([
    admin.from("profiles").select("instagram").eq("id", user.id).single(),
    admin.from("brand_kits").select("business_name").eq("user_id", user.id).maybeSingle(),
    admin.from("tools").select("name").eq("id", tool).single(),
  ]);
  try {
    const ideas = await aiJson<string[]>(
      "أنت خبير تسويق محتوى خليجي. اقترح أفكار محتوى عملية وقصيرة.",
      `الأداة: ${t?.name ?? tool}\nالنشاط: ${b?.business_name ?? "غير محدد"}\nإنستغرام: ${p?.instagram ?? "غير محدد"}\nاقترح 3 أفكار، كل فكرة جملة أو جملتين جاهزة تُكتب في خانة الوصف. أعد مصفوفة نصوص.`,
      600,
    );
    return NextResponse.json({ ideas: ideas.slice(0, 3) });
  } catch {
    return NextResponse.json({ error: "تعذّر جلب الأفكار الحين." }, { status: 500 });
  }
}
