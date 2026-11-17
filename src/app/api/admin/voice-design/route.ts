import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ARAB_DIALECTS } from "@/lib/countries";
import { defaultContent } from "@/lib/defaults";
import { designVoice, saveDesignedVoice } from "@/lib/providers/elevenlabs";

export const maxDuration = 120;

const GENDER = { m: "male", f: "female" } as const;
const AGE = { young: "young adult in their 20s", adult: "middle-aged adult in their 30s to 40s", senior: "older adult in their 60s" } as const;
const TONE: Record<string, string> = { calm: "calm, clear and reassuring", energetic: "energetic, excited and upbeat", formal: "formal, professional and serious", warm: "warm, friendly and welcoming" };

/** The English prompt the voice designer understands, built from the admin's choices. */
function prompt(b: { dialect: string; gender: string; age: string; tone: string; extra?: string }) {
  const d = ARAB_DIALECTS.find((x) => x[0] === b.dialect)?.[2] ?? "Gulf";
  return `A ${GENDER[b.gender as "m" | "f"] ?? "male"} native Arabic speaker with an authentic ${d} Arabic dialect and accent, ${AGE[b.age as keyof typeof AGE] ?? AGE.adult}. ${TONE[b.tone] ?? TONE.calm} delivery, natural and clear, suitable for advertising and explainer videos.${b.extra ? ` ${String(b.extra).slice(0, 300)}` : ""}`;
}

export async function POST(req: Request) {
  const admin = await requireAdmin("voices");
  if (!admin) return NextResponse.json({ error: "غير مصرّح." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const dialect = ARAB_DIALECTS.some((x) => x[0] === b.dialect) ? String(b.dialect) : "gulf";
  const gender = b.gender === "f" ? "f" : "m";
  const age = b.age === "young" || b.age === "senior" ? String(b.age) : "adult";
  const tone = String(b.tone ?? "calm");
  try {
    if (b.action === "design") {
      const previews = await designVoice(prompt({ dialect, gender, age, tone, extra: String(b.extra ?? "") }), String(b.text ?? ""));
      if (!previews.length) return NextResponse.json({ error: "ما رجع أي صوت." }, { status: 502 });
      return NextResponse.json({ previews });
    }
    if (b.action === "save") {
      const name = String(b.name ?? "").trim().slice(0, 60) || `صوت ${ARAB_DIALECTS.find((x) => x[0] === dialect)?.[1]}`;
      const id = await saveDesignedVoice(name, prompt({ dialect, gender, age, tone, extra: String(b.extra ?? "") }), String(b.generated_id ?? ""));
      const db = createAdminClient();
      const cur = await db.from("site_content").select("value").eq("key", "voices").maybeSingle();
      const items = ((cur.data?.value as { items?: unknown[] } | null)?.items ?? defaultContent.voices.items) as Record<string, unknown>[];
      const note = `${ARAB_DIALECTS.find((x) => x[0] === dialect)?.[1]} · ${gender === "f" ? "نسائي" : "رجالي"}`;
      await db.from("site_content").upsert({ key: "voices", value: { items: [...items, { id, name, note, gender, age, dialects: [dialect] }] }, updated_at: new Date().toISOString() });
      return NextResponse.json({ ok: true, id });
    }
    return NextResponse.json({ error: "طلب غير معروف." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message.slice(0, 300) : "صار خطأ." }, { status: 500 });
  }
}
