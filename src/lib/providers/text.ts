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
export async function aiChat(purpose: Purpose, system: string, messages: ChatMsg[], maxTokens = 1200) {
  const { provider, model } = await choice(purpose);
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

export async function aiJson<T>(system: string, user: string, maxTokens = 1500): Promise<T> {
  const text = await aiChat("copy", `${system}\nأجب بـ JSON صالح فقط بدون أي نص آخر.`, [{ role: "user", content: user }], maxTokens);
  const a = text.indexOf("["), o = text.indexOf("{");
  const s = a === -1 ? o : o === -1 ? a : Math.min(a, o);
  return JSON.parse(text.slice(s, Math.max(text.lastIndexOf("]"), text.lastIndexOf("}")) + 1)) as T;
}
