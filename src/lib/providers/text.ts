import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultContent } from "@/lib/defaults";
import { geminiText } from "@/lib/providers/google";

export type ChatMsg = { role: "user" | "assistant"; content: string };
type Purpose = "copy" | "chat";

async function choice(purpose: Purpose) {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "ai").maybeSingle();
  const ai = { ...defaultContent.ai, ...((data?.value as object) ?? {}) };
  return purpose === "chat" ? { provider: ai.chat_provider, model: ai.chat_model } : { provider: ai.copy_provider, model: ai.copy_model };
}

/** One entry point for all text AI. The admin chooses Claude or Gemini (and the model) in /admin/content → ai. */
export async function aiChat(purpose: Purpose | { provider: string; model: string }, system: string, messages: ChatMsg[], maxTokens = 1200) {
  const { provider, model } = typeof purpose === "string" ? await choice(purpose) : purpose;
  if (provider === "gemini") {
    return geminiText(model || "gemini-2.5-flash", system, messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })), maxTokens);
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: model || "claude-haiku-5-5", max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content: { text?: string }[] };
  return data.content.map((c) => c.text ?? "").join("").trim();
}

/** Rewrites any Arabic (heavy dialect spelling included) into clear "white Gulf" that voices read smoothly. Falls back to the original text. */
export const SPEECH_PROMPT = `أنت محرر نصوص للتعليق الصوتي بالذكاء الاصطناعي. جهّز النص عشان الصوت ينطقه بسلاسة، وحافظ على لهجة الكاتب:
- إذا النص فصحى: خلّه فصحى، وصحّح الإملاء والترقيم فقط.
- إذا النص لهجة (كويتية أو خليجية أو غيرها): خلّه بنفس اللهجة والكلمات، لكن اكتبه بإملاء "أبيض" واضح قريب من الفصحى: كاف المخاطبة "ك" وليس "ج" أو "چ" (ذوقك، عبايتك)، والكلمات الصعبة الكتابة بأقرب شكل مقروء (ويانا ← ويّانا).
- نفس المعنى والطول تقريباً، بدون إضافة أو حذف معلومات.
- فقرة واحدة بجمل قصيرة، فواصل ونقاط فقط، بدون نقاط ثلاث أو أسطر جديدة أو رموز أو إيموجي.
- الأرقام بالحروف. شكّل فقط الكلمات اللي ممكن تنقرأ غلط (مثل: تميّزك).
أعد النص فقط بدون أي شرح.`;

export async function speechReady(text: string) {
  const t = text.trim();
  if (!t) return t;
  try {
    const out = await aiChat({ provider: "claude", model: "claude-haiku-5-5" }, SPEECH_PROMPT, [{ role: "user", content: t }], 1500);
    return out.trim().slice(0, 2500) || t;
  } catch (e) { console.error("speechReady", e); return t; }
}

export async function aiJson<T>(system: string, user: string, maxTokens = 1500, via?: { provider: string; model: string }): Promise<T> {
  const text = await aiChat(via ?? "copy", `${system}\nأجب بـ JSON صالح فقط بدون أي نص آخر.`, [{ role: "user", content: user }], maxTokens);
  const a = text.indexOf("["), o = text.indexOf("{");
  const s = a === -1 ? o : o === -1 ? a : Math.min(a, o);
  return JSON.parse(text.slice(s, Math.max(text.lastIndexOf("]"), text.lastIndexOf("}")) + 1)) as T;
}
