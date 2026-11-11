/** Design packs — one file per field in this folder. The designer rotates palettes, layouts, decorations and stickers so no two customers get the same look. */
import type { DesignPack } from "./types";
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

export type { DesignPack } from "./types";
export const DESIGN_PACKS: Record<string, DesignPack> = { education, coach, teacher, kids, restaurant, cafe, sweets, tires, garage, carwash, contracting, realestate, interior, abaya, salon, perfume, jewelry, clinic, gym, nutrition, store, electronics, tech, cleaning, travel, law, events, photography, other };
export const designPack = (id?: string | null) => (id ? DESIGN_PACKS[id] : undefined);

/** Targets for the library report. */
export const DESIGN_TARGET = { palettes: 4, layouts: 5, decos: 3, frames: 2, stickers: 3, photo: 3, recipes: 3 };
export function designReport(p: DesignPack) {
  const t = DESIGN_TARGET, gaps: string[] = [];
  const c = { palettes: p.palettes.length, layouts: p.layouts.length, decos: p.decos.length, frames: p.frames.filter((f) => f !== "none").length, stickers: p.stickers.length, photo: p.photo.length, recipes: p.recipes.length, icons: p.icons.length, fonts: p.fonts.length };
  if (c.palettes < t.palettes) gaps.push(`ألوان ${c.palettes}/${t.palettes}`);
  if (c.layouts < t.layouts) gaps.push(`تخطيطات ${c.layouts}/${t.layouts}`);
  if (c.decos < t.decos) gaps.push(`زخارف ${c.decos}/${t.decos}`);
  if (c.frames < t.frames) gaps.push(`إطارات ${c.frames}/${t.frames}`);
  if (c.stickers < t.stickers) gaps.push(`ملصقات ${c.stickers}/${t.stickers}`);
  if (c.photo < t.photo) gaps.push(`ستايل صور ${c.photo}/${t.photo}`);
  if (c.recipes < t.recipes) gaps.push(`أفكار جاهزة ${c.recipes}/${t.recipes}`);
  return { ...c, gaps };
}

/** What the designer AI is told, with this job's picks so every customer looks different. */
export function designBrief(p: DesignPack, label: string, seed = Math.random()) {
  const r = (n: number, k: number) => Math.floor(((seed * 9301 + k * 49297) % 233280) / 233280 * n);
  const pal = p.palettes[r(p.palettes.length, 1)];
  const deco = p.decos[r(p.decos.length, 2)];
  const frame = p.frames[r(p.frames.length, 3)];
  const font = p.fonts[r(p.fonts.length, 4)];
  const lay = [...p.layouts].sort((a, b) => ((a.charCodeAt(0) * seed) % 1) - ((b.charCodeAt(0) * seed) % 1));
  return {
    pick: { colors: pal, deco, frame, font },
    text: `حزمة تصميم المجال: ${label} (الإصدار ${p.version}).
اختيارات هالمرة (عشان كل عميل يطلع له شكل مختلف): الألوان ${JSON.stringify(pal)} (إلا إذا للعميل ألوان هوية)، الزخرفة ${deco}، الإطار frame ${frame}، الخط ${font}.
التخطيطات المناسبة للمجال (ابدأ بالأولى إذا تناسب المحتوى): ${lay.join(", ")}.
ملصقات المجال (sticker {kind, text} — حط واحد على الشريحة إذا يفيد، والنص من معلومات العميل أو من هذي): ${p.stickers.map((s) => `${s.kind} «${s.text}»`).join("، ")}.
أيقونات المجال: ${p.icons.join(", ")}. ستايل الصور: ${p.photo.join(" | ")}.
أفكار جاهزة: ${p.recipes.map((x) => `«${x.name}»: ${x.brief}`).join(" | ")}.`,
  };
}
