import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultContent } from "@/lib/defaults";
import { geminiText } from "@/lib/providers/google";
import { textProviders } from "@/lib/providers/registry";

export type ChatMsg = { role: "user" | "assistant"; content: string };
type Purpose = "copy" | "chat";

async function choice(purpose: Purpose) {
  const { data } = await createAdminClient().from("site_content").select("value").eq("key", "ai").maybeSingle();
  const ai = { ...defaultContent.ai, ...((data?.value as object) ?? {}) };
  return purpose === "chat" ? { provider: ai.chat_provider, model: ai.chat_model } : { provider: ai.copy_provider, model: ai.copy_model };
}

/**
 * Prompt caching: long fixed instructions (playbook, packs, scene list…) are kept by Claude for 5 minutes,
 * so the next request reads them at ~10% of the price. Short prompts are sent as they are (nothing to save).
 */
export const cachedSystem = (system: string) =>
  system.length > 6000 ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] : system;

/** One entry point for all text AI. The admin chooses Claude or Gemini (and the model) in /admin/content → ai. */
export async function aiChat(purpose: Purpose | { provider: string; model: string }, system: string, messages: ChatMsg[], maxTokens = 1200) {
  const picked = typeof purpose === "string" ? await choice(purpose) : purpose;
  const provider = picked.provider;
  // A model name left over from the other provider (e.g. «claude-haiku-5-5» after switching to Gemini) → that provider's default
  const model = picked.model && picked.model.trim().toLowerCase().startsWith(provider === "gemini" ? "gemini" : "claude") ? picked.model.trim() : (textProviders[provider as "claude"] ?? "");
  if (provider === "gemini") {
    const contents = messages.map((m) => ({ role: m.role === "assistant" ? ("model" as const) : ("user" as const), parts: [{ text: m.content }] }));
    const def = textProviders.gemini ?? "gemini-3.8-flash";
    try {
      return await geminiText(model || def, system, contents, maxTokens);
    } catch (e) {
      // Google retires model names (e.g. 2.5 Flash for new accounts) → fall back to the current default instead of failing
      if (model && model !== def && /google 40[04]/.test(String(e))) return geminiText(def, system, contents, maxTokens);
      throw e;
    }
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: model || "claude-haiku-5-5", max_tokens: maxTokens, system: cachedSystem(system), messages }),
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

/** Claude with images (style references, the customer's photos). Images are passed by URL; returns parsed JSON. */
export async function claudeVisionJson<T>(system: string, text: string, images: { url: string; label: string }[], maxTokens = 8000, model = "claude-sonnet-5-5"): Promise<T> {
  const content: unknown[] = [];
  for (const im of images) { content.push({ type: "text", text: im.label }); content.push({ type: "image", source: { type: "url", url: im.url } }); }
  content.push({ type: "text", text });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: cachedSystem(`${system}\nأجب بـ JSON صالح فقط بدون أي نص آخر.`), messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content: { text?: string }[] };
  const out = data.content.map((c) => c.text ?? "").join("");
  const o = out.indexOf("{");
  return JSON.parse(out.slice(o, out.lastIndexOf("}") + 1)) as T;
}
