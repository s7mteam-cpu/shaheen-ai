import type { BoardStyle, CaptionStyle, Grade, GraphicKind, Layout, TitleStyle, Transition } from "../montage";
import type { IllusStyle } from "../styles";

export type Recipe = { name: string; flow: string };            // a ready video idea: the order of scenes
/** One field's pack, as written in its own file. */
export type Draft = {
  version: number; updated: string;
  signature: GraphicKind[];   // scenes made for this field (shown first, used most)
  transitions: Transition[]; grades: Grade[]; captions: CaptionStyle[]; titles: TitleStyle[];
  boards: BoardStyle[]; illus: IllusStyle[]; layouts: Layout[];
  music: string; tone: string; ideas: string[]; recipes: Recipe[];
};
export type Pack = Draft & { id: string; scenes: GraphicKind[] };
