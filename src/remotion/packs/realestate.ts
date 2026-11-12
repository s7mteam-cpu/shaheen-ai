// «realestate» pack. To release an update: add scenes / recipes / looks here and bump `version`.
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
    "glass3d",
    "terrain"
  ],
  "music": "elegant cinematic real estate music",
  "tone": "فخم وواثق",
  "ideas": [
    "المواصفات specs (غرف، مساحة، حمامات)",
    "السعر price",
    "الموقع contact مع pin",
    "المعاينة appointment",
    "house مع المفتاح لتسليم العقار"
  ],
  "recipes": [
    {
      "name": "عقار للبيع",
      "flow": "scene ← specs ← price ← appointment ← contact"
    },
    {
      "name": "مشروع سكني",
      "flow": "text3d ← specs ← timeline ← contact"
    },
    {
      "name": "لماذا هالموقع",
      "flow": "globe ← checklist ← specs ← contact"
    }
  ],
  "signature": [
    "specs",
    "price",
    "globe",
    "appointment",
    "contact",
    "counter",
    "house",
    "map"
  ]
};
export default pack;
