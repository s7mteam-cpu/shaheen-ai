// «interior» pack. To release an update: add scenes / recipes / looks here and bump `version`.
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
    "paper",
    "soft",
    "sketch"
  ],
  "illus": [
    "watercolor",
    "flat",
    "cinematic"
  ],
  "music": "calm elegant ambient",
  "tone": "راقي وهادي",
  "ideas": [
    "قبل وبعد beforeafter",
    "مراحل التصميم steps",
    "house، shine{emoji 🛋️}"
  ],
  "recipes": [
    {
      "name": "تحويل مجلس",
      "flow": "beforeafter ← steps ← testimonial ← appointment ← contact"
    },
    {
      "name": "باقات التصميم",
      "flow": "menu ← price ← appointment ← contact"
    },
    {
      "name": "نصيحة ديكور",
      "flow": "headline ← compare ← steps ← arrow"
    }
  ],
  "signature": [
    "beforeafter",
    "steps",
    "price",
    "appointment",
    "testimonial",
    "specs",
    "house",
    "shine",
    "map"
  ]
};
export default pack;
