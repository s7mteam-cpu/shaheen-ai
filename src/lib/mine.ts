/** «تعليماتي»: the customer's own guidance (stored in brand_kits.plan_prefs.mine, no SQL). It rides along with every job of his, BELOW the platform's rules:
 *  size, safety and the limits of sensitive fields stay stronger. He can write instructions, switch off some of the platform's skills for his account, and add skills of his own. */
import { SKILLS, SKILL_SCOPES, type SkillScope } from "@/lib/team";

export const MINE_NOTES = 10, MINE_SKILLS = 10, MINE_LEN = 400;
/** skills the customer cannot switch off (they keep every output readable and within the platform's specs) */
export const LOCKED_SKILLS = ["typography", "platform-specs"];
export type MineSkill = { id: string; title: string; text: string; scopes: SkillScope[]; on: boolean };
export type Mine = { notes: string[]; off: string[]; skills: MineSkill[] };

const txt = (v: unknown, max = MINE_LEN) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​-‏‪-‮⁠-⁤﻿<>]/g, "").trim().slice(0, max) : "");

export function cleanMine(v: unknown): Mine {
  const o = (v && typeof v === "object" ? v : {}) as Partial<Record<keyof Mine, unknown>>;
  const notes = (Array.isArray(o.notes) ? o.notes : []).map((x) => txt(x)).filter(Boolean).slice(0, MINE_NOTES);
  const off = (Array.isArray(o.off) ? o.off : []).filter((x): x is string => typeof x === "string" && SKILLS.some((s) => s.id === x) && !LOCKED_SKILLS.includes(x));
  const skills = (Array.isArray(o.skills) ? o.skills : []).slice(0, MINE_SKILLS).map((x, i) => {
    const s = (x ?? {}) as Partial<MineSkill>;
    const text = txt(s.text), scopes = (Array.isArray(s.scopes) ? s.scopes : []).filter((k): k is SkillScope => SKILL_SCOPES.some(([id]) => id === k));
    return { id: `m${i}`, title: txt(s.title, 60) || "مهارتي", text, scopes: scopes.length ? scopes : SKILL_SCOPES.map(([id]) => id), on: s.on !== false };
  }).filter((s) => s.text);
  return { notes, off: [...new Set(off)], skills };
}

/** the block added to a job's instructions; empty when he wrote nothing */
export function mineBlock(raw: unknown, scope: string): string {
  const m = cleanMine(raw);
  const own = m.skills.filter((s) => s.on && s.scopes.includes(scope as SkillScope));
  if (!m.notes.length && !own.length) return "";
  return `تعليمات العميل (تفضيلاته؛ طبّقها ما لم تتعارض مع قواعد المنصة والأمان وحدود المجال، فهذي أقوى منها):\n${[...m.notes.map((n) => `• ${n}`), ...own.map((s) => `• ${s.title}: ${s.text}`)].join("\n")}`;
}
