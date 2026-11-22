/** «مهارات الأدوات»: per-tool guidance written by the admin (private: table admin_secrets, key "ai_skills"). Text only: rules, taste, and example markup as a style reference. */
export const SKILL_TOOLS = ["free-post", "free-carousel", "free-ad", "free-invite", "free-card", "free-deck", "free-cv", "free-motion", "site-free", "anim-video"] as const;
export const SKILL_MAX = 8000;
export type Skill = { text: string; on: boolean; at: string };
export type Skills = Record<string, Skill>;

export function cleanSkills(v: unknown): Skills {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, { text?: unknown; on?: unknown; at?: unknown }>;
  const out: Skills = {};
  for (const id of SKILL_TOOLS) {
    const x = o[id]; if (!x || typeof x.text !== "string") continue;
    // control characters out; everything else is kept as written (Arabic, English, markup): it is only ever read by the model as text
    const text = x.text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, SKILL_MAX).trim();
    if (text) out[id] = { text, on: x.on !== false, at: typeof x.at === "string" ? x.at.slice(0, 30) : "" };
  }
  return out;
}
