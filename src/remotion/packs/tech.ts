// «tech» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 1,
  updated: "2026-11-11",
  "transitions": [
    "glitch",
    "slide",
    "whip",
    "zoom"
  ],
  "grades": [
    "cool",
    "cinematic"
  ],
  "captions": [
    "highlight",
    "box"
  ],
  "titles": [
    "kinetic",
    "pill",
    "lower"
  ],
  "layouts": [
    "split",
    "dynamic",
    "full"
  ],
  "boards": [
    "night",
    "blueprint",
    "grid"
  ],
  "illus": [
    "glass3d",
    "neon",
    "corporate"
  ],
  "music": "minimal synth tech pulse",
  "tone": "ذكي وواضح",
  "ideas": [
    "سير العمل flow",
    "النمو line",
    "انتشار عالمي globe"
  ],
  "recipes": [
    {
      "name": "كيف يشتغل",
      "flow": "headline ← flow ← steps ← counter ← arrow"
    },
    {
      "name": "إطلاق تطبيق",
      "flow": "text3d ← cube ← specs ← globe ← arrow"
    },
    {
      "name": "قصة نمو",
      "flow": "line ← counter ← globe ← testimonial ← arrow"
    }
  ],
  "signature": [
    "flow",
    "steps",
    "mindmap",
    "line",
    "counter",
    "cube",
    "globe",
    "dotgrid"
  ]
};
export default pack;
