// «مهارات الأدوات»: extra design guidance the admin writes per tool in the admin panel (private table admin_secrets, key "ai_skills").
// It is TEXT the model reads (rules, taste, example markup as a reference). It never runs as code, and every design still passes the same safety checks.
// Read at most once every 30 seconds; a missing or broken value changes nothing.
import { createClient } from "@supabase/supabase-js";

let db = null, cache = { at: 0, map: {} };
export async function skillFor(toolId) {
  if (Date.now() - cache.at >= 30_000) {
    try {
      if (!db && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      const { data } = db ? await db.from("admin_secrets").select("value").eq("key", "ai_skills").maybeSingle() : { data: null };
      const v = data?.value && typeof data.value === "object" ? data.value : {};
      cache = { at: Date.now(), map: Object.fromEntries(Object.entries(v).filter(([k, x]) => /^[a-z0-9-]{1,40}$/.test(k) && typeof x?.text === "string" && x.on !== false).map(([k, x]) => [k, x.text.slice(0, 8000).trim()])) };
    } catch { cache = { at: Date.now(), map: cache.map }; }
  }
  return cache.map[toolId] || "";
}
/** how the guidance is handed to the model: clearly below the platform's own rules */
export function skillNote(text) {
  return text ? `\n\nإرشادات إضافية من إدارة المنصة لهذه الأداة (ذوق وأسلوب وأمثلة مرجعية؛ التزم بها ما لم تتعارض مع القواعد أعلاه، فقواعد البنية والأمان أعلاه هي الأقوى دائماً، وأي كود هنا مرجع للأسلوب فقط لا يُنسخ كما هو):\n<<<\n${text}\n>>>` : "";
}
