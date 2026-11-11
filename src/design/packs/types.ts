import type { DColors, Deco, Frame, IconId, LayoutId, Sticker } from "../spec";

/** One field's design pack (posts, carousels, ads), as written in its own file. */
export type DesignPack = {
  version: number; updated: string;
  palettes: DColors[];          // colour sets the designer rotates through (every customer gets a different one)
  layouts: LayoutId[];          // layouts that suit the field
  decos: Deco[];                // background decorations
  frames: Frame[];              // borders
  stickers: Sticker[];          // field touches: «جديد» ribbon, «أصلي 100%» stamp…
  fonts: string[];
  icons: IconId[];
  photo: string[];              // photo styles for AI images
  recipes: { name: string; brief: string }[]; // ready post ideas
};
