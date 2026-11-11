// «electronics» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "glitch",
    "whip",
    "zoom",
    "slide"
  ],
  "grades": [
    "cool",
    "reels",
    "cinematic"
  ],
  "captions": [
    "highlight",
    "pop",
    "outline"
  ],
  "titles": [
    "kinetic",
    "pill",
    "lower"
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
    "glass3d",
    "neon",
    "cinematic"
  ],
  "music": "modern tech electronic beat",
  "tone": "تقني وعصري",
  "ideas": [
    "المواصفات specs",
    "مقارنة compare",
    "مكعب cube للمزايا",
    "shine{emoji 📱 أو 💻 أو 🎧}"
  ],
  "recipes": [
    {
      "name": "جهاز جديد",
      "flow": "text3d ← cube ← specs ← price ← arrow"
    },
    {
      "name": "مقارنة",
      "flow": "compare ← table ← price ← arrow"
    },
    {
      "name": "عرض اليوم",
      "flow": "offer ← price ← countdown ← delivery"
    }
  ],
  "signature": [
    "specs",
    "price",
    "offer",
    "compare",
    "cube",
    "countdown",
    "shine"
  ]
};
export default pack;
