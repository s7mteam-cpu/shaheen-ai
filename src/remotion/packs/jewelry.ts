// «jewelry» pack. To release an update: add scenes / recipes / looks here and bump `version`.
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
    "soft",
    "paper"
  ],
  "illus": [
    "cinematic",
    "glow",
    "glass3d"
  ],
  "music": "luxury minimal piano",
  "tone": "فخامة هادئة",
  "ideas": [
    "العيار والوزن specs",
    "السعر price",
    "shine{emoji 💍 أو ⌚}، giftbox للهدايا"
  ],
  "recipes": [
    {
      "name": "قطعة جديدة",
      "flow": "scene ← specs ← price ← contact"
    },
    {
      "name": "عرض الذهب",
      "flow": "offer ← price ← countdown ← contact"
    },
    {
      "name": "هدية مناسبة",
      "flow": "scene ← specs ← price ← delivery"
    }
  ],
  "signature": [
    "price",
    "specs",
    "offer",
    "countdown",
    "rating",
    "testimonial",
    "shine",
    "giftbox"
  ]
};
export default pack;
