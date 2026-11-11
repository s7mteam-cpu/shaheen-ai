// «contracting» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "slide",
    "whip",
    "dip",
    "zoom"
  ],
  "grades": [
    "cinematic",
    "natural"
  ],
  "captions": [
    "box",
    "highlight",
    "karaoke"
  ],
  "titles": [
    "editorial",
    "kinetic",
    "lower"
  ],
  "layouts": [
    "full",
    "card",
    "dynamic"
  ],
  "boards": [
    "blueprint",
    "grid",
    "night"
  ],
  "illus": [
    "blueprint",
    "cinematic",
    "flat"
  ],
  "music": "confident corporate build-up",
  "tone": "قوي ومهني، خبرة والتزام بالمواعيد",
  "ideas": [
    "مراحل التنفيذ timeline",
    "سنوات الخبرة counter",
    "قبل وبعد beforeafter",
    "house بيت ينرسم"
  ],
  "recipes": [
    {
      "name": "مشروع منجز",
      "flow": "scene ← timeline ← beforeafter ← testimonial ← contact"
    },
    {
      "name": "خدماتنا",
      "flow": "headline ← steps ← counter ← contact"
    },
    {
      "name": "أرقامنا",
      "flow": "counter ← counter ← testimonial ← contact"
    }
  ],
  "signature": [
    "timeline",
    "specs",
    "counter",
    "beforeafter",
    "steps",
    "testimonial",
    "house"
  ]
};
export default pack;
