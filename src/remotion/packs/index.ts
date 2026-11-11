/**
 * Industry packs — one file per field in this folder (restaurant.ts, perfume.ts…).
 * The AI works from the chosen field's pack first, and may borrow a few scenes from the
 * whole library when the content needs it (a gym talking about a healthy plate → «dish»).
 * The look (colours, board, transitions, music) always stays the field's own.
 */
import { INDUSTRIES } from "@/design/industries";
import type { GraphicKind } from "../montage";
import type { Draft, Pack } from "./types";
import education from "./education";
import coach from "./coach";
import teacher from "./teacher";
import kids from "./kids";
import restaurant from "./restaurant";
import cafe from "./cafe";
import sweets from "./sweets";
import tires from "./tires";
import garage from "./garage";
import carwash from "./carwash";
import contracting from "./contracting";
import realestate from "./realestate";
import interior from "./interior";
import abaya from "./abaya";
import salon from "./salon";
import perfume from "./perfume";
import jewelry from "./jewelry";
import clinic from "./clinic";
import gym from "./gym";
import nutrition from "./nutrition";
import store from "./store";
import electronics from "./electronics";
import tech from "./tech";
import cleaning from "./cleaning";
import travel from "./travel";
import law from "./law";
import events from "./events";
import photography from "./photography";
import other from "./other";

export type { Draft, Pack, Recipe } from "./types";

const FILES: Record<string, Draft> = { education, coach, teacher, kids, restaurant, cafe, sweets, tires, garage, carwash, contracting, realestate, interior, abaya, salon, perfume, jewelry, clinic, gym, nutrition, store, electronics, tech, cleaning, travel, law, events, photography, other };

/** Scenes every field may use freely (not counted as borrowing). */
export const GENERAL: GraphicKind[] = ["headline", "icon", "arrow", "scene", "text3d", "burst", "contact", "quote", "steps", "checklist", "compare", "counter"];
/** How many scenes a video may borrow from other fields' packs. */
export const BORROW_LIMIT = 3;

const uniq = <T,>(a: T[]) => [...new Set(a)];
export const PACKS: Pack[] = INDUSTRIES.map((ind) => {
  const d = FILES[ind.id] ?? FILES.other;
  return { ...d, id: ind.id, scenes: uniq([...d.signature, ...GENERAL]) };
});
export const packById = (id?: string | null) => PACKS.find((p) => p.id === id);

/** What the AI is told: this field's library first, borrowing allowed within the limit. */
export function packBrief(p: Pack, label: string) {
  return `مجال العميل: ${label} (حزمة الإصدار ${p.version}).
حزمة المجال أولاً: أغلب المشاهد (70% أو أكثر) من مشاهد الحزمة: ${p.scenes.join(", ")} — والمشاهد الخاصة بالمجال (${p.signature.join(", ")}) هي الأهم.
الاستعارة: إذا الكلام يحتاج مشهد مو موجود بالحزمة (مثلاً نادي يتكلم عن وجبة صحية ← dish، عيادة عندها عرض ← countdown)، تقدر تستعير لين ${BORROW_LIMIT} مشاهد من المكتبة الكاملة. المشهد المستعار يطلع بستايل هالمجال نفسه.
الستايل ثابت من الحزمة: الانتقالات ${p.transitions.join(", ")}، الألوان (grade) ${p.grades.join(", ")}، الترجمة ${p.captions.join(", ")}، العناوين ${p.titles.join(", ")}، الخلفيات (board) ${p.boards.join(", ")}، ستايلات الرسم (illus) ${p.illus.join(", ")}، الأشكال (layout) ${p.layouts.join(", ")}.
الموسيقى: ${p.music}. النبرة: ${p.tone}. أفكار: ${p.ideas.join("؛ ")}.
فيديوهات جاهزة (اختر الأنسب لطلب العميل أو امزج، ولا تكررها حرفياً لكل عميل): ${p.recipes.map((r) => `«${r.name}»: ${r.flow}`).join(" | ")}.`;
}

/** Keep the pack's identity: scenes from other fields beyond the borrow limit are dropped. */
export function enforcePack<G extends { kind: GraphicKind }>(graphics: G[], p?: Pack) {
  if (!p) return { graphics, borrowed: [] as GraphicKind[] };
  let n = 0;
  const borrowed: GraphicKind[] = [];
  const out = graphics.filter((g) => {
    if (p.scenes.includes(g.kind)) return true;
    if (n >= BORROW_LIMIT) return false;
    n++; borrowed.push(g.kind);
    return true;
  });
  return { graphics: out, borrowed };
}

/** Counts for the admin report, and what a pack still lacks. */
export function packReport(p: Pack) {
  const gaps: string[] = [];
  if (p.signature.length < 6) gaps.push(`مشاهد خاصة قليلة (${p.signature.length}) — الهدف 6 أو أكثر`);
  if (p.recipes.length < 3) gaps.push(`فيديوهات جاهزة قليلة (${p.recipes.length}) — الهدف 3 أو أكثر`);
  if (p.transitions.length < 4) gaps.push(`انتقالات قليلة (${p.transitions.length})`);
  if (p.illus.length < 3) gaps.push(`ستايلات رسم قليلة (${p.illus.length})`);
  if (p.boards.length < 3) gaps.push(`خلفيات قليلة (${p.boards.length})`);
  return { scenes: p.scenes.length, signature: p.signature.length, transitions: p.transitions.length, grades: p.grades.length, captions: p.captions.length, boards: p.boards.length, illus: p.illus.length, recipes: p.recipes.length, gaps };
}
