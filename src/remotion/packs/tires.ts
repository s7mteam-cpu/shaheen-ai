// «tires» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "shake",
    "whip",
    "glitch",
    "zoom"
  ],
  "grades": [
    "reels",
    "cinematic",
    "cool"
  ],
  "captions": [
    "outline",
    "pop",
    "box"
  ],
  "titles": [
    "kinetic",
    "lower",
    "pill"
  ],
  "layouts": [
    "full",
    "dynamic",
    "corner"
  ],
  "boards": [
    "night",
    "blueprint",
    "grid"
  ],
  "illus": [
    "cinematic",
    "flat",
    "glass3d"
  ],
  "music": "energetic trap beat",
  "tone": "مباشر وسريع وموثوق",
  "ideas": [
    "خدمة متنقلة delivery",
    "السرعة timer",
    "المقاسات specs",
    "shine{emoji 🛞 أو 🚗}"
  ],
  "recipes": [
    {
      "name": "خدمة متنقلة",
      "flow": "headline ← timer ← delivery ← price ← contact"
    },
    {
      "name": "عرض تواير",
      "flow": "offer ← specs ← price ← countdown ← contact"
    },
    {
      "name": "اختيار التاير الصح",
      "flow": "compare ← specs ← checklist ← contact"
    }
  ],
  "signature": [
    "price",
    "offer",
    "specs",
    "delivery",
    "hours",
    "timer",
    "shine"
  ]
};
export default pack;
