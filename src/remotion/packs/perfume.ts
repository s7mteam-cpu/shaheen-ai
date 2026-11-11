// «perfume» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "dip",
    "blur",
    "slide",
    "zoom"
  ],
  "grades": [
    "luxury",
    "cinematic",
    "warm"
  ],
  "captions": [
    "minimal",
    "box"
  ],
  "titles": [
    "editorial",
    "typewriter",
    "lower"
  ],
  "layouts": [
    "full",
    "card"
  ],
  "boards": [
    "night",
    "paper",
    "sunrise"
  ],
  "illus": [
    "cinematic",
    "glow",
    "glass3d"
  ],
  "music": "luxurious oriental ambient with oud",
  "tone": "فاخر وشاعري",
  "ideas": [
    "المكونات specs (الأصل، التولة)",
    "كمية محدودة countdown",
    "mist زجاجة عطر ورذاذ، shine{emoji 💎}"
  ],
  "recipes": [
    {
      "name": "عطر جديد",
      "flow": "scene ← quote ← specs ← price ← countdown ← contact"
    },
    {
      "name": "كمية محدودة",
      "flow": "text3d ← countdown ← price ← contact"
    },
    {
      "name": "آراء",
      "flow": "rating ← testimonial ← contact"
    }
  ],
  "signature": [
    "price",
    "offer",
    "countdown",
    "quote",
    "specs",
    "rating",
    "mist",
    "shine"
  ]
};
export default pack;
