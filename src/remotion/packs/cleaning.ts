// «cleaning» pack. To release an update: add scenes / recipes / looks here and bump `version`.
import type { Draft } from "./types";

const pack: Draft = {
  version: 2,
  updated: "2026-11-12",
  "transitions": [
    "slide",
    "whip",
    "dip",
    "zoom"
  ],
  "grades": [
    "natural",
    "vivid",
    "cinematic"
  ],
  "captions": [
    "box",
    "highlight",
    "karaoke"
  ],
  "titles": [
    "editorial",
    "kinetic",
    "lower"
  ],
  "layouts": [
    "full",
    "card",
    "dynamic"
  ],
  "boards": [
    "soft",
    "dots",
    "sunrise"
  ],
  "illus": [
    "flat",
    "clay",
    "corporate"
  ],
  "music": "fresh upbeat pop",
  "tone": "نظيف وموثوق وسريع",
  "ideas": [
    "قبل وبعد beforeafter",
    "اللي يشمله checklist",
    "الحجز appointment",
    "shine{emoji ✨ أو 🧽}"
  ],
  "recipes": [
    {
      "name": "تنظيف شامل",
      "flow": "beforeafter ← checklist ← price ← appointment ← contact"
    },
    {
      "name": "باقات التنظيف",
      "flow": "menu ← offer ← appointment ← contact"
    },
    {
      "name": "آراء العملاء",
      "flow": "rating ← testimonial ← contact"
    }
  ],
  "signature": [
    "beforeafter",
    "checklist",
    "price",
    "appointment",
    "menu",
    "rating",
    "shine",
    "route"
  ]
};
export default pack;
