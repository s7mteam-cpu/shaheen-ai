import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasArabic, type Lang } from "@/lib/i18n";

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

const PROMPT = `You translate the Arabic texts of «Shaheen» (شاهين), a Kuwaiti AI content platform, into natural, professional English for its website.
- Translate the meaning, not word by word. Kuwaiti/Gulf dialect must become proper professional English (as if translating clear Modern Standard Arabic).
- Keep it short and natural like a modern SaaS website. Keep numbers, emojis, «», URLs and placeholders like {email} exactly.
- Fixed terms: شاهين = Shaheen · ريشة/ريش = credits (a "feather" credit; say "credits") · د.ك = KWD · كي نت = KNET · باقة = plan.
Return ONLY a JSON array of strings, same length and order as the input.`;

async function translateBatch(texts: string[]): Promise<string[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-5-5", max_tokens: 8000, system: PROMPT, messages: [{ role: "user", content: JSON.stringify(texts) }] }),
  });
  if (!res.ok) throw new Error(`translate ${res.status}`);
  const data = (await res.json()) as { content: { text?: string }[] };
  const raw = data.content.map((c) => c.text ?? "").join("");
  const arr = JSON.parse(raw.slice(raw.indexOf("["), raw.lastIndexOf("]") + 1)) as string[];
  if (!Array.isArray(arr) || arr.length !== texts.length) throw new Error("translate: bad length");
  return arr.map(String);
}

/** Arabic → English for many texts at once: saved translations first, AI only for new texts (then saved). Never throws: falls back to Arabic. */
export async function translateMany(texts: string[], lang: Lang): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (lang === "ar" || !process.env.ANTHROPIC_API_KEY) return out;
  const unique = [...new Set(texts.filter((t) => t && hasArabic(t)))];
  if (!unique.length) return out;
  const admin = createAdminClient();
  const hashes = unique.map(md5);
  try {
    for (let i = 0; i < hashes.length; i += 300) {
      const { data, error } = await admin.from("translations").select("src_hash,text").eq("lang", lang).in("src_hash", hashes.slice(i, i + 300));
      if (error) return out;   // table not created yet (run the v32 SQL) → stay Arabic, never pay for the same translation twice
      const byHash = new Map((data ?? []).map((r) => [r.src_hash, r.text]));
      unique.slice(i, i + 300).forEach((t, j) => { const v = byHash.get(hashes[i + j]); if (v) out.set(t, v); });
    }
    const missing = unique.filter((t) => !out.has(t));
    const chunks: string[][] = [];
    for (let i = 0; i < missing.length; i += 40) chunks.push(missing.slice(i, i + 40));
    // New texts are translated in parallel, once; every later visit reads them from the database.
    await Promise.all(chunks.map(async (chunk) => {
      try {
        const done = await translateBatch(chunk);
        chunk.forEach((t, j) => out.set(t, done[j]));
        await admin.from("translations").upsert(chunk.map((t, j) => ({ src_hash: md5(t), lang, src: t, text: done[j] })), { onConflict: "src_hash,lang", ignoreDuplicates: true });
      } catch (e) { console.error("translate chunk", e); }
    }));
  } catch (e) {
    console.error("translateMany", e);
  }
  return out;
}

function collect(v: unknown, acc: string[]) {
  if (typeof v === "string") { if (hasArabic(v)) acc.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => collect(x, acc));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => collect(x, acc));
}
function swap<T>(v: T, map: Map<string, string>): T {
  if (typeof v === "string") return (map.get(v) ?? v) as T;
  if (Array.isArray(v)) return v.map((x) => swap(x, map)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x, map)])) as T;
  return v;
}

/** Returns the same object with every Arabic text replaced by its English translation (when lang is "en"). */
export async function localize<T>(value: T, lang: Lang): Promise<T> {
  if (lang === "ar") return value;
  const texts: string[] = [];
  collect(value, texts);
  return swap(value, await translateMany(texts, lang));
}
