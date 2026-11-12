// «salon» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "blur",
    "slide",
    "dip",
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
    "pastel",
    "soft",
    "sunrise"
  ],
  "illus": [
    "watercolor",
    "flat",
    "clay"
  ],
  "music": "elegant soft pop, airy",
  "tone": "ناعم وأنثوي ومريح",
  "ideas": [
    "قبل وبعد beforeafter",
    "قائمة الخدمات menu",
    "حجز appointment",
    "shine{emoji 💅 أو 💄}، mist للعطر والعناية"
  ],
  "recipes": [
    {
      "name": "باكج العروس",
      "flow": "scene ← menu ← price ← appointment ← contact"
    },
    {
      "name": "قبل وبعد",
      "flow": "beforeafter ← rating ← appointment"
    },
    {
      "name": "عرض الأسبوع",
      "flow": "offer ← menu ← countdown ← appointment"
    }
  ],
  "signature": [
    "beforeafter",
    "menu",
    "price",
    "appointment",
    "rating",
    "offer",
    "shine",
    "mist",
    "map"
  ]
};
export default pack;
