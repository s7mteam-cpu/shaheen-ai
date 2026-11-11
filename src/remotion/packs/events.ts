// «events» pack. To release an update: add scenes / recipes / looks here and bump `version`.
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
    "sunrise",
    "paper",
    "night"
  ],
  "illus": [
    "watercolor",
    "glow",
    "cinematic"
  ],
  "music": "romantic elegant strings",
  "tone": "فرح وأناقة",
  "ideas": [
    "العد التنازلي للمناسبة countdown",
    "الباقات menu",
    "احتفال confetti",
    "giftbox للمفاجآت والمناسبات"
  ],
  "recipes": [
    {
      "name": "باقات المناسبات",
      "flow": "scene ← menu ← price ← appointment ← contact"
    },
    {
      "name": "دعوة",
      "flow": "text3d ← countdown ← contact ← confetti"
    },
    {
      "name": "آراء العملاء",
      "flow": "rating ← testimonial ← contact"
    }
  ],
  "signature": [
    "countdown",
    "menu",
    "price",
    "confetti",
    "testimonial",
    "appointment",
    "giftbox"
  ]
};
export default pack;
