// «coach» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "whip",
    "shake",
    "zoom",
    "slide"
  ],
  "grades": [
    "reels",
    "cinematic",
    "vivid"
  ],
  "captions": [
    "pop",
    "outline",
    "highlight"
  ],
  "titles": [
    "kinetic",
    "marker",
    "typewriter",
    "editorial"
  ],
  "layouts": [
    "split",
    "dynamic",
    "circle",
    "card"
  ],
  "boards": [
    "night",
    "soft",
    "sunrise"
  ],
  "illus": [
    "neon",
    "cinematic",
    "corporate"
  ],
  "music": "motivational cinematic build-up, deep drums",
  "tone": "قوي وتحفيزي بدون مبالغة",
  "ideas": [
    "الجملة الذهبية quote",
    "هرم الأولويات pyramid",
    "النمو line",
    "العادة الغلط مقابل الصح compare",
    "ring لنسبة التقدم"
  ],
  "recipes": [
    {
      "name": "نصيحة تحفيزية",
      "flow": "headline صادم ← compare ← steps ← quote ← arrow"
    },
    {
      "name": "إعلان ورشة",
      "flow": "headline ← checklist ← specs ← countdown ← appointment ← contact"
    },
    {
      "name": "قصة نجاح عميل",
      "flow": "scene ← line ← counter ← testimonial ← arrow"
    }
  ],
  "signature": [
    "quote",
    "steps",
    "pyramid",
    "compare",
    "counter",
    "line",
    "testimonial",
    "ring"
  ]
};
export default pack;
