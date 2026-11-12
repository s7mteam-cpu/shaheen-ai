// «gym» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "shake",
    "whip",
    "zoom",
    "glitch"
  ],
  "grades": [
    "reels",
    "pop",
    "cinematic"
  ],
  "captions": [
    "pop",
    "outline"
  ],
  "titles": [
    "kinetic",
    "pill"
  ],
  "layouts": [
    "dynamic",
    "full",
    "corner"
  ],
  "boards": [
    "night",
    "soft",
    "sunrise"
  ],
  "illus": [
    "neon",
    "cinematic",
    "clay"
  ],
  "music": "high energy workout trap beat",
  "tone": "طاقة وحماس",
  "ideas": [
    "العدّات counter",
    "مدة التمرين timer",
    "التحول beforeafter",
    "الاشتراك price",
    "ring لنسبة الإنجاز، ecg لنبض التمرين"
  ],
  "recipes": [
    {
      "name": "تمرين اليوم",
      "flow": "headline ← steps ← timer ← counter ← arrow"
    },
    {
      "name": "عرض اشتراك",
      "flow": "offer ← specs ← price ← countdown ← contact"
    },
    {
      "name": "قصة تحول",
      "flow": "beforeafter ← line ← testimonial ← contact"
    }
  ],
  "signature": [
    "counter",
    "timer",
    "steps",
    "line",
    "beforeafter",
    "price",
    "offer",
    "ring",
    "ecg",
    "map"
  ]
};
export default pack;
