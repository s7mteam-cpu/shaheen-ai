// «garage» pack. To release an update: add scenes / recipes / looks here and bump `version`.
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
    "blueprint",
    "night",
    "grid"
  ],
  "illus": [
    "blueprint",
    "glass3d",
    "cinematic"
  ],
  "music": "rock driving beat",
  "tone": "فني وموثوق",
  "ideas": [
    "الفحص checklist",
    "قبل وبعد beforeafter",
    "الحجز appointment",
    "shine{emoji 🚗} بعد الصيانة"
  ],
  "recipes": [
    {
      "name": "فحص قبل السفر",
      "flow": "headline ← checklist ← price ← appointment ← contact"
    },
    {
      "name": "قبل وبعد",
      "flow": "beforeafter ← testimonial ← contact"
    },
    {
      "name": "علامات الخطر",
      "flow": "headline ← truefalse ← checklist ← appointment ← contact"
    }
  ],
  "signature": [
    "checklist",
    "specs",
    "price",
    "appointment",
    "beforeafter",
    "timer",
    "shine",
    "map"
  ]
};
export default pack;
