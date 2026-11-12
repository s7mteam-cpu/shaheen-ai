import "server-only";
import { NextResponse } from "next/server";
import { aiJson } from "@/lib/providers/text";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * «سياسة المحتوى»: no sexual / indecent / immoral content on Shaheen — ever.
 * 1) a quick word list (free, instant), 2) a small AI check (Claude Haiku) on the request text.
 * The image / video providers have their own safety filters too; this stops the request before any credit is spent.
 * If the AI check itself fails (network), the request goes on — the providers' filters still apply.
 */
const KEYS = ["prompt", "instruction", "text", "topic", "brief", "idea", "q", "title", "description", "sub", "name"];
const WORDS = /(\bnude|\bnudity|\bnaked|\bporn|\bxxx\b|\bnsfw\b|\bsexy\b|\bsexual|\berotic|\blingerie|\bbikini|\bstrip(?:per|tease)|\bhentai|\bonlyfans|\bboobs?\b|\bnipple|\btopless|عاري|عارية|عراة|إباحي|اباحي|جنسي|جنسية|سكس|مثير[ةه]? جنسي|ملابس داخلية|لانجري|بكيني|تعري|عري\b|شبه عاري|إغراء|اغراء)/i;

function collect(v: unknown, out: string[], depth = 0) {
  if (depth > 3 || out.join(" ").length > 4000) return;
  if (typeof v === "string") { if (v.trim().length > 1 && !/^https?:\/\//.test(v)) out.push(v.trim()); return; }
  if (Array.isArray(v)) { v.slice(0, 20).forEach((x) => collect(x, out, depth + 1)); return; }
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (KEYS.includes(k) || k === "input" || typeof x !== "object") collect(x, out, depth + 1);
}

/** Returns a ready 400 response when the request breaks the content policy, otherwise null. */
export async function guardContent(userId: string, body: unknown, where: string): Promise<NextResponse | null> {
  const parts: string[] = [];
  collect(body, parts);
  const text = parts.join("\n").slice(0, 4000);
  if (text.length < 3) return null;
  let why = WORDS.test(text) ? "word" : "";
  if (!why) {
    try {
      const r = await aiJson<{ ok?: boolean; why?: string }>(
        `You are the content-safety checker of Shaheen, an Arabic business content platform in Kuwait (ads, posts, product photos, educational and Islamic videos).
Decide if the user's request asks for content that is NOT allowed. Not allowed: nudity, sexual or erotic content, sexually suggestive poses or clothing (lingerie, swimwear focus, seductive), any sexual content involving minors, pornography, sexual services, gambling, alcohol or drug promotion, graphic gore, hate or insults against religions, mocking religion, or content against public morals in Kuwait.
Allowed: normal business marketing, fashion and abayas, beauty and salons (non-sexual), gyms, clinics in medical terms, food, real estate, education, Quran and Islamic content, children's products shown appropriately.
Answer JSON only: {"ok": true} or {"ok": false, "why": "short reason in Arabic"}.`,
        text, 120, { provider: "claude", model: "claude-haiku-5-5" });
      if (r && r.ok === false) why = String(r.why ?? "").slice(0, 120) || "ai";
    } catch { /* checker unavailable → providers' own filters still apply */ }
  }
  if (!why) return null;
  // let the admins know (bell), without storing the full request text
  const admin = createAdminClient();
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
  if (admins?.length) {
    await admin.from("notifications").insert(admins.map((a) => ({
      user_id: a.id, kind: "warn", title: "⚠️ طلب محتوى مخالف انمنع",
      body: `أداة: ${where}${why !== "word" && why !== "ai" ? ` — ${why}` : ""}`, link: `/admin/customers?id=${userId}#manage`,
    }))).then(() => null, () => null);
  }
  return NextResponse.json({ error: "هذا الطلب مخالف لسياسة المحتوى في شاهين (محتوى غير أخلاقي أو غير لائق)، وما نقدر ننفذه. تكرار المحاولة ممكن يوقف الحساب. اطّلع على «سياسة المحتوى» بأسفل الموقع." }, { status: 400 });
}
